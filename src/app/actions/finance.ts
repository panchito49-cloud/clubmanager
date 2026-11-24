"use server";

import { and, asc, eq, gte, inArray, isNull, lte, or, sql } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db/client";
import {
  charges,
  families,
  feePlans,
  memberships,
  notifications,
  paymentApplications,
  payments,
  playerDiscounts,
  players,
} from "@/db/schema";
import {
  allocateOldestFirst,
  chargeStatusFor,
  computeChargeAmounts,
} from "@/lib/billing";
import { currentPeriod, parseMoneyToCents, todayISO } from "@/lib/format";
import { writeAudit } from "@/server/audit";
import { assertCan, getTenant, PermissionError } from "@/server/tenant";

export type FinanceFormState = { error?: string; ok?: string } | null;

function dueDateForPeriod(period: string, dueDay: number): string {
  const [year, month] = period.split("-").map(Number);
  if (!year || !month) throw new Error("Período inválido");
  const lastDay = new Date(Date.UTC(year, month, 0)).getUTCDate();
  const day = Math.min(Math.max(1, dueDay), lastDay);
  return `${period}-${String(day).padStart(2, "0")}`;
}

// Generacion de cuotas --------------------------------------------------------

export async function generateChargesAction(
  _prev: FinanceFormState,
  formData: FormData,
): Promise<FinanceFormState> {
  const ctx = await getTenant();
  assertCan(ctx, "fees.manage");

  const period = String(formData.get("period") ?? "").trim();
  if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(period)) {
    return { error: "Indicá un período válido (mes y año)." };
  }

  const today = todayISO();
  const siblingPct = Number(ctx.club.settings?.siblingDiscountPct ?? 0);

  const plans = await db
    .select()
    .from(feePlans)
    .where(and(eq(feePlans.clubId, ctx.club.id), eq(feePlans.isActive, true)));

  if (plans.length === 0) {
    return { error: "No hay planes de cuota activos. Creá uno antes de liquidar." };
  }

  const playerRows = await db
    .select({
      id: players.id,
      familyId: players.familyId,
      categoryId: players.categoryId,
      birthDate: players.birthDate,
    })
    .from(players)
    .where(and(eq(players.clubId, ctx.club.id), eq(players.status, "active")));

  if (playerRows.length === 0) {
    return { error: "No hay jugadores activos para liquidar." };
  }

  const discounts = await db
    .select({
      playerId: playerDiscounts.playerId,
      type: playerDiscounts.type,
      value: playerDiscounts.value,
    })
    .from(playerDiscounts)
    .where(
      and(
        eq(playerDiscounts.clubId, ctx.club.id),
        eq(playerDiscounts.isActive, true),
        lte(playerDiscounts.startsOn, today),
        or(isNull(playerDiscounts.endsOn), gte(playerDiscounts.endsOn, today)),
      ),
    );

  const discountByPlayer = new Map<string, { type: "percentage" | "fixed"; value: number }>();
  for (const discount of discounts) {
    if (!discountByPlayer.has(discount.playerId)) {
      discountByPlayer.set(discount.playerId, {
        type: discount.type,
        value: discount.value,
      });
    }
  }

  // Posicion entre hermanos: el mayor paga cuota completa.
  const byFamily = new Map<string, typeof playerRows>();
  for (const player of playerRows) {
    if (!player.familyId) continue;
    const list = byFamily.get(player.familyId) ?? [];
    list.push(player);
    byFamily.set(player.familyId, list);
  }
  const siblingIndex = new Map<string, number>();
  for (const list of byFamily.values()) {
    const ordered = [...list].sort((a, b) => {
      if (!a.birthDate && !b.birthDate) return 0;
      if (!a.birthDate) return 1;
      if (!b.birthDate) return -1;
      return a.birthDate < b.birthDate ? -1 : a.birthDate > b.birthDate ? 1 : 0;
    });
    ordered.forEach((player, index) => siblingIndex.set(player.id, index));
  }

  const values: Array<typeof charges.$inferInsert> = [];
  let withoutPlan = 0;

  for (const player of playerRows) {
    const plan =
      plans.find((p) => p.categoryId && p.categoryId === player.categoryId) ??
      plans.find((p) => !p.categoryId);

    if (!plan) {
      withoutPlan += 1;
      continue;
    }

    const amounts = computeChargeAmounts({
      amountCents: plan.amountCents,
      discount: discountByPlayer.get(player.id) ?? null,
      siblingIndex: siblingIndex.get(player.id) ?? 0,
      siblingDiscountPct: siblingPct,
    });

    values.push({
      clubId: ctx.club.id,
      playerId: player.id,
      familyId: player.familyId,
      feePlanId: plan.id,
      concept: plan.concept,
      period,
      dueDate: dueDateForPeriod(period, plan.dueDay),
      amountCents: amounts.amountCents,
      discountCents: amounts.discountCents,
      totalCents: amounts.totalCents,
      status: "pending",
      createdByUserId: ctx.auth.user.id,
    });
  }

  if (values.length === 0) {
    return {
      error:
        "Ningún jugador activo tiene un plan de cuota aplicable. Asigná un plan general o por categoría.",
    };
  }

  const inserted = await db
    .insert(charges)
    .values(values)
    .onConflictDoNothing()
    .returning({ id: charges.id });

  await writeAudit({
    clubId: ctx.club.id,
    actorUserId: ctx.auth.user.id,
    actorEmail: ctx.auth.user.email,
    action: "charges.generated",
    entity: "charge",
    meta: {
      period,
      candidates: values.length,
      created: inserted.length,
      skipped: values.length - inserted.length,
    },
  });

  const skipped = values.length - inserted.length;
  return {
    ok: `Liquidación de ${period}: ${inserted.length} cuota(s) generadas${
      skipped > 0 ? `, ${skipped} ya existían` : ""
    }${withoutPlan > 0 ? `, ${withoutPlan} jugador(es) sin plan aplicable` : ""}.`,
  };
}

