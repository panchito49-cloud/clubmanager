import "server-only";

import { and, asc, desc, eq, gte, ilike, inArray, isNull, lt, lte, ne, or, sql } from "drizzle-orm";
import { db } from "@/db/client";
import {
  categories,
  charges,
  families,
  feePlans,
  paymentApplications,
  payments,
  players,
  users,
} from "@/db/schema";
import { currentPeriod, todayISO } from "@/lib/format";
import { chargeScope } from "@/server/scope";
import type { TenantContext } from "@/server/tenant";

export const FINANCE_PAGE_SIZE = 25;

export async function listFeePlans(ctx: TenantContext) {
  return db
    .select({
      id: feePlans.id,
      name: feePlans.name,
      concept: feePlans.concept,
      amountCents: feePlans.amountCents,
      dueDay: feePlans.dueDay,
      isActive: feePlans.isActive,
      categoryId: feePlans.categoryId,
      categoryName: categories.name,
    })
    .from(feePlans)
    .leftJoin(categories, eq(categories.id, feePlans.categoryId))
    .where(eq(feePlans.clubId, ctx.club.id))
    .orderBy(desc(feePlans.isActive), asc(feePlans.name));
}

export async function listPeriods(ctx: TenantContext): Promise<string[]> {
  const rows = await db
    .selectDistinct({ period: charges.period })
    .from(charges)
    .where(eq(charges.clubId, ctx.club.id))
    .orderBy(desc(charges.period))
    .limit(18);
  return rows.map((row) => row.period);
}

export type ChargeFilters = {
  period?: string;
  status?: string;
  categoryId?: string;
  q?: string;
  page?: number;
};

export async function listCharges(ctx: TenantContext, filters: ChargeFilters) {
  const page = Math.max(1, filters.page ?? 1);
  const today = todayISO();
  const where = [eq(charges.clubId, ctx.club.id), ne(charges.status, "void"), chargeScope(ctx)];

  if (filters.period) where.push(eq(charges.period, filters.period));

  if (filters.status === "overdue") {
    where.push(lt(charges.dueDate, today));
    where.push(inArray(charges.status, ["pending", "partial"]));
  } else if (filters.status === "paid") {
    where.push(eq(charges.status, "paid"));
  } else if (filters.status === "pending") {
    where.push(inArray(charges.status, ["pending", "partial"]));
  }

  if (filters.categoryId) where.push(eq(players.categoryId, filters.categoryId));

  if (filters.q) {
    const term = `%${filters.q.trim()}%`;
    const condition = or(
      ilike(players.firstName, term),
      ilike(players.lastName, term),
      ilike(families.name, term),
      sql`(${players.firstName} || ' ' || ${players.lastName}) ilike ${term}`,
    );
    if (condition) where.push(condition);
  }

  const base = db
    .select({
      id: charges.id,
      concept: charges.concept,
      period: charges.period,
      dueDate: charges.dueDate,
      amountCents: charges.amountCents,
      discountCents: charges.discountCents,
      totalCents: charges.totalCents,
      paidCents: charges.paidCents,
      status: charges.status,
      playerId: charges.playerId,
      familyId: charges.familyId,
      playerName: sql<string>`(${players.firstName} || ' ' || ${players.lastName})`,
      familyName: families.name,
    })
    .from(charges)
    .leftJoin(players, eq(players.id, charges.playerId))
    .leftJoin(families, eq(families.id, charges.familyId))
    .where(and(...where));

  const rows = await base
    .orderBy(desc(charges.dueDate), asc(players.lastName))
    .limit(FINANCE_PAGE_SIZE)
    .offset((page - 1) * FINANCE_PAGE_SIZE);

  const [totals] = await db
    .select({
      total: sql<number>`count(*)::int`,
      billed: sql<number>`coalesce(sum(${charges.totalCents}), 0)::int`,
      paid: sql<number>`coalesce(sum(${charges.paidCents}), 0)::int`,
      countOverdue: sql<number>`count(*) filter (where ${charges.dueDate} < ${today} and ${charges.status} in ('pending','partial'))::int`,
    })
    .from(charges)
    .leftJoin(players, eq(players.id, charges.playerId))
    .leftJoin(families, eq(families.id, charges.familyId))
    .where(and(...where));

  const total = Number(totals?.total ?? 0);

  return {
    rows,
    totals: {
      billed: Number(totals?.billed ?? 0),
      paid: Number(totals?.paid ?? 0),
      outstanding: Math.max(0, Number(totals?.billed ?? 0) - Number(totals?.paid ?? 0)),
      overdueCount: Number(totals?.countOverdue ?? 0),
    },
    total,
    page,
    pageSize: FINANCE_PAGE_SIZE,
    totalPages: Math.max(1, Math.ceil(total / FINANCE_PAGE_SIZE)),
  };
}

