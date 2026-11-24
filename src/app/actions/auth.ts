"use server";

import { createHash } from "node:crypto";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { and, eq, gt, isNull, ne } from "drizzle-orm";
import { db } from "@/db/client";
import { memberships, passwordResetTokens, sessions, users } from "@/db/schema";
import { generateToken, hashPassword, verifyPassword } from "@/lib/password";
import { createSession, destroySession, getAuth, setSessionClub } from "@/server/auth";
import { checkRateLimit, resetRateLimit } from "@/server/rate-limit";
import { writeAudit } from "@/server/audit";
import { z } from "zod";

export type AuthFormState = { error?: string; ok?: string } | null;

const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email("Ingresá un email válido"),
  password: z.string().min(1, "Ingresá tu contraseña"),
});

const MAX_ATTEMPTS = 6;
const LOCK_MINUTES = 15;

export async function loginAction(
  _prev: AuthFormState,
  formData: FormData,
): Promise<AuthFormState> {
  const parsed = loginSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Datos inválidos" };
  }

  const { email, password } = parsed.data;
  const limit = checkRateLimit(`login:${email}`, 10, 60_000);
  if (!limit.ok) {
    return { error: "Demasiados intentos. Esperá un minuto y volvé a intentar." };
  }

  const [user] = await db.select().from(users).where(eq(users.email, email)).limit(1);

  // Mensaje generico para no revelar si el email existe.
  const invalid: AuthFormState = { error: "Email o contraseña incorrectos." };

  if (!user || user.status !== "active") return invalid;

  if (user.lockedUntil && user.lockedUntil > new Date()) {
    return {
      error: `La cuenta está bloqueada temporalmente. Intentá nuevamente en unos minutos.`,
    };
  }

  const valid = await verifyPassword(password, user.passwordHash);

  if (!valid) {
    const attempts = user.failedLoginCount + 1;
    await db
      .update(users)
      .set({
        failedLoginCount: attempts,
        lockedUntil:
          attempts >= MAX_ATTEMPTS
            ? new Date(Date.now() + LOCK_MINUTES * 60_000)
            : null,
      })
      .where(eq(users.id, user.id));

    if (attempts >= MAX_ATTEMPTS) {
      return {
        error: `Demasiados intentos fallidos. La cuenta se bloqueó por ${LOCK_MINUTES} minutos.`,
      };
    }
    return invalid;
  }

  await db
    .update(users)
    .set({ failedLoginCount: 0, lockedUntil: null, lastLoginAt: new Date() })
    .where(eq(users.id, user.id));

  resetRateLimit(`login:${email}`);

  const activeMemberships = await db
    .select({ clubId: memberships.clubId })
    .from(memberships)
    .where(and(eq(memberships.userId, user.id), eq(memberships.status, "active")));

  const clubId = activeMemberships[0]?.clubId ?? null;

  const headerList = await headers();
  await createSession({
    userId: user.id,
    clubId,
    ip: headerList.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null,
    userAgent: headerList.get("user-agent"),
  });

  await writeAudit({
    clubId,
    actorUserId: user.id,
    actorEmail: user.email,
    action: "auth.login",
    entity: "user",
    entityId: user.id,
  });

  if (activeMemberships.length > 1) redirect("/seleccionar-club");
  if (!clubId) redirect(user.isPlatformAdmin ? "/admin" : "/sin-club");
  redirect("/app");
}

export async function logoutAction(): Promise<void> {
  const auth = await getAuth();
  await destroySession();
  if (auth) {
    await writeAudit({
      clubId: auth.clubId,
      actorUserId: auth.user.id,
      actorEmail: auth.user.email,
      action: "auth.logout",
    });
  }
  redirect("/login");
}

export async function switchClubAction(formData: FormData): Promise<void> {
  const clubId = String(formData.get("clubId") ?? "");
  const auth = await getAuth();
  if (!auth) redirect("/login");

  const allowed = auth.memberships.find((m) => m.clubId === clubId);
  if (!allowed) redirect("/seleccionar-club");

  await setSessionClub(clubId);
  redirect("/app");
}