// Planes de cuota -------------------------------------------------------------

const feePlanSchema = z.object({
  name: z.string().trim().min(1, "El nombre es obligatorio").max(80),
  concept: z.string().trim().min(1, "El concepto es obligatorio").max(80),
  categoryId: z.string().uuid().optional().or(z.literal("")),
  dueDay: z.coerce.number().int().min(1, "El día de vencimiento debe ser 1-31").max(31),
});

export async function createFeePlanAction(
  _prev: FinanceFormState,
  formData: FormData,
): Promise<FinanceFormState> {
  const ctx = await getTenant();
  assertCan(ctx, "fees.manage");

  const parsed = feePlanSchema.safeParse({
    name: formData.get("name"),
    concept: formData.get("concept"),
    categoryId: formData.get("categoryId") ?? "",
    dueDay: formData.get("dueDay") ?? 10,
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Revisá los datos del plan." };
  }

  let amountCents = 0;
  try {
    amountCents = parseMoneyToCents(formData.get("amount"));
  } catch {
    return { error: "El importe no es válido." };
  }
  if (amountCents <= 0) return { error: "El importe debe ser mayor a cero." };

  try {
    await db.insert(feePlans).values({
      clubId: ctx.club.id,
      name: parsed.data.name,
      concept: parsed.data.concept,
      categoryId: parsed.data.categoryId || null,
      amountCents,
      dueDay: parsed.data.dueDay,
    });

    await writeAudit({
      clubId: ctx.club.id,
      actorUserId: ctx.auth.user.id,
      actorEmail: ctx.auth.user.email,
      action: "fee_plan.created",
      meta: { name: parsed.data.name, amountCents },
    });

    return { ok: `Plan "${parsed.data.name}" creado.` };
  } catch (error) {
    console.error("[feePlans.create]", error);
    return { error: "No se pudo crear el plan de cuota." };
  }
}

export async function updateFeePlanAction(
  planId: string,
  _prev: FinanceFormState,
  formData: FormData,
): Promise<FinanceFormState> {
  const ctx = await getTenant();
  assertCan(ctx, "fees.manage");

  const parsed = feePlanSchema.safeParse({
    name: formData.get("name"),
    concept: formData.get("concept"),
    categoryId: formData.get("categoryId") ?? "",
    dueDay: formData.get("dueDay") ?? 10,
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Revisá los datos del plan." };
  }

  let amountCents = 0;
  try {
    amountCents = parseMoneyToCents(formData.get("amount"));
  } catch {
    return { error: "El importe no es válido." };
  }
  if (amountCents <= 0) return { error: "El importe debe ser mayor a cero." };

  const [existing] = await db
    .select({ id: feePlans.id })
    .from(feePlans)
    .where(and(eq(feePlans.id, planId), eq(feePlans.clubId, ctx.club.id)))
    .limit(1);
  if (!existing) return { error: "El plan no pertenece al club." };

  await db
    .update(feePlans)
    .set({
      name: parsed.data.name,
      concept: parsed.data.concept,
      categoryId: parsed.data.categoryId || null,
      amountCents,
      dueDay: parsed.data.dueDay,
      isActive: formData.get("isActive") === "on",
      updatedAt: new Date(),
    })
    .where(and(eq(feePlans.id, planId), eq(feePlans.clubId, ctx.club.id)));

  await writeAudit({
    clubId: ctx.club.id,
    actorUserId: ctx.auth.user.id,
    actorEmail: ctx.auth.user.email,
    action: "fee_plan.updated",
    entity: "fee_plan",
    entityId: planId,
  });

  return { ok: "Plan actualizado." };
}

// Declaracion de pagos --------------------------------------------------------

const declareSchema = z.object({
  familyId: z.string().uuid("Elegí la familia que realizó el pago"),
  amount: z.string().min(1, "Ingresá el importe"),
  method: z.enum(["cash", "transfer", "mercadopago", "other"]),
  reference: z
    .string()
    .trim()
    .max(80)
    .optional()
    .transform((value) => (value ? value : null)),
  payerName: z
    .string()
    .trim()
    .max(120)
    .optional()
    .transform((value) => (value ? value : null)),
  notes: z
    .string()
    .trim()
    .max(500)
    .optional()
    .transform((value) => (value ? value : null)),
});

async function notifyClubAdmins(clubId: string, title: string, body: string, link: string) {
  const admins = await db
    .select({ userId: memberships.userId })
    .from(memberships)
    .where(
      and(
        eq(memberships.clubId, clubId),
        eq(memberships.role, "club_admin"),
        eq(memberships.status, "active"),
      ),
    );

  if (admins.length === 0) return;

  await db.insert(notifications).values(
    admins.map((admin) => ({
      clubId,
      userId: admin.userId,
      title,
      body,
      link,
    })),
  );
}

export async function declarePaymentAction(
  _prev: FinanceFormState,
  formData: FormData,
): Promise<FinanceFormState> {
  const ctx = await getTenant();
  assertCan(ctx, "payments.declare");

  const parsed = declareSchema.safeParse({
    familyId: formData.get("familyId"),
    amount: formData.get("amount"),
    method: formData.get("method") ?? "transfer",
    reference: formData.get("reference"),
    payerName: formData.get("payerName"),
    notes: formData.get("notes"),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Revisá los datos del pago." };
  }

  let amountCents = 0;
  try {
    amountCents = parseMoneyToCents(parsed.data.amount);
  } catch {
    return { error: "El importe no es válido." };
  }
  if (amountCents <= 0) return { error: "El importe debe ser mayor a cero." };

  // Un tutor solo puede declarar pagos de sus propias familias.
  if (ctx.role === "guardian" && !ctx.familyIds.includes(parsed.data.familyId)) {
    return { error: "No podés declarar pagos de otra familia." };
  }
  if (ctx.role === "player") {
    return { error: "Los jugadores no pueden declarar pagos. Pedile a tu tutor." };
  }

  const [family] = await db
    .select({ id: families.id, name: families.name })
    .from(families)
    .where(and(eq(families.id, parsed.data.familyId), eq(families.clubId, ctx.club.id)))
    .limit(1);
  if (!family) return { error: "La familia no pertenece al club." };

  if (parsed.data.reference) {
    const [duplicate] = await db
      .select({ id: payments.id })
      .from(payments)
      .where(
        and(
          eq(payments.clubId, ctx.club.id),
          eq(payments.reference, parsed.data.reference),
          sql`${payments.status} <> 'rejected'`,
        ),
      )
      .limit(1);
    if (duplicate) {
      return {
        error:
          "Ya existe un pago declarado con ese número de operación. Verificá el comprobante.",
      };
    }
  }

  try {
    await db.insert(payments).values({
      clubId: ctx.club.id,
      familyId: family.id,
      amountCents,
      method: parsed.data.method,
      status: "declared",
      payerName: parsed.data.payerName,
      reference: parsed.data.reference,
      notes: parsed.data.notes,
      declaredByUserId: ctx.auth.user.id,
    });

    await writeAudit({
      clubId: ctx.club.id,
      actorUserId: ctx.auth.user.id,
      actorEmail: ctx.auth.user.email,
      action: "payment.declared",
      entity: "payment",
      meta: { familyId: family.id, amountCents, method: parsed.data.method },
    });

    await notifyClubAdmins(
      ctx.club.id,
      "Nuevo pago declarado",
      `${family.name} declaró un pago de $${(amountCents / 100).toFixed(2)}. Está pendiente de revisión.`,
      "/app/pagos?estado=declared",
    );

    return {
      ok: `Pago declarado por ${family.name}. Queda pendiente de revisión del club: la deuda no se cancela hasta que se apruebe.`,
    };
  } catch (error) {
    if (error instanceof Error && error.message.includes("payments_club_reference_uq")) {
      return { error: "Ese número de operación ya fue utilizado en otro pago." };
    }
    console.error("[payments.declare]", error);
    return { error: "No se pudo registrar el pago declarado." };
  }
}

// Revision de pagos -----------------------------------------------------------

export async function approvePaymentAction(
  paymentId: string,
  _prev: FinanceFormState,
  _formData: FormData,
): Promise<FinanceFormState> {
  const ctx = await getTenant();
  assertCan(ctx, "payments.review");

  try {
    const result = await db.transaction(async (tx) => {
      const [payment] = await tx
        .select()
        .from(payments)
        .where(and(eq(payments.id, paymentId), eq(payments.clubId, ctx.club.id)))
        .for("update")
        .limit(1);

      if (!payment) throw new Error("El pago no existe en este club.");
      if (payment.status === "approved") throw new Error("El pago ya fue aprobado.");
      if (payment.status === "rejected") {
        throw new Error("Un pago rechazado no puede aprobarse. Pedí que se declare de nuevo.");
      }

      const chargeRows = await tx
        .select({
          id: charges.id,
          dueDate: charges.dueDate,
          totalCents: charges.totalCents,
          paidCents: charges.paidCents,
        })
        .from(charges)
        .where(
          and(
            eq(charges.clubId, ctx.club.id),
            payment.familyId ? eq(charges.familyId, payment.familyId) : sql`false`,
            inArray(charges.status, ["pending", "partial"]),
            isNull(charges.voidedAt),
          ),
        )
        .orderBy(asc(charges.dueDate));

      if (chargeRows.length === 0) {
        throw new Error(
          "La familia no tiene cuotas pendientes para imputar este pago. Verificá el comprobante o rechazá el pago indicando el motivo.",
        );
      }

      const { applications, unappliedCents } = allocateOldestFirst(
        chargeRows.map((row) => ({
          id: row.id,
          dueDate: row.dueDate,
          totalCents: row.totalCents,
          paidCents: row.paidCents,
        })),
        payment.amountCents,
      );

      if (applications.length === 0) {
        throw new Error("No se pudo imputar el pago a ninguna cuota.");
      }

      for (const application of applications) {
        const charge = chargeRows.find((row) => row.id === application.chargeId);
        if (!charge) continue;
        const newPaid = charge.paidCents + application.amountCents;

        await tx.insert(paymentApplications).values({
          clubId: ctx.club.id,
          paymentId: payment.id,
          chargeId: charge.id,
          amountCents: application.amountCents,
        });

        await tx
          .update(charges)
          .set({
            paidCents: newPaid,
            status: chargeStatusFor(charge.totalCents, newPaid),
            updatedAt: new Date(),
          })
          .where(and(eq(charges.id, charge.id), eq(charges.clubId, ctx.club.id)));
      }

      await tx
        .update(payments)
        .set({
          status: "approved",
          reviewedByUserId: ctx.auth.user.id,
          reviewedAt: new Date(),
          creditCents: unappliedCents,
          updatedAt: new Date(),
        })
        .where(and(eq(payments.id, payment.id), eq(payments.clubId, ctx.club.id)));

      return {
        applications: applications.length,
        unappliedCents,
        familyId: payment.familyId,
        amountCents: payment.amountCents,
      };
    });

    await writeAudit({
      clubId: ctx.club.id,
      actorUserId: ctx.auth.user.id,
      actorEmail: ctx.auth.user.email,
      action: "payment.approved",
      entity: "payment",
      entityId: paymentId,
      meta: result,
    });

    return {
      ok: `Pago aprobado e imputado a ${result.applications} cuota(s).${
        result.unappliedCents > 0
          ? ` Quedó un saldo a favor de $${(result.unappliedCents / 100).toFixed(2)}.`
          : ""
      }`,
    };
  } catch (error) {
    if (error instanceof PermissionError) throw error;
    return {
      error: error instanceof Error ? error.message : "No se pudo aprobar el pago.",
    };
  }
}

const rejectSchema = z.object({
  reason: z.string().trim().min(3, "Indicá el motivo del rechazo").max(300),
});

export async function rejectPaymentAction(
  paymentId: string,
  _prev: FinanceFormState,
  formData: FormData,
): Promise<FinanceFormState> {
  const ctx = await getTenant();
  assertCan(ctx, "payments.review");

  const parsed = rejectSchema.safeParse({ reason: formData.get("reason") });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Indicá el motivo." };
  }

  const [payment] = await db
    .select({ id: payments.id, status: payments.status })
    .from(payments)
    .where(and(eq(payments.id, paymentId), eq(payments.clubId, ctx.club.id)))
    .limit(1);

  if (!payment) return { error: "El pago no existe en este club." };
  if (payment.status === "approved") {
    return { error: "Un pago ya aprobado no puede rechazarse desde acá." };
  }
  if (payment.status === "rejected") return { error: "El pago ya estaba rechazado." };

  await db
    .update(payments)
    .set({
      status: "rejected",
      rejectionReason: parsed.data.reason,
      reviewedByUserId: ctx.auth.user.id,
      reviewedAt: new Date(),
      updatedAt: new Date(),
    })
    .where(and(eq(payments.id, paymentId), eq(payments.clubId, ctx.club.id)));

  await writeAudit({
    clubId: ctx.club.id,
    actorUserId: ctx.auth.user.id,
    actorEmail: ctx.auth.user.email,
    action: "payment.rejected",
    entity: "payment",
    entityId: paymentId,
    meta: { reason: parsed.data.reason },
  });

  return { ok: "Pago rechazado. La deuda de la familia no se modifica." };
}

export async function markUnderReviewAction(formData: FormData): Promise<void> {
  const ctx = await getTenant();
  assertCan(ctx, "payments.review");

  const paymentId = String(formData.get("paymentId") ?? "");

  await db
    .update(payments)
    .set({ status: "under_review", updatedAt: new Date() })
    .where(
      and(
        eq(payments.id, paymentId),
        eq(payments.clubId, ctx.club.id),
        eq(payments.status, "declared"),
      ),
    );

  await writeAudit({
    clubId: ctx.club.id,
    actorUserId: ctx.auth.user.id,
    actorEmail: ctx.auth.user.email,
    action: "payment.under_review",
    entity: "payment",
    entityId: paymentId,
  });
}

// Anulacion de cuotas ---------------------------------------------------------

export async function voidChargeAction(formData: FormData): Promise<void> {
  const ctx = await getTenant();
  assertCan(ctx, "fees.manage");

  const chargeId = String(formData.get("chargeId") ?? "");
  const reason = String(formData.get("reason") ?? "").trim();

  const [charge] = await db
    .select({ id: charges.id, paidCents: charges.paidCents })
    .from(charges)
    .where(and(eq(charges.id, chargeId), eq(charges.clubId, ctx.club.id)))
    .limit(1);

  if (!charge) return;
  if (charge.paidCents > 0) {
    // No se anula una cuota con pagos imputados: primero hay que revertir.
    return;
  }

  await db
    .update(charges)
    .set({
      status: "void",
      voidedAt: new Date(),
      voidedByUserId: ctx.auth.user.id,
      notes: reason || undefined,
      updatedAt: new Date(),
    })
    .where(and(eq(charges.id, chargeId), eq(charges.clubId, ctx.club.id)));

  await writeAudit({
    clubId: ctx.club.id,
    actorUserId: ctx.auth.user.id,
    actorEmail: ctx.auth.user.email,
    action: "charge.voided",
    entity: "charge",
    entityId: chargeId,
    meta: { reason },
  });
}

export async function currentBillingPeriod(): Promise<string> {
  return currentPeriod();
}
