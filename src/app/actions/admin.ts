"use server";

import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db/client";
import {
  categories,
  clubs,
  memberships,
  plans,
  subscriptions,
  users,
} from "@/db/schema";
import { hashPassword, randomPassword } from "@/lib/password";
import { parseMoneyToCents } from "@/lib/format";
import { writeAudit } from "@/server/audit";
import { requirePlatformAdmin } from "@/server/tenant";

export type AdminFormState = { error?: string; ok?: string } | null;

const createClubSchema = z.object({
  name: z.string().trim().min(1, "El nombre del club es obligatorio").max(100),
  slug: z
    .string()
    .trim()
    .toLowerCase()
    .min(3, "El slug debe tener al menos 3 caracteres")
    .max(50)
    .regex(/^[a-z0-9-]+$/, "El slug solo puede contener letras minúsculas, números y guiones"),
  city: z.string().trim().max(100).optional(),
  province: z.string().trim().max(100).optional(),
  planId: z.string().uuid("Seleccioná un plan válido"),
  adminEmail: z.string().trim().toLowerCase().email("Email de administrador inválido"),
  adminFullName: z.string().trim().min(1, "El nombre del administrador es obligatorio").max(120),
  adminPhone: z.string().trim().max(40).optional(),
});

const DEFAULT_BASKETBALL_CATEGORIES = [
  { name: "Escuelita", minAge: 4, maxAge: 8 },
  { name: "Pre Mini", minAge: 9, maxAge: 10 },
  { name: "U11", minAge: 10, maxAge: 11 },
  { name: "U13", minAge: 12, maxAge: 13 },
  { name: "U15", minAge: 14, maxAge: 15 },
  { name: "U17", minAge: 16, maxAge: 17 },
  { name: "U21", minAge: 18, maxAge: 21 },
  { name: "Primera", minAge: 18, maxAge: 50 },
];