export async function listPayments(
  ctx: TenantContext,
  filters: { status?: string; q?: string; page?: number },
) {
  const page = Math.max(1, filters.page ?? 1);
  const today = todayISO();
  const where = [eq(payments.clubId, ctx.club.id)];

  if (ctx.role === "guardian") {
    where.push(
      ctx.familyIds.length > 0 ? inArray(payments.familyId, ctx.familyIds) : sql`false`,
    );
  } else if (ctx.role === "player") {
    where.push(ctx.playerId ? eq(payments.playerId, ctx.playerId) : sql`false`);
  }

  if (filters.status && ["declared", "under_review", "approved", "rejected"].includes(filters.status)) {
    where.push(eq(payments.status, filters.status as "declared"));
  }

  if (filters.q) {
    const term = `%${filters.q.trim()}%`;
    const condition = or(
      ilike(payments.reference, term),
      ilike(payments.payerName, term),
      ilike(families.name, term),
    );
    if (condition) where.push(condition);
  }

  const [totalRow] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(payments)
    .leftJoin(families, eq(families.id, payments.familyId))
    .where(and(...where));

  const rows = await db
    .select({
      id: payments.id,
      amountCents: payments.amountCents,
      creditCents: payments.creditCents,
      method: payments.method,
      status: payments.status,
      payerName: payments.payerName,
      reference: payments.reference,
      notes: payments.notes,
      rejectionReason: payments.rejectionReason,
      createdAt: payments.createdAt,
      reviewedAt: payments.reviewedAt,
      familyId: payments.familyId,
      familyName: families.name,
      declaredBy: sql<string>`(select full_name from users u where u.id = ${payments.declaredByUserId})`,
      reviewedBy: sql<string>`(select full_name from users u where u.id = ${payments.reviewedByUserId})`,
      appliedCents: sql<number>`(
        select coalesce(sum(pa.amount_cents), 0)
        from payment_applications pa
        where pa.payment_id = ${payments.id}
      )::int`,
    })
    .from(payments)
    .leftJoin(families, eq(families.id, payments.familyId))
    .where(and(...where))
    .orderBy(desc(payments.createdAt))
    .limit(FINANCE_PAGE_SIZE)
    .offset((page - 1) * FINANCE_PAGE_SIZE);

  const [sums] = await db
    .select({
      declared: sql<number>`coalesce(sum(case when ${payments.status} in ('declared','under_review') then ${payments.amountCents} else 0 end), 0)::int`,
      approved: sql<number>`coalesce(sum(case when ${payments.status} = 'approved' then ${payments.amountCents} else 0 end), 0)::int`,
      countDeclared: sql<number>`count(*) filter (where ${payments.status} in ('declared','under_review'))::int`,
    })
    .from(payments)
    .where(and(eq(payments.clubId, ctx.club.id)));

  const total = Number(totalRow?.count ?? 0);

  return {
    rows,
    sums: {
      declared: Number(sums?.declared ?? 0),
      approved: Number(sums?.approved ?? 0),
      countDeclared: Number(sums?.countDeclared ?? 0),
    },
    total,
    page,
    pageSize: FINANCE_PAGE_SIZE,
    totalPages: Math.max(1, Math.ceil(total / FINANCE_PAGE_SIZE)),
    today,
  };
}

export async function getPayment(ctx: TenantContext, paymentId: string) {
  const scope =
    ctx.role === "club_admin" || ctx.role === "coach"
      ? sql`true`
      : ctx.role === "guardian"
        ? ctx.familyIds.length > 0
          ? inArray(payments.familyId, ctx.familyIds)
          : sql`false`
        : ctx.playerId
          ? eq(payments.playerId, ctx.playerId)
          : sql`false`;

  const [payment] = await db
    .select({
      id: payments.id,
      amountCents: payments.amountCents,
      creditCents: payments.creditCents,
      method: payments.method,
      status: payments.status,
      payerName: payments.payerName,
      reference: payments.reference,
      notes: payments.notes,
      rejectionReason: payments.rejectionReason,
      createdAt: payments.createdAt,
      reviewedAt: payments.reviewedAt,
      familyId: payments.familyId,
      familyName: families.name,
      declaredByName: sql<string>`(select full_name from users u where u.id = ${payments.declaredByUserId})`,
      reviewedByName: sql<string>`(select full_name from users u where u.id = ${payments.reviewedByUserId})`,
    })
    .from(payments)
    .leftJoin(families, eq(families.id, payments.familyId))
    .where(and(eq(payments.id, paymentId), eq(payments.clubId, ctx.club.id), scope))
    .limit(1);

  if (!payment) return null;

  const applications = await db
    .select({
      id: paymentApplications.id,
      amountCents: paymentApplications.amountCents,
      chargeId: charges.id,
      concept: charges.concept,
      period: charges.period,
      dueDate: charges.dueDate,
    })
    .from(paymentApplications)
    .innerJoin(charges, eq(charges.id, paymentApplications.chargeId))
    .where(
      and(
        eq(paymentApplications.paymentId, paymentId),
        eq(paymentApplications.clubId, ctx.club.id),
      ),
    );

  return { payment, applications };
}

