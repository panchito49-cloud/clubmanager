import "server-only";

import { and, asc, desc, eq, gte, inArray, isNull, lt, ne, sql } from "drizzle-orm";
import { db } from "@/db/client";
import {
  announcements,
  charges,
  families,
  matches,
  notifications,
  payments,
  players,
  trainings,
} from "@/db/schema";
import { currentPeriod, shiftMonth, todayISO } from "@/lib/format";
import { chargeScope, playerScope } from "@/server/scope";
import type { TenantContext } from "@/server/tenant";

export type FinanceSummary = {
  period: string;
  billedCents: number;
  collectedCents: number;
  outstandingCents: number;
  overdueCents: number;
  overdueCount: number;
  declaredCount: number;
  declaredCents: number;
};

export async function getFinanceSummary(ctx: TenantContext): Promise<FinanceSummary> {
  const period = currentPeriod();
  const today = todayISO();

  const [periodRow] = await db
    .select({
      billed: sql<number>`coalesce(sum(${charges.totalCents}), 0)::int`,
      collected: sql<number>`coalesce(sum(${charges.paidCents}), 0)::int`,
      count: sql<number>`count(*)::int`,
    })
    .from(charges)
    .where(
      and(
        eq(charges.clubId, ctx.club.id),
        eq(charges.period, period),
        ne(charges.status, "void"),
        chargeScope(ctx),
      ),
    );

  const [overdueRow] = await db
    .select({
      amount: sql<number>`coalesce(sum(${charges.totalCents} - ${charges.paidCents}), 0)::int`,
      count: sql<number>`count(*)::int`,
    })
    .from(charges)
    .where(
      and(
        eq(charges.clubId, ctx.club.id),
        lt(charges.dueDate, today),
        inArray(charges.status, ["pending", "partial"]),
        chargeScope(ctx),
      ),
    );

  const [declaredRow] = await db
    .select({
      amount: sql<number>`coalesce(sum(${payments.amountCents}), 0)::int`,
      count: sql<number>`count(*)::int`,
    })
    .from(payments)
    .where(
      and(
        eq(payments.clubId, ctx.club.id),
        inArray(payments.status, ["declared", "under_review"]),
        ctx.role === "club_admin"
          ? sql`true`
          : ctx.role === "guardian" && ctx.familyIds.length > 0
            ? inArray(payments.familyId, ctx.familyIds)
            : sql`false`,
      ),
    );

  const billed = Number(periodRow?.billed ?? 0);
  const collected = Number(periodRow?.collected ?? 0);

  return {
    period,
    billedCents: billed,
    collectedCents: collected,
    outstandingCents: Math.max(0, billed - collected),
    overdueCents: Number(overdueRow?.amount ?? 0),
    overdueCount: Number(overdueRow?.count ?? 0),
    declaredCount: Number(declaredRow?.count ?? 0),
    declaredCents: Number(declaredRow?.amount ?? 0),
  };
}

export async function getCollectionTrend(ctx: TenantContext, months = 6) {
  const startPeriod = shiftMonth(currentPeriod(), -(months - 1));

  const rows = await db
    .select({
      period: charges.period,
      billed: sql<number>`coalesce(sum(${charges.totalCents}), 0)::int`,
      collected: sql<number>`coalesce(sum(${charges.paidCents}), 0)::int`,
    })
    .from(charges)
    .where(
      and(
        eq(charges.clubId, ctx.club.id),
        gte(charges.period, startPeriod),
        ne(charges.status, "void"),
        chargeScope(ctx),
      ),
    )
    .groupBy(charges.period)
    .orderBy(asc(charges.period));

  const map = new Map(rows.map((row) => [row.period, row]));

  return Array.from({ length: months }, (_, index) => {
    const period = shiftMonth(startPeriod, index);
    const row = map.get(period);
    return {
      period,
      billed: Number(row?.billed ?? 0),
      collected: Number(row?.collected ?? 0),
    };
  });
}

export async function getCounts(ctx: TenantContext) {
  const [playersRow] = await db
    .select({
      total: sql<number>`count(*)::int`,
      active: sql<number>`count(*) filter (where ${players.status} = 'active')::int`,
    })
    .from(players)
    .where(and(eq(players.clubId, ctx.club.id), playerScope(ctx)));

  const [familiesRow] = await db
    .select({ total: sql<number>`count(*)::int` })
    .from(families)
    .where(eq(families.clubId, ctx.club.id));

  return {
    players: Number(playersRow?.total ?? 0),
    activePlayers: Number(playersRow?.active ?? 0),
    families: Number(familiesRow?.total ?? 0),
  };
}

export type UpcomingEvent = {
  id: string;
  kind: "training" | "match";
  title: string;
  categoryName: string;
  startsAt: Date;
  location: string | null;
};

