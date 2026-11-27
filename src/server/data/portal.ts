import "server-only";

import { and, asc, desc, eq, gte, inArray, isNull, lt, ne, sql } from "drizzle-orm";
import { db } from "@/db/client";
import {
  categories,
  charges,
  families,
  matches,
  paymentApplications,
  payments,
  players,
  trainings,
} from "@/db/schema";
import { todayISO } from "@/lib/format";
import { getMedicalCertificateInfo, type MedicalCertificateInfo } from "@/lib/medical";
import type { TenantContext } from "@/server/tenant";

export type GuardianChild = {
  id: string;
  firstName: string;
  lastName: string;
  fullName: string;
  dni: string | null;
  birthDate: string | null;
  jerseyNumber: number | null;
  position: string | null;
  categoryId: string | null;
  categoryName: string | null;
  categoryGender: string | null;
  gender: string | null;
  medicalExpiresAt: string | null;
  medicalInfo: MedicalCertificateInfo;
  isEligible: boolean;
};

export type GuardianCharge = {
  id: string;
  concept: string;
  period: string;
  dueDate: string;
  totalCents: number;
  paidCents: number;
  balanceCents: number;
  isOverdue: boolean;
  daysOverdue: number;
  playerId: string | null;
  playerName: string | null;
};

export type GuardianPayment = {
  id: string;
  amountCents: number;
  method: string;
  status: string;
  reference: string | null;
  createdAt: Date;
  reviewedAt: Date | null;
  receiptNumber: string;
};

export type GuardianEvent = {
  id: string;
  type: "match" | "training";
  title: string;
  categoryName: string;
  startsAt: Date;
  location: string | null;
  isHome?: boolean;
  rival?: string | null;
};

export type GuardianPortalData = {
  family: {
    id: string;
    name: string;
    contactName: string | null;
    contactPhone: string | null;
    contactEmail?: string | null;
  };
  children: GuardianChild[];
  pendingCharges: GuardianCharge[];
  recentPayments: GuardianPayment[];
  totalDebtCents: number;
  upcomingEvents: GuardianEvent[];
};