export async function createClubAction(
  _prev: AdminFormState,
  formData: FormData,
): Promise<AdminFormState> {
  const auth = await requirePlatformAdmin();

  const parsed = createClubSchema.safeParse({
    name: formData.get("name"),
    slug: formData.get("slug"),
    city: formData.get("city") || undefined,
    province: formData.get("province") || undefined,
    planId: formData.get("planId"),
    adminEmail: formData.get("adminEmail"),
    adminFullName: formData.get("adminFullName"),
    adminPhone: formData.get("adminPhone") || undefined,
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Revisá los datos ingresados." };
  }

  try {
    // 1. Validar slug único
    const [existingSlug] = await db
      .select({ id: clubs.id })
      .from(clubs)
      .where(eq(clubs.slug, parsed.data.slug))
      .limit(1);

    if (existingSlug) {
      return { error: `El slug "${parsed.data.slug}" ya está en uso. Elegí otro.` };
    }

    // 2. Obtener plan para precio y características
    const [plan] = await db
      .select()
      .from(plans)
      .where(eq(plans.id, parsed.data.planId))
      .limit(1);

    if (!plan) return { error: "El plan seleccionado no existe." };

    // 3. Crear Club
    const [club] = await db
      .insert(clubs)
      .values({
        name: parsed.data.name,
        slug: parsed.data.slug,
        city: parsed.data.city ?? null,
        province: parsed.data.province ?? null,
        discipline: "basquet",
        status: "active",
        planId: plan.id,
      })
      .returning({ id: clubs.id });

    // 4. Crear suscripción
    await db.insert(subscriptions).values({
      clubId: club.id,
      planId: plan.id,
      status: "active",
      amountCents: plan.priceCents,
      provider: "manual",
      periodStart: new Date(),
    });

    // 5. Crear las 16 categorías de básquet (8 masculinas + 8 femeninas)
    const categoryValues = [];
    for (const cat of DEFAULT_BASKETBALL_CATEGORIES) {
      // Masculino
      categoryValues.push({
        clubId: club.id,
        name: cat.name,
        gender: "male" as const,
        minAge: cat.minAge,
        maxAge: cat.maxAge,
      });
      // Femenino
      categoryValues.push({
        clubId: club.id,
        name: cat.name,
        gender: "female" as const,
        minAge: cat.minAge,
        maxAge: cat.maxAge,
      });
    }
    await db.insert(categories).values(categoryValues);

    // 6. Asignar o crear el usuario administrador inicial
    const [existingAdminUser] = await db
      .select()
      .from(users)
      .where(eq(users.email, parsed.data.adminEmail))
      .limit(1);

    let adminUserId: string;

    if (existingAdminUser) {
      adminUserId = existingAdminUser.id;
    } else {
      const tempPass = randomPassword(10);
      const passHash = await hashPassword(tempPass);

      const [newAdmin] = await db
        .insert(users)
        .values({
          email: parsed.data.adminEmail,
          fullName: parsed.data.adminFullName,
          phone: parsed.data.adminPhone ?? null,
          passwordHash: passHash,
          mustChangePassword: true,
          status: "active",
        })
        .returning({ id: users.id });

      adminUserId = newAdmin.id;
    }

    await db.insert(memberships).values({
      clubId: club.id,
      userId: adminUserId,
      role: "club_admin",
      status: "active",
    });

    await writeAudit({
      clubId: club.id,
      actorUserId: auth.user.id,
      actorEmail: auth.user.email,
      action: "platform.club_created",
      entity: "club",
      entityId: club.id,
      meta: {
        slug: parsed.data.slug,
        name: parsed.data.name,
        planCode: plan.code,
      },
    });

    redirect(`/admin/clubes?ok=${encodeURIComponent(`Club "${parsed.data.name}" creado con éxito con sus 16 categorías de básquet inicializadas.`)}`);
  } catch (error) {
    if (error instanceof Error && error.message.startsWith("NEXT_REDIRECT")) throw error;
    console.error("[admin.createClub]", error);
    return { error: "No se pudo crear el club." };
  }
}

export async function updateClubStatusAction(formData: FormData): Promise<void> {
  const auth = await requirePlatformAdmin();

  const clubId = String(formData.get("clubId") ?? "");
  const targetStatus = String(formData.get("targetStatus") ?? "") as "active" | "suspended" | "trial" | "cancelled";

  if (!["active", "suspended", "trial", "cancelled"].includes(targetStatus)) {
    throw new Error("Estado inválido");
  }

  await db
    .update(clubs)
    .set({ status: targetStatus })
    .where(eq(clubs.id, clubId));

  // Actualizar también la suscripción
  await db
    .update(subscriptions)
    .set({ status: targetStatus === "active" ? "active" : targetStatus === "suspended" ? "suspended" : "trialing" })
    .where(eq(subscriptions.clubId, clubId));

  await writeAudit({
    clubId,
    actorUserId: auth.user.id,
    actorEmail: auth.user.email,
    action: "platform.club_status_changed",
    entity: "club",
    entityId: clubId,
    meta: { targetStatus },
  });

  redirect(`/admin/clubes?ok=${encodeURIComponent(`Estado del club actualizado a "${targetStatus}".`)}`);
}

export async function updatePlanAction(formData: FormData): Promise<void> {
  const auth = await requirePlatformAdmin();

  const planId = String(formData.get("planId") ?? "");
  const priceRaw = formData.get("price");
  const maxPlayersRaw = formData.get("maxPlayers");
  const maxAdminsRaw = formData.get("maxAdmins");

  const priceCents = parseMoneyToCents(priceRaw);
  const maxPlayers = maxPlayersRaw ? Number(maxPlayersRaw) : null;
  const maxAdmins = maxAdminsRaw ? Number(maxAdminsRaw) : null;

  await db
    .update(plans)
    .set({
      priceCents,
      maxPlayers: Number.isFinite(maxPlayers) ? maxPlayers : null,
      maxAdmins: Number.isFinite(maxAdmins) ? maxAdmins : null,
    })
    .where(eq(plans.id, planId));

  await writeAudit({
    actorUserId: auth.user.id,
    actorEmail: auth.user.email,
    action: "platform.plan_updated",
    entity: "plan",
    entityId: planId,
    meta: { priceCents, maxPlayers, maxAdmins },
  });

  redirect(`/admin/planes?ok=${encodeURIComponent("Plan actualizado correctamente.")}`);
}