/** Categorias que el usuario puede ver segun su rol. */
export async function visibleCategoryIds(ctx: TenantContext): Promise<string[] | null> {
  if (ctx.role === "club_admin") return null;
  if (ctx.role === "coach") return ctx.coachCategoryIds;

  const rows = await db
    .selectDistinct({ categoryId: players.categoryId })
    .from(players)
    .where(
      and(
        eq(players.clubId, ctx.club.id),
        ctx.role === "guardian"
          ? ctx.familyIds.length > 0
            ? inArray(players.familyId, ctx.familyIds)
            : sql`false`
          : ctx.playerId
            ? eq(players.id, ctx.playerId)
            : sql`false`,
      ),
    );

  return rows.map((row) => row.categoryId).filter(Boolean) as string[];
}

export async function getUpcomingEvents(
  ctx: TenantContext,
  limit = 6,
): Promise<UpcomingEvent[]> {
  const from = new Date();
  const categoryIds = await visibleCategoryIds(ctx);
  if (categoryIds && categoryIds.length === 0) return [];

  const categoryFilter = categoryIds ? inArray(trainings.categoryId, categoryIds) : sql`true`;
  const matchCategoryFilter = categoryIds
    ? inArray(matches.categoryId, categoryIds)
    : sql`true`;

  const trainingRows = await db
    .select({
      id: trainings.id,
      title: trainings.title,
      startsAt: trainings.startsAt,
      location: trainings.location,
      categoryName: sql<string>`(select name from categories c where c.id = ${trainings.categoryId})`,
    })
    .from(trainings)
    .where(
      and(
        eq(trainings.clubId, ctx.club.id),
        eq(trainings.status, "scheduled"),
        gte(trainings.startsAt, from),
        categoryFilter,
      ),
    )
    .orderBy(asc(trainings.startsAt))
    .limit(limit);

  const matchRows = await db
    .select({
      id: matches.id,
      rival: matches.rival,
      startsAt: matches.startsAt,
      location: matches.location,
      isHome: matches.isHome,
      categoryName: sql<string>`(select name from categories c where c.id = ${matches.categoryId})`,
    })
    .from(matches)
    .where(
      and(
        eq(matches.clubId, ctx.club.id),
        eq(matches.status, "scheduled"),
        gte(matches.startsAt, from),
        matchCategoryFilter,
      ),
    )
    .orderBy(asc(matches.startsAt))
    .limit(limit);

  const events: UpcomingEvent[] = [
    ...trainingRows.map((row) => ({
      id: `t-${row.id}`,
      kind: "training" as const,
      title: row.title,
      categoryName: row.categoryName,
      startsAt: row.startsAt,
      location: row.location,
    })),
    ...matchRows.map((row) => ({
      id: `m-${row.id}`,
      kind: "match" as const,
      title: `${row.isHome ? "vs" : "@"} ${row.rival}`,
      categoryName: row.categoryName,
      startsAt: row.startsAt,
      location: row.location,
    })),
  ];

  return events.sort((a, b) => a.startsAt.getTime() - b.startsAt.getTime()).slice(0, limit);
}

/** Familias con deuda vencida (solo staff administrador). */
export async function getTopDebtors(ctx: TenantContext, limit = 5) {
  const today = todayISO();

  const rows = await db
    .select({
      familyId: charges.familyId,
      familyName: families.name,
      amount: sql<number>`coalesce(sum(${charges.totalCents} - ${charges.paidCents}), 0)::int`,
      count: sql<number>`count(*)::int`,
    })
    .from(charges)
    .innerJoin(families, eq(families.id, charges.familyId))
    .where(
      and(
        eq(charges.clubId, ctx.club.id),
        eq(families.clubId, ctx.club.id),
        lt(charges.dueDate, today),
        inArray(charges.status, ["pending", "partial"]),
        chargeScope(ctx),
      ),
    )
    .groupBy(charges.familyId, families.name)
    .orderBy(desc(sql`sum(${charges.totalCents} - ${charges.paidCents})`))
    .limit(limit);

  return rows.map((row) => ({
    familyId: row.familyId,
    familyName: row.familyName,
    amountCents: Number(row.amount),
    chargeCount: Number(row.count),
  }));
}

export async function getRecentAnnouncements(ctx: TenantContext, limit = 3) {
  return db
    .select({
      id: announcements.id,
      title: announcements.title,
      body: announcements.body,
      sentAt: announcements.sentAt,
    })
    .from(announcements)
    .where(and(eq(announcements.clubId, ctx.club.id), eq(announcements.status, "sent")))
    .orderBy(desc(announcements.sentAt))
    .limit(limit);
}

export async function getUnreadNotifications(ctx: TenantContext, limit = 5) {
  return db
    .select({
      id: notifications.id,
      title: notifications.title,
      body: notifications.body,
      link: notifications.link,
      createdAt: notifications.createdAt,
    })
    .from(notifications)
    .where(
      and(
        eq(notifications.clubId, ctx.club.id),
        eq(notifications.userId, ctx.auth.user.id),
        isNull(notifications.readAt),
      ),
    )
    .orderBy(desc(notifications.createdAt))
    .limit(limit);
}
