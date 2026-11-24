"use server";

import { redirect } from "next/navigation";
import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db/client";
import { coachCategories, memberships, users } from "@/db/schema";
import { hashPassword, randomPassword } from "@/lib/password";
import { writeAudit } from "@/server/audit";
import { assertCan, getTenant } from "@/server/tenant";

export type UsersFormState = { error?: string; ok?: string } | null;

const createStaffSchema = z.object({
  fullName: z.string().trim().min(1, "El nombre completo es obligatorio").max(120),
  email: z.string().trim().toLowerCase().email("Email inválido"),
  phone: z.string().trim().max(40).optional(),
  role: z.enum(["club_admin", "coach"]),
  initialPassword: z.string().min(8, "La contraseña temporal debe tener al menos 8 caracteres").optional(),
});

export async function createStaffUserAction(
  _prev: UsersFormState,
  formData: FormData,
): Promise<UsersFormState> {
  const ctx = await getTenant();
  assertCan(ctx, "users.manage");

  const parsed = createStaffSchema.safeParse({
    fullName: formData.get("fullName"),
    email: formData.get("email"),
    phone: formData.get("phone") || undefined,
    role: formData.get("role"),
    initialPassword: formData.get("initialPassword") || undefined,
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Revisá los datos ingresados." };
  }

  const selectedCategoryIds = formData.getAll("categoryIds").map(String);

  try {
    // 1. Verificar si el usuario ya existe por email
    const [existingUser] = await db
      .select()
      .from(users)
      .where(eq(users.email, parsed.data.email))
      .limit(1);

    let userId: string;

    if (existingUser) {
      userId = existingUser.id;

      // Verificar si ya tiene membresía en este club
      const [existingMembership] = await db
        .select()
        .from(memberships)
        .where(
          and(
            eq(memberships.clubId, ctx.club.id),
            eq(memberships.userId, userId),
          ),
        )
        .limit(1);

      if (existingMembership) {
        return { error: "Este usuario ya pertenece al club con otro rol o estado." };
      }
    } else {
      // Crear nuevo usuario
      const password = parsed.data.initialPassword || randomPassword(10);
      const passwordHash = await hashPassword(password);

      const [newUser] = await db
        .insert(users)
        .values({
          email: parsed.data.email,
          fullName: parsed.data.fullName,
          phone: parsed.data.phone ?? null,
          passwordHash,
          mustChangePassword: true,
          status: "active",
        })
        .returning({ id: users.id });

      userId = newUser.id;
    }

    // 2. Crear membresía en el club
    const [membership] = await db
      .insert(memberships)
      .values({
        clubId: ctx.club.id,
        userId,
        role: parsed.data.role,
        status: "active",
      })
      .returning({ id: memberships.id });

    // 3. Si es entrenador y se seleccionaron categorías, vincularlas
    if (parsed.data.role === "coach" && selectedCategoryIds.length > 0) {
      const coachCatValues = selectedCategoryIds.map((categoryId) => ({
        clubId: ctx.club.id,
        membershipId: membership.id,
        categoryId,
      }));
      await db.insert(coachCategories).values(coachCatValues);
    }

    await writeAudit({
      clubId: ctx.club.id,
      actorUserId: ctx.auth.user.id,
      actorEmail: ctx.auth.user.email,
      action: "user.staff_created",
      entity: "membership",
      entityId: membership.id,
      meta: {
        userId,
        email: parsed.data.email,
        role: parsed.data.role,
        categories: selectedCategoryIds,
      },
    });

    redirect(`/app/usuarios?ok=${encodeURIComponent(`Usuario ${parsed.data.fullName} dado de alta con rol ${parsed.data.role === "club_admin" ? "Administrador" : "Entrenador"}.`)}`);
  } catch (error) {
    if (error instanceof Error && error.message.startsWith("NEXT_REDIRECT")) throw error;
    console.error("[users.createStaffUser]", error);
    return { error: "No se pudo crear el usuario staff." };
  }
}

export async function toggleMembershipStatusAction(formData: FormData): Promise<void> {
  const ctx = await getTenant();
  assertCan(ctx, "users.manage");

  const membershipId = String(formData.get("membershipId") ?? "");
  const targetStatus = String(formData.get("targetStatus") ?? "") as "active" | "disabled";

  if (!["active", "disabled"].includes(targetStatus)) {
    throw new Error("Estado inválido");
  }

  // Prevenir que un admin se deshabilite a sí mismo
  if (membershipId === ctx.membership.id) {
    redirect(`/app/usuarios?error=${encodeURIComponent("No podés desactivar tu propia membresía de administrador.")}`);
  }

  await db
    .update(memberships)
    .set({ status: targetStatus })
    .where(
      and(
        eq(memberships.id, membershipId),
        eq(memberships.clubId, ctx.club.id),
      ),
    );

  await writeAudit({
    clubId: ctx.club.id,
    actorUserId: ctx.auth.user.id,
    actorEmail: ctx.auth.user.email,
    action: "membership.status_changed",
    entity: "membership",
    entityId: membershipId,
    meta: { targetStatus },
  });

  redirect(`/app/usuarios?ok=${encodeURIComponent(`Estado de la membresía actualizado a ${targetStatus === "active" ? "Activo" : "Deshabilitado"}.`)}`);
}