/** Cuotas pendientes de una familia, para mostrar antes de declarar un pago. */
export async function pendingChargesFor(ctx: TenantContext, familyId: string) {
  return db
    .select({
      id: charges.id,
      concept: charges.concept,
      period: charges.period,
      dueDate: charges.dueDate,
      totalCents: charges.totalCents,
      paidCents: charges.paidCents,
      balanceCents: sql<number>`(${charges.totalCents} - ${charges.paidCents})::int`,
      playerName: sql<string>`(
        select p.first_name || ' ' || p.last_name from players p where p.id = ${charges.playerId}
      )`,
    })
    .from(charges)
    .where(
      and(
        eq(charges.clubId, ctx.club.id),
        eq(charges.familyId, familyId),
        inArray(charges.status, ["pending", "partial"]),
        chargeScope(ctx),
      ),
    )
    .orderBy(asc(charges.dueDate));
}

/** Periodos con datos y montos del periodo, para el resumen de cuotas. */
export async function chargesOverview(ctx: TenantContext, period: string) {
  const [row] = await db
    .select({
      billed: sql<number>`coalesce(sum(${charges.totalCents}), 0)::int`,
      paid: sql<number>`coalesce(sum(${charges.paidCents}), 0)::int`,
      count: sql<number>`count(*)::int`,
      paidCount: sql<number>`count(*) filter (where ${charges.status} = 'paid')::int`,
      overdueCount: sql<number>`count(*) filter (where ${charges.dueDate} < ${todayISO()} and ${charges.status} in ('pending','partial'))::int`,
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

  return {
    period,
    billed: Number(row?.billed ?? 0),
    paid: Number(row?.paid ?? 0),
    count: Number(row?.count ?? 0),
    paidCount: Number(row?.paidCount ?? 0),
    overdueCount: Number(row?.overdueCount ?? 0),
  };
}

export function defaultPeriod(): string {
  return currentPeriod();
}

export async function familiesForDeclaration(ctx: TenantContext) {
  const where =
    ctx.role === "club_admin"
      ? sql`true`
      : ctx.role === "guardian"
        ? ctx.familyIds.length > 0
          ? inArray(families.id, ctx.familyIds)
          : sql`false`
        : sql`false`;

  return db
    .select({ id: families.id, name: families.name, contactName: families.contactName })
    .from(families)
    .where(and(eq(families.clubId, ctx.club.id), where))
    .orderBy(asc(families.name));
}

export async function clubUsersForAudit(ctx: TenantContext) {
  return db
    .select({ id: users.id, fullName: users.fullName })
    .from(users)
    .where(eq(users.id, ctx.auth.user.id));
}

// Inteligencia de cobranzas: mora crítica y planes de refinanciación ----------

export type Overdue90Charge = {
  id: string;
  concept: string;
  period: string;
  dueDate: string;
  totalCents: number;
  paidCents: number;
  balanceCents: number;
  daysOverdue: number;
  isCritical: boolean;
  playerName: string | null;
};

export type Overdue90FamilyCase = {
  familyId: string;
  familyName: string;
  contactName: string | null;
  contactPhone: string | null;
  totalDebtCents: number;
  criticalDebtCents: number;
  maxDaysOverdue: number;
  criticalChargesCount: number;
  totalChargesCount: number;
  charges: Overdue90Charge[];
};

export async function listCriticalOverdueCases(
  ctx: TenantContext,
  thresholdDays: number = 90,
): Promise<Overdue90FamilyCase[]> {
  const today = todayISO();
  const todayMs = new Date(today).getTime();

  const rows = await db
    .select({
      id: charges.id,
      concept: charges.concept,
      period: charges.period,
      dueDate: charges.dueDate,
      totalCents: charges.totalCents,
      paidCents: charges.paidCents,
      familyId: charges.familyId,
      familyName: families.name,
      contactName: families.contactName,
      contactPhone: families.contactPhone,
      playerName: sql<string>`(${players.firstName} || ' ' || ${players.lastName})`,
    })
    .from(charges)
    .innerJoin(families, eq(families.id, charges.familyId))
    .leftJoin(players, eq(players.id, charges.playerId))
    .where(
      and(
        eq(charges.clubId, ctx.club.id),
        isNull(charges.voidedAt),
        inArray(charges.status, ["pending", "partial"]),
        lt(charges.dueDate, today),
      ),
    )
    .orderBy(asc(charges.dueDate));

  const byFamily = new Map<string, Overdue90FamilyCase>();

  for (const r of rows) {
    if (!r.familyId) continue;
    const dueMs = new Date(r.dueDate).getTime();
    const daysOverdue = Math.max(0, Math.floor((todayMs - dueMs) / (1000 * 60 * 60 * 24)));
    const balanceCents = Math.max(0, r.totalCents - r.paidCents);
    const isCritical = daysOverdue >= thresholdDays;

    let caseItem = byFamily.get(r.familyId);
    if (!caseItem) {
      caseItem = {
        familyId: r.familyId,
        familyName: r.familyName,
        contactName: r.contactName,
        contactPhone: r.contactPhone,
        totalDebtCents: 0,
        criticalDebtCents: 0,
        maxDaysOverdue: 0,
        criticalChargesCount: 0,
        totalChargesCount: 0,
        charges: [],
      };
      byFamily.set(r.familyId, caseItem);
    }

    caseItem.totalDebtCents += balanceCents;
    if (isCritical) {
      caseItem.criticalDebtCents += balanceCents;
      caseItem.criticalChargesCount += 1;
    }
    caseItem.maxDaysOverdue = Math.max(caseItem.maxDaysOverdue, daysOverdue);
    caseItem.totalChargesCount += 1;
    caseItem.charges.push({
      id: r.id,
      concept: r.concept,
      period: r.period,
      dueDate: r.dueDate,
      totalCents: r.totalCents,
      paidCents: r.paidCents,
      balanceCents,
      daysOverdue,
      isCritical,
      playerName: r.playerName,
    });
  }

  return Array.from(byFamily.values()).filter((c) => c.maxDaysOverdue >= thresholdDays);
}

export async function getFamilyDebtForRefinancing(
  ctx: TenantContext,
  familyId: string,
) {
  const today = todayISO();
  const todayMs = new Date(today).getTime();

  const [family] = await db
    .select({
      id: families.id,
      name: families.name,
      contactName: families.contactName,
      contactPhone: families.contactPhone,
    })
    .from(families)
    .where(and(eq(families.id, familyId), eq(families.clubId, ctx.club.id)))
    .limit(1);

  if (!family) return null;

  const rows = await db
    .select({
      id: charges.id,
      concept: charges.concept,
      period: charges.period,
      dueDate: charges.dueDate,
      totalCents: charges.totalCents,
      paidCents: charges.paidCents,
      playerName: sql<string>`(${players.firstName} || ' ' || ${players.lastName})`,
    })
    .from(charges)
    .leftJoin(players, eq(players.id, charges.playerId))
    .where(
      and(
        eq(charges.clubId, ctx.club.id),
        eq(charges.familyId, familyId),
        isNull(charges.voidedAt),
        inArray(charges.status, ["pending", "partial"]),
      ),
    )
    .orderBy(asc(charges.dueDate));

  const chargesList: Overdue90Charge[] = rows.map((r) => {
    const dueMs = new Date(r.dueDate).getTime();
    const daysOverdue = Math.max(0, Math.floor((todayMs - dueMs) / (1000 * 60 * 60 * 24)));
    const balanceCents = Math.max(0, r.totalCents - r.paidCents);
    return {
      id: r.id,
      concept: r.concept,
      period: r.period,
      dueDate: r.dueDate,
      totalCents: r.totalCents,
      paidCents: r.paidCents,
      balanceCents,
      daysOverdue,
      isCritical: daysOverdue >= 90,
      playerName: r.playerName,
    };
  });

  const totalBalanceCents = chargesList.reduce((sum, c) => sum + c.balanceCents, 0);
  const criticalBalanceCents = chargesList
    .filter((c) => c.isCritical)
    .reduce((sum, c) => sum + c.balanceCents, 0);

  return {
    family,
    charges: chargesList,
    totalBalanceCents,
    criticalBalanceCents,
  };
}