export async function getGuardianPortalData(
  ctx: TenantContext,
  overrideFamilyId?: string,
): Promise<GuardianPortalData | null> {
  const today = todayISO();
  const todayMs = new Date(today).getTime();

  let targetFamilyId = overrideFamilyId;
  if (!targetFamilyId) {
    if (ctx.familyIds && ctx.familyIds.length > 0) {
      targetFamilyId = ctx.familyIds[0];
    }
  }

  if (!targetFamilyId) return null;

  // 1. Datos de la familia
  const [family] = await db
    .select({
      id: families.id,
      name: families.name,
      contactName: families.contactName,
      contactPhone: families.contactPhone,
      contactEmail: families.contactEmail,
    })
    .from(families)
    .where(and(eq(families.id, targetFamilyId), eq(families.clubId, ctx.club.id)))
    .limit(1);

  if (!family) return null;

  // 2. Hijos / Jugadores de la familia
  const playerRows = await db
    .select({
      id: players.id,
      firstName: players.firstName,
      lastName: players.lastName,
      dni: players.dni,
      birthDate: players.birthDate,
      jerseyNumber: players.jerseyNumber,
      position: players.position,
      categoryId: players.categoryId,
      categoryName: categories.name,
      categoryGender: categories.gender,
      gender: players.gender,
      status: players.status,
      medicalCertificateExpiresAt: players.medicalCertificateExpiresAt,
    })
    .from(players)
    .leftJoin(categories, eq(categories.id, players.categoryId))
    .where(
      and(
        eq(players.clubId, ctx.club.id),
        eq(players.familyId, family.id),
        eq(players.status, "active"),
      ),
    )
    .orderBy(asc(players.birthDate));

  const children: GuardianChild[] = playerRows.map((p) => {
    const medicalInfo = getMedicalCertificateInfo(p.medicalCertificateExpiresAt);
    const isEligible = medicalInfo.status !== "expired" && medicalInfo.status !== "missing";
    return {
      id: p.id,
      firstName: p.firstName,
      lastName: p.lastName,
      fullName: `${p.lastName}, ${p.firstName}`,
      dni: p.dni,
      birthDate: p.birthDate,
      jerseyNumber: p.jerseyNumber,
      position: p.position,
      categoryId: p.categoryId,
      categoryName: p.categoryName,
      categoryGender: p.categoryGender,
      gender: p.gender,
      medicalExpiresAt: p.medicalCertificateExpiresAt,
      medicalInfo,
      isEligible,
    };
  });

  const categoryIds = children
    .map((c) => c.categoryId)
    .filter((id): id is string => Boolean(id));

  // 3. Cuotas de la familia
  const chargeRows = await db
    .select({
      id: charges.id,
      concept: charges.concept,
      period: charges.period,
      dueDate: charges.dueDate,
      totalCents: charges.totalCents,
      paidCents: charges.paidCents,
      playerId: charges.playerId,
      status: charges.status,
      playerName: sql<string>`(${players.firstName} || ' ' || ${players.lastName})`,
    })
    .from(charges)
    .leftJoin(players, eq(players.id, charges.playerId))
    .where(
      and(
        eq(charges.clubId, ctx.club.id),
        eq(charges.familyId, family.id),
        isNull(charges.voidedAt),
        inArray(charges.status, ["pending", "partial"]),
      ),
    )
    .orderBy(asc(charges.dueDate));

  const pendingCharges: GuardianCharge[] = chargeRows.map((ch) => {
    const balanceCents = Math.max(0, ch.totalCents - ch.paidCents);
    const isOverdue = ch.dueDate < today;
    const dueMs = new Date(ch.dueDate).getTime();
    const daysOverdue = isOverdue
      ? Math.max(0, Math.floor((todayMs - dueMs) / (1000 * 60 * 60 * 24)))
      : 0;

    return {
      id: ch.id,
      concept: ch.concept,
      period: ch.period,
      dueDate: ch.dueDate,
      totalCents: ch.totalCents,
      paidCents: ch.paidCents,
      balanceCents,
      isOverdue,
      daysOverdue,
      playerId: ch.playerId,
      playerName: ch.playerName,
    };
  });

  const totalDebtCents = pendingCharges.reduce((sum, ch) => sum + ch.balanceCents, 0);

  // 4. Últimos pagos aprobados / recibos
  const paymentRows = await db
    .select({
      id: payments.id,
      amountCents: payments.amountCents,
      method: payments.method,
      status: payments.status,
      reference: payments.reference,
      createdAt: payments.createdAt,
      reviewedAt: payments.reviewedAt,
    })
    .from(payments)
    .where(
      and(
        eq(payments.clubId, ctx.club.id),
        eq(payments.familyId, family.id),
        eq(payments.status, "approved"),
      ),
    )
    .orderBy(desc(payments.createdAt))
    .limit(6);

  const recentPayments: GuardianPayment[] = paymentRows.map((p) => ({
    id: p.id,
    amountCents: p.amountCents,
    method: p.method,
    status: p.status,
    reference: p.reference,
    createdAt: p.createdAt,
    reviewedAt: p.reviewedAt,
    receiptNumber: `REC-2026-${p.id.slice(0, 8).toUpperCase()}`,
  }));

  // 5. Próximos eventos (partidos y entrenamientos) de las categorías de los hijos
  const upcomingEvents: GuardianEvent[] = [];

  if (categoryIds.length > 0) {
    const nextMatches = await db
      .select({
        id: matches.id,
        rival: matches.rival,
        startsAt: matches.startsAt,
        location: matches.location,
        isHome: matches.isHome,
        categoryName: categories.name,
      })
      .from(matches)
      .innerJoin(categories, eq(categories.id, matches.categoryId))
      .where(
        and(
          eq(matches.clubId, ctx.club.id),
          inArray(matches.categoryId, categoryIds),
          gte(matches.startsAt, new Date()),
        ),
      )
      .orderBy(asc(matches.startsAt))
      .limit(3);

    for (const m of nextMatches) {
      upcomingEvents.push({
        id: m.id,
        type: "match",
        title: `vs. ${m.rival} (${m.isHome ? "Local en Calle 33 N° 334" : "Visitante"})`,
        categoryName: m.categoryName,
        startsAt: m.startsAt,
        location: m.location,
        isHome: m.isHome,
        rival: m.rival,
      });
    }

    const nextTrainings = await db
      .select({
        id: trainings.id,
        title: trainings.title,
        startsAt: trainings.startsAt,
        location: trainings.location,
        categoryName: categories.name,
      })
      .from(trainings)
      .innerJoin(categories, eq(categories.id, trainings.categoryId))
      .where(
        and(
          eq(trainings.clubId, ctx.club.id),
          inArray(trainings.categoryId, categoryIds),
          gte(trainings.startsAt, new Date()),
        ),
      )
      .orderBy(asc(trainings.startsAt))
      .limit(3);

    for (const t of nextTrainings) {
      upcomingEvents.push({
        id: t.id,
        type: "training",
        title: t.title || "Entrenamiento oficial de básquet",
        categoryName: t.categoryName,
        startsAt: t.startsAt,
        location: t.location,
      });
    }
  }

  // Ordenamos cronológicamente los eventos
  upcomingEvents.sort((a, b) => a.startsAt.getTime() - b.startsAt.getTime());

  return {
    family,
    children,
    pendingCharges,
    recentPayments,
    totalDebtCents,
    upcomingEvents,
  };
}
