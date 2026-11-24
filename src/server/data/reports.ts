import "server-only";

import { and, desc, eq, inArray, sql } from "drizzle-orm";
import { db } from "@/db/client";
import {
  attendance,
  categories,
  charges,
  families,
  players,
  trainings,
} from "@/db/schema";
import type { TenantContext } from "@/server/tenant";

export type PlayersByCategoryRow = {
  categoryId: string;
  categoryName: string;
  categoryGender: string;
  activeCount: number;
  inactiveCount: number;
  totalCount: number;
};

export async function getPlayersByCategoryReport(
  ctx: TenantContext,
): Promise<PlayersByCategoryRow[]> {
  const rows = await db
    .select({
      categoryId: categories.id,
      categoryName: categories.name,
      categoryGender: categories.gender,
      activeCount: sql<number>`count(case when ${players.status} = 'active' then 1 end)::int`,
      inactiveCount: sql<number>`count(case when ${players.status} != 'active' then 1 end)::int`,
      totalCount: sql<number>`count(${players.id})::int`,
    })
    .from(categories)
    .leftJoin(
      players,
      and(eq(players.categoryId, categories.id), eq(players.clubId, ctx.club.id)),
    )
    .where(eq(categories.clubId, ctx.club.id))
    .groupBy(categories.id, categories.name, categories.gender)
    .orderBy(categories.name, categories.gender);

  return rows;
}

export type CollectionSummary = {
  totalChargedCents: number;
  totalPaidCents: number;
  totalPendingCents: number;
  collectionRatePct: number;
  paidCount: number;
  pendingCount: number;
  partialCount: number;
  voidCount: number;
  totalCount: number;
};

export async function getCollectionSummaryReport(
  ctx: TenantContext,
  period?: string,
): Promise<CollectionSummary> {
  const where = [eq(charges.clubId, ctx.club.id)];
  if (period) {
    where.push(eq(charges.period, period));
  }

  const [row] = await db
    .select({
      totalChargedCents: sql<number>`coalesce(sum(${charges.amountCents}), 0)::bigint`,
      totalPaidCents: sql<number>`coalesce(sum(${charges.paidCents}), 0)::bigint`,
      paidCount: sql<number>`count(case when ${charges.status} = 'paid' then 1 end)::int`,
      pendingCount: sql<number>`count(case when ${charges.status} = 'pending' then 1 end)::int`,
      partialCount: sql<number>`count(case when ${charges.status} = 'partial' then 1 end)::int`,
      voidCount: sql<number>`count(case when ${charges.status} = 'void' then 1 end)::int`,
      totalCount: sql<number>`count(*)::int`,
    })
    .from(charges)
    .where(and(...where));

  const totalCharged = Number(row?.totalChargedCents ?? 0);
  const totalPaid = Number(row?.totalPaidCents ?? 0);
  const totalPending = Math.max(0, totalCharged - totalPaid);
  const collectionRatePct =
    totalCharged > 0 ? Math.round((totalPaid / totalCharged) * 100) : 0;

  return {
    totalChargedCents: totalCharged,
    totalPaidCents: totalPaid,
    totalPendingCents: totalPending,
    collectionRatePct,
    paidCount: row?.paidCount ?? 0,
    pendingCount: row?.pendingCount ?? 0,
    partialCount: row?.partialCount ?? 0,
    voidCount: row?.voidCount ?? 0,
    totalCount: row?.totalCount ?? 0,
  };
}

export type AttendanceByCategoryRow = {
  categoryId: string;
  categoryName: string;
  categoryGender: string;
  totalTrainings: number;
  avgAttendancePct: number;
};

export async function getAttendanceByCategoryReport(
  ctx: TenantContext,
): Promise<AttendanceByCategoryRow[]> {
  const catRows = await db
    .select({
      categoryId: categories.id,
      categoryName: categories.name,
      categoryGender: categories.gender,
      totalTrainings: sql<number>`count(distinct ${trainings.id})::int`,
    })
    .from(categories)
    .leftJoin(
      trainings,
      and(eq(trainings.categoryId, categories.id), eq(trainings.clubId, ctx.club.id)),
    )
    .where(eq(categories.clubId, ctx.club.id))
    .groupBy(categories.id, categories.name, categories.gender)
    .orderBy(categories.name, categories.gender);

  // Calcular asistencia promedio por categoría
  const result: AttendanceByCategoryRow[] = [];

  for (const cat of catRows) {
    if (cat.totalTrainings === 0) {
      result.push({
        categoryId: cat.categoryId,
        categoryName: cat.categoryName,
        categoryGender: cat.categoryGender,
        totalTrainings: 0,
        avgAttendancePct: 0,
      });
      continue;
    }

    const [attRow] = await db
      .select({
        presentCount: sql<number>`count(case when ${attendance.status} in ('present', 'late') then 1 end)::int`,
        totalRecorded: sql<number>`count(*)::int`,
      })
      .from(attendance)
      .innerJoin(trainings, eq(trainings.id, attendance.trainingId))
      .where(
        and(
          eq(trainings.categoryId, cat.categoryId),
          eq(trainings.clubId, ctx.club.id),
        ),
      );

    const total = attRow?.totalRecorded ?? 0;
    const present = attRow?.presentCount ?? 0;
    const avgPct = total > 0 ? Math.round((present / total) * 100) : 0;

    result.push({
      categoryId: cat.categoryId,
      categoryName: cat.categoryName,
      categoryGender: cat.categoryGender,
      totalTrainings: cat.totalTrainings,
      avgAttendancePct: avgPct,
    });
  }

  return result;
}

export type DebtByFamilyRow = {
  familyId: string;
  familyName: string;
  playerCount: number;
  totalDebtCents: number;
  unpaidChargesCount: number;
};

export async function getDebtByFamilyReport(
  ctx: TenantContext,
): Promise<DebtByFamilyRow[]> {
  const rows = await db
    .select({
      familyId: families.id,
      familyName: families.name,
      playerCount: sql<number>`count(distinct ${players.id})::int`,
      totalDebtCents: sql<number>`coalesce(sum(${charges.amountCents} - ${charges.paidCents}), 0)::bigint`,
      unpaidChargesCount: sql<number>`count(distinct ${charges.id})::int`,
    })
    .from(families)
    .leftJoin(
      players,
      and(eq(players.familyId, families.id), eq(players.clubId, ctx.club.id)),
    )
    .innerJoin(
      charges,
      and(
        eq(charges.familyId, families.id),
        eq(charges.clubId, ctx.club.id),
        inArray(charges.status, ["pending", "partial"]),
      ),
    )
    .where(eq(families.clubId, ctx.club.id))
    .groupBy(families.id, families.name)
    .having(sql`sum(${charges.amountCents} - ${charges.paidCents}) > 0`)
    .orderBy(desc(sql`sum(${charges.amountCents} - ${charges.paidCents})`))
    .limit(50);

  return rows.map((r) => ({
    familyId: r.familyId,
    familyName: r.familyName,
    playerCount: r.playerCount,
    totalDebtCents: Number(r.totalDebtCents),
    unpaidChargesCount: r.unpaidChargesCount,
  }));
}
