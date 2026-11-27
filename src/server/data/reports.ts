import "server-only";

import { and, desc, eq, inArray, sql } from "drizzle-orm";
import { db } from "@/db/client";
import {
  attendance,
  categories,
  charges,
  families,
  matches,
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

export type MedicalCertificateSummary = {
  validCount: number;
  expiredCount: number;
  missingCount: number;
  totalActivePlayers: number;
  compliancePct: number;
  expiredPlayers: {
    id: string;
    fullName: string;
    categoryName: string;
    familyId: string | null;
    familyName: string | null;
    expiresAt: string | null;
    daysExpired: number;
  }[];
};

export async function getMedicalCertificateReport(
  ctx: TenantContext,
): Promise<MedicalCertificateSummary> {
  const today = new Date().toISOString().split("T")[0];

  const rows = await db
    .select({
      id: players.id,
      firstName: players.firstName,
      lastName: players.lastName,
      categoryId: players.categoryId,
      categoryName: categories.name,
      familyId: players.familyId,
      familyName: families.name,
      expiresAt: players.medicalCertificateExpiresAt,
      status: players.status,
    })
    .from(players)
    .leftJoin(categories, eq(categories.id, players.categoryId))
    .leftJoin(families, eq(families.id, players.familyId))
    .where(and(eq(players.clubId, ctx.club.id), eq(players.status, "active")))
    .orderBy(players.lastName, players.firstName);

  let validCount = 0;
  let expiredCount = 0;
  let missingCount = 0;
  const expiredPlayers: MedicalCertificateSummary["expiredPlayers"] = [];

  for (const p of rows) {
    if (!p.expiresAt) {
      missingCount++;
      expiredPlayers.push({
        id: p.id,
        fullName: `${p.lastName}, ${p.firstName}`,
        categoryName: p.categoryName || "Sin categoría",
        familyId: p.familyId,
        familyName: p.familyName,
        expiresAt: null,
        daysExpired: 999,
      });
    } else if (p.expiresAt < today) {
      expiredCount++;
      const expDate = new Date(p.expiresAt);
      const diffMs = Math.abs(new Date(today).getTime() - expDate.getTime());
      const days = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
      expiredPlayers.push({
        id: p.id,
        fullName: `${p.lastName}, ${p.firstName}`,
        categoryName: p.categoryName || "Sin categoría",
        familyId: p.familyId,
        familyName: p.familyName,
        expiresAt: p.expiresAt,
        daysExpired: days,
      });
    } else {
      validCount++;
    }
  }

  const totalActivePlayers = rows.length;
  const compliancePct =
    totalActivePlayers > 0 ? Math.round((validCount / totalActivePlayers) * 100) : 0;

  // Ordenar los vencidos: primero los que tienen fecha vencida (de más reciente a más antiguo), luego los sin certificado
  expiredPlayers.sort((a, b) => {
    if (a.expiresAt && b.expiresAt) {
      return a.expiresAt.localeCompare(b.expiresAt);
    }
    return a.expiresAt ? -1 : 1;
  });

  return {
    validCount,
    expiredCount,
    missingCount,
    totalActivePlayers,
    compliancePct,
    expiredPlayers: expiredPlayers.slice(0, 30),
  };
}

export type BasketballSeasonSummary = {
  totalMatches: number;
  playedMatches: number;
  scheduledMatches: number;
  wonMatches: number;
  lostMatches: number;
  winRatePct: number;
  pointsFor: number;
  pointsAgainst: number;
  pointDiff: number;
  categoryStats: {
    categoryId: string;
    categoryName: string;
    categoryGender: string;
    total: number;
    won: number;
    lost: number;
    pointsFor: number;
    pointsAgainst: number;
  }[];
};

export async function getBasketballSeasonReport(
  ctx: TenantContext,
): Promise<BasketballSeasonSummary> {
  const matchList = await db
    .select({
      id: matches.id,
      status: matches.status,
      categoryId: matches.categoryId,
      categoryName: categories.name,
      categoryGender: categories.gender,
      ourScore: matches.ourScore,
      rivalScore: matches.rivalScore,
    })
    .from(matches)
    .leftJoin(categories, eq(categories.id, matches.categoryId))
    .where(eq(matches.clubId, ctx.club.id));

  let playedMatches = 0;
  let scheduledMatches = 0;
  let wonMatches = 0;
  let lostMatches = 0;
  let pointsFor = 0;
  let pointsAgainst = 0;

  const catMap = new Map<
    string,
    {
      categoryId: string;
      categoryName: string;
      categoryGender: string;
      total: number;
      won: number;
      lost: number;
      pointsFor: number;
      pointsAgainst: number;
    }
  >();

  for (const m of matchList) {
    if (m.status === "scheduled") {
      scheduledMatches++;
    } else if (m.status === "played") {
      playedMatches++;
      const our = m.ourScore ?? 0;
      const riv = m.rivalScore ?? 0;
      pointsFor += our;
      pointsAgainst += riv;

      const won = our > riv;
      const lost = our < riv;
      if (won) wonMatches++;
      if (lost) lostMatches++;

      if (m.categoryId) {
        const cat = catMap.get(m.categoryId) ?? {
          categoryId: m.categoryId,
          categoryName: m.categoryName || "General",
          categoryGender: m.categoryGender || "mixed",
          total: 0,
          won: 0,
          lost: 0,
          pointsFor: 0,
          pointsAgainst: 0,
        };
        cat.total++;
        if (won) cat.won++;
        if (lost) cat.lost++;
        cat.pointsFor += our;
        cat.pointsAgainst += riv;
        catMap.set(m.categoryId, cat);
      }
    }
  }

  const winRatePct =
    playedMatches > 0 ? Math.round((wonMatches / playedMatches) * 100) : 0;

  return {
    totalMatches: matchList.length,
    playedMatches,
    scheduledMatches,
    wonMatches,
    lostMatches,
    winRatePct,
    pointsFor,
    pointsAgainst,
    pointDiff: pointsFor - pointsAgainst,
    categoryStats: Array.from(catMap.values()).sort((a, b) =>
      a.categoryName.localeCompare(b.categoryName),
    ),
  };
}