const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, "Ingresá tu contraseña actual"),
    newPassword: z
      .string()
      .min(10, "La nueva contraseña debe tener al menos 10 caracteres")
      .max(200),
    confirmPassword: z.string(),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: "Las contraseñas no coinciden",
    path: ["confirmPassword"],
  });

export async function changePasswordAction(
  _prev: AuthFormState,
  formData: FormData,
): Promise<AuthFormState> {
  const auth = await getAuth();
  if (!auth) redirect("/login");

  const parsed = changePasswordSchema.safeParse({
    currentPassword: formData.get("currentPassword"),
    newPassword: formData.get("newPassword"),
    confirmPassword: formData.get("confirmPassword"),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Datos inválidos" };
  }

  const [user] = await db.select().from(users).where(eq(users.id, auth.user.id)).limit(1);
  if (!user) return { error: "Usuario inexistente" };

  const valid = await verifyPassword(parsed.data.currentPassword, user.passwordHash);
  if (!valid) return { error: "La contraseña actual no es correcta." };

  await db
    .update(users)
    .set({
      passwordHash: await hashPassword(parsed.data.newPassword),
      mustChangePassword: false,
    })
    .where(eq(users.id, user.id));

  // Se cierran las demas sesiones por seguridad (la actual se mantiene).
  await db
    .update(sessions)
    .set({ revokedAt: new Date() })
    .where(
      and(
        eq(sessions.userId, user.id),
        isNull(sessions.revokedAt),
        ne(sessions.id, auth.sessionId),
      ),
    );

  await writeAudit({
    clubId: auth.clubId,
    actorUserId: user.id,
    actorEmail: user.email,
    action: "auth.password_changed",
  });

  return {
    ok: "Contraseña actualizada. Por seguridad, volvé a iniciar sesión.",
  };
}

function hashCode(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

/**
 * Genera un enlace de restablecimiento de un solo uso.
 * No se envia por email (no hay proveedor configurado): lo comparte el
 * administrador del club por un canal seguro.
 */
export async function createResetLink(userId: string): Promise<string | null> {
  const [user] = await db
    .select({ id: users.id, email: users.email })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);
  if (!user) return null;

  const token = generateToken();
  await db.insert(passwordResetTokens).values({
    userId: user.id,
    tokenHash: hashCode(token),
    expiresAt: new Date(Date.now() + 60 * 60 * 1000),
  });

  const base = process.env.APP_URL?.replace(/\/$/, "") ?? "";
  return `${base}/restablecer/${token}`;
}

const resetSchema = z
  .object({
    password: z.string().min(10, "La contraseña debe tener al menos 10 caracteres"),
    confirm: z.string(),
  })
  .refine((d) => d.password === d.confirm, {
    message: "Las contraseñas no coinciden",
    path: ["confirm"],
  });

export async function resetPasswordAction(
  token: string,
  _prev: AuthFormState,
  formData: FormData,
): Promise<AuthFormState> {
  const parsed = resetSchema.safeParse({
    password: formData.get("password"),
    confirm: formData.get("confirm"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Datos inválidos" };
  }

  const [row] = await db
    .select()
    .from(passwordResetTokens)
    .where(
      and(
        eq(passwordResetTokens.tokenHash, hashCode(token)),
        gt(passwordResetTokens.expiresAt, new Date()),
        isNull(passwordResetTokens.usedAt),
      ),
    )
    .limit(1);

  if (!row) {
    return { error: "El enlace no es válido o ya expiró. Pedí uno nuevo." };
  }

  await db
    .update(users)
    .set({ passwordHash: await hashPassword(parsed.data.password), mustChangePassword: false })
    .where(eq(users.id, row.userId));

  await db
    .update(passwordResetTokens)
    .set({ usedAt: new Date() })
    .where(eq(passwordResetTokens.id, row.id));

  await db
    .update(sessions)
    .set({ revokedAt: new Date() })
    .where(and(eq(sessions.userId, row.userId), isNull(sessions.revokedAt)));

  await writeAudit({
    actorUserId: row.userId,
    action: "auth.password_reset",
  });

  return { ok: "Contraseña actualizada. Ya podés iniciar sesión." };
}
