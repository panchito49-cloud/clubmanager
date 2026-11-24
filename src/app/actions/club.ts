"use server";

import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db/client";
import { clubs } from "@/db/schema";
import { writeAudit } from "@/server/audit";
import { assertCan, getTenant } from "@/server/tenant";

export type ClubConfigFormState = { error?: string; ok?: string } | null;

const clubConfigSchema = z.object({
  name: z.string().trim().min(1, "El nombre del club es obligatorio").max(100),
  city: z.string().trim().max(100).optional(),
  province: z.string().trim().max(100).optional(),
  primaryColor: z.string().regex(/^#[0-9a-fA-F]{6}$/, "Color hexadecimal inválido"),
  address: z.string().trim().max(160).optional(),
  phone: z.string().trim().max(40).optional(),
  email: z.string().trim().email("Email inválido").optional().or(z.literal("")),
  cuit: z.string().trim().max(20).optional(),
  siblingDiscountPct: z.coerce.number().min(0).max(100).default(0),
  graceDays: z.coerce.number().min(0).max(60).default(5),
  billingDay: z.coerce.number().min(1).max(28).default(10),
  remindersEnabled: z.boolean().default(false),
});

export async function updateClubConfigAction(
  _prev: ClubConfigFormState,
  formData: FormData,
): Promise<ClubConfigFormState> {
  const ctx = await getTenant();
  assertCan(ctx, "club.manage");

  const parsed = clubConfigSchema.safeParse({
    name: formData.get("name"),
    city: formData.get("city") || undefined,
    province: formData.get("province") || undefined,
    primaryColor: formData.get("primaryColor") || "#0f766e",
    address: formData.get("address") || undefined,
    phone: formData.get("phone") || undefined,
    email: formData.get("email") || undefined,
    cuit: formData.get("cuit") || undefined,
    siblingDiscountPct: formData.get("siblingDiscountPct") || 0,
    graceDays: formData.get("graceDays") || 5,
    billingDay: formData.get("billingDay") || 10,
    remindersEnabled: formData.get("remindersEnabled") === "on",
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Revisá los datos ingresados." };
  }

  try {
    const updatedSettings = {
      ...(ctx.club.settings || {}),
      address: parsed.data.address,
      phone: parsed.data.phone,
      email: parsed.data.email,
      cuit: parsed.data.cuit,
      siblingDiscountPct: parsed.data.siblingDiscountPct,
      graceDays: parsed.data.graceDays,
      billingDay: parsed.data.billingDay,
      remindersEnabled: parsed.data.remindersEnabled,
    };

    await db
      .update(clubs)
      .set({
        name: parsed.data.name,
        city: parsed.data.city ?? null,
        province: parsed.data.province ?? null,
        primaryColor: parsed.data.primaryColor,
        settings: updatedSettings,
      })
      .where(eq(clubs.id, ctx.club.id));

    await writeAudit({
      clubId: ctx.club.id,
      actorUserId: ctx.auth.user.id,
      actorEmail: ctx.auth.user.email,
      action: "club.config_updated",
      entity: "club",
      entityId: ctx.club.id,
      meta: {
        name: parsed.data.name,
        city: parsed.data.city,
      },
    });

    redirect(`/app/configuracion?ok=${encodeURIComponent("Configuración del club guardada exitosamente.")}`);
  } catch (error) {
    if (error instanceof Error && error.message.startsWith("NEXT_REDIRECT")) throw error;
    console.error("[club.updateConfig]", error);
    return { error: "No se pudo guardar la configuración del club." };
  }
}
