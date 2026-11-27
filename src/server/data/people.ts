import "server-only";

import { and, asc, desc, eq, ilike, inArray, ne, or, sql } from "drizzle-orm";
import { db } from "@/db/client";
import {
  attendance,
  callups,
  categories,
  charges,
  coachCategories,
  families,
  familyMembers,
  matches,
  playerDiscounts,
  players,
  trainings,
} from "@/db/schema";
import { chargeScope, familyScope, playerScope } from "@/server/scope";
import type { TenantContext } from "@/server/tenant";

export const PLAYERS_PAGE_SIZE = 20;

export async function listCategories(ctx: TenantContext) {
  return db
    .select({
      id: categories.id,
      name: categories.name,
      sport: categories.sport,
      birthYearFrom: categories.birthYearFrom,
      birthYearTo: categories.birthYearTo,
      gender: categories.gender,
      sortOrder: categories.sortOrder,
      isActive: categories.isActive,
      playerCount: sql<number>`(
        select count(*) from players p
        where p.category_id = ${categories.id} and p.status = 'active'
      )::int`,
    })
    .from(categories)
    .where(eq(categories.clubId, ctx.club.id))
    .orderBy(asc(categories.sortOrder), asc(categories.name));
}

export async function listPlayers(
  ctx: TenantContext,
  filters: { q?: string; categoryId?: string; status?: string; page?: number },
) {
  const page = Math.max(1, filters.page ?? 1);
  const where = [eq(players.clubId, ctx.club.id), playerScope(ctx)];

  if (filters.q) {
    const term = `%${filters.q.trim()}%`;
    const condition = or(
      ilike(players.firstName, term),
      ilike(players.lastName, term),
      ilike(players.dni, term),
      sql`(${players.firstName} || ' ' || ${players.lastName}) ilike ${term}`,
    );
    if (condition) where.push(condition);
  }

  if (filters.categoryId) where.push(eq(players.categoryId, filters.categoryId));
  if (filters.status === "active" || filters.status === "inactive") {
    where.push(eq(players.status, filters.status));
  }

  const [totalRow] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(players)
    .where(and(...where));

  const rows = await db
    .select({
      id: players.id,
      firstName: players.firstName,
      lastName: players.lastName,
      dni: players.dni,
      birthDate: players.birthDate,
      status: players.status,
      jerseyNumber: players.jerseyNumber,
      position: players.position,
      medicalCertificateExpiresAt: players.medicalCertificateExpiresAt,
      categoryId: players.categoryId,
      categoryName: categories.name,
      familyId: players.familyId,
      familyName: families.name,
      familyPhone: families.contactPhone,
      debtCents: sql<number>`(
        select coalesce(sum(c.total_cents - c.paid_cents), 0)
        from charges c
        where c.player_id = ${players.id}
          and c.status in ('pending','partial')
          and c.voided_at is null
      )::int`,
    })
    .from(players)
    .leftJoin(categories, eq(categories.id, players.categoryId))
    .leftJoin(families, eq(families.id, players.familyId))
    .where(and(...where))
    .orderBy(asc(players.lastName), asc(players.firstName))
    .limit(PLAYERS_PAGE_SIZE)
    .offset((page - 1) * PLAYERS_PAGE_SIZE);

  const total = Number(totalRow?.count ?? 0);

  return {
    rows,
    total,
    page,
    pageSize: PLAYERS_PAGE_SIZE,
    totalPages: Math.max(1, Math.ceil(total / PLAYERS_PAGE_SIZE)),
  };
}

export async function getPlayer(ctx: TenantContext, playerId: string) {
  const [player] = await db
    .select({
      id: players.id,
      firstName: players.firstName,
      lastName: players.lastName,
      dni: players.dni,
      birthDate: players.birthDate,
      gender: players.gender,
      status: players.status,
      jerseyNumber: players.jerseyNumber,
      position: players.position,
      school: players.school,
      address: players.address,
      city: players.city,
      emergencyContactName: players.emergencyContactName,
      emergencyContactPhone: players.emergencyContactPhone,
      bloodType: players.bloodType,
      insuranceProvider: players.insuranceProvider,
      insuranceNumber: players.insuranceNumber,
      medicalCertificateExpiresAt: players.medicalCertificateExpiresAt,
      medicalNotes: players.medicalNotes,
      joinedAt: players.joinedAt,
      userId: players.userId,
      categoryId: players.categoryId,
      categoryName: categories.name,
      familyId: players.familyId,
      familyName: families.name,
      familyPhone: families.contactPhone,
      familyEmail: families.contactEmail,
    })
    .from(players)
    .leftJoin(categories, eq(categories.id, players.categoryId))
    .leftJoin(families, eq(families.id, players.familyId))
    .where(and(eq(players.id, playerId), eq(players.clubId, ctx.club.id), playerScope(ctx)))
    .limit(1);

  if (!player) return null;

  const [chargesRows, discounts, attendanceRows, callupRows] = await Promise.all([
    db
      .select({
        id: charges.id,
        concept: charges.concept,
        period: charges.period,
        dueDate: charges.dueDate,
        totalCents: charges.totalCents,
        paidCents: charges.paidCents,
        status: charges.status,
      })
      .from(charges)
      .where(and(eq(charges.playerId, playerId), eq(charges.clubId, ctx.club.id)))
      .orderBy(desc(charges.dueDate))
      .limit(12),
    db
      .select({
        id: playerDiscounts.id,
        type: playerDiscounts.type,
        value: playerDiscounts.value,
        reason: playerDiscounts.reason,
        startsOn: playerDiscounts.startsOn,
        endsOn: playerDiscounts.endsOn,
        isActive: playerDiscounts.isActive,
      })
      .from(playerDiscounts)
      .where(and(eq(playerDiscounts.playerId, playerId), eq(playerDiscounts.clubId, ctx.club.id)))
      .orderBy(desc(playerDiscounts.createdAt)),
    db
      .select({
        id: attendance.id,
        status: attendance.status,
        startsAt: trainings.startsAt,
        title: trainings.title,
      })
      .from(attendance)
      .innerJoin(trainings, eq(trainings.id, attendance.trainingId))
      .where(and(eq(attendance.playerId, playerId), eq(attendance.clubId, ctx.club.id)))
      .orderBy(desc(trainings.startsAt))
      .limit(10),
    db
      .select({
        id: callups.id,
        status: callups.status,
        rival: matches.rival,
        startsAt: matches.startsAt,
        isHome: matches.isHome,
      })
      .from(callups)
      .innerJoin(matches, eq(matches.id, callups.matchId))
      .where(and(eq(callups.playerId, playerId), eq(callups.clubId, ctx.club.id)))
      .orderBy(desc(matches.startsAt))
      .limit(10),
  ]);

  const present = attendanceRows.filter((row) =>
    ["present", "late", "justified"].includes(row.status),
  ).length;

  return {
    player,
    charges: chargesRows,
    discounts,
    attendance: attendanceRows,
    attendanceRate:
      attendanceRows.length > 0 ? Math.round((present / attendanceRows.length) * 100) : null,
    callups: callupRows,
    hasMedicalAccess: ctx.role === "club_admin" || ctx.role === "coach",
  };
}

export async function listFamilies(
  ctx: TenantContext,
  filters: { q?: string; page?: number },
) {
  const page = Math.max(1, filters.page ?? 1);
  const where = [eq(families.clubId, ctx.club.id), familyScope(ctx)];

  if (filters.q) {
    const term = `%${filters.q.trim()}%`;
    const condition = or(
      ilike(families.name, term),
      ilike(families.contactName, term),
      ilike(families.contactPhone, term),
    );
    if (condition) where.push(condition);
  }

  const [totalRow] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(families)
    .where(and(...where));

  const rows = await db
    .select({
      id: families.id,
      name: families.name,
      contactName: families.contactName,
      contactPhone: families.contactPhone,
      contactEmail: families.contactEmail,
      playerCount: sql<number>`(
        select count(*) from players p where p.family_id = ${families.id}
      )::int`,
      debtCents: sql<number>`(
        select coalesce(sum(c.total_cents - c.paid_cents), 0)
        from charges c
        where c.family_id = ${families.id}
          and c.status in ('pending','partial')
          and c.voided_at is null
      )::int`,
    })
    .from(families)
    .where(and(...where))
    .orderBy(asc(families.name))
    .limit(PLAYERS_PAGE_SIZE)
    .offset((page - 1) * PLAYERS_PAGE_SIZE);

  const total = Number(totalRow?.count ?? 0);

  return {
    rows,
    total,
    page,
    pageSize: PLAYERS_PAGE_SIZE,
    totalPages: Math.max(1, Math.ceil(total / PLAYERS_PAGE_SIZE)),
  };
}

export async function getFamily(ctx: TenantContext, familyId: string) {
  const [family] = await db
    .select()
    .from(families)
    .where(and(eq(families.id, familyId), eq(families.clubId, ctx.club.id), familyScope(ctx)))
    .limit(1);

  if (!family) return null;

  const [members, children, chargesRows] = await Promise.all([
    db
      .select()
      .from(familyMembers)
      .where(and(eq(familyMembers.familyId, familyId), eq(familyMembers.clubId, ctx.club.id)))
      .orderBy(desc(familyMembers.isPrimary)),
    db
      .select({
        id: players.id,
        firstName: players.firstName,
        lastName: players.lastName,
        birthDate: players.birthDate,
        status: players.status,
        categoryName: categories.name,
      })
      .from(players)
      .leftJoin(categories, eq(categories.id, players.categoryId))
      .where(and(eq(players.familyId, familyId), eq(players.clubId, ctx.club.id)))
      .orderBy(asc(players.birthDate)),
    db
      .select({
        id: charges.id,
        concept: charges.concept,
        period: charges.period,
        dueDate: charges.dueDate,
        totalCents: charges.totalCents,
        paidCents: charges.paidCents,
        status: charges.status,
        playerName: sql<string>`(
          select p.first_name || ' ' || p.last_name from players p where p.id = ${charges.playerId}
        )`,
      })
      .from(charges)
      .where(
        and(
          eq(charges.familyId, familyId),
          eq(charges.clubId, ctx.club.id),
          ne(charges.status, "void"),
          chargeScope(ctx),
        ),
      )
      .orderBy(desc(charges.dueDate))
      .limit(24),
  ]);

  return { family, members, players: children, charges: chargesRows };
}

/** Familias para selects (sin paginacion, alcance por rol). */
export async function familyOptions(ctx: TenantContext) {
  return db
    .select({ id: families.id, name: families.name })
    .from(families)
    .where(and(eq(families.clubId, ctx.club.id), familyScope(ctx)))
    .orderBy(asc(families.name));
}

export async function coachOptions(ctx: TenantContext) {
  const { memberships, users } = await import("@/db/schema");
  return db
    .select({
      membershipId: memberships.id,
      name: users.fullName,
    })
    .from(memberships)
    .innerJoin(users, eq(users.id, memberships.userId))
    .where(
      and(
        eq(memberships.clubId, ctx.club.id),
        eq(memberships.role, "coach"),
        eq(memberships.status, "active"),
      ),
    )
    .orderBy(asc(users.fullName));
}

export async function ensureCategoryInClub(ctx: TenantContext, categoryId: string) {
  const [row] = await db
    .select({ id: categories.id })
    .from(categories)
    .where(and(eq(categories.id, categoryId), eq(categories.clubId, ctx.club.id)))
    .limit(1);
  return Boolean(row);
}

/** Categorias asignadas a un entrenador (para pantalla de usuarios). */
export async function coachCategoryIds(ctx: TenantContext, membershipId: string) {
  const rows = await db
    .select({ categoryId: coachCategories.categoryId })
    .from(coachCategories)
    .where(
      and(
        eq(coachCategories.clubId, ctx.club.id),
        eq(coachCategories.membershipId, membershipId),
      ),
    );
  return rows.map((row) => row.categoryId);
}

export async function listPlayersInCategory(ctx: TenantContext, categoryId: string) {
  return db
    .select({ id: players.id, firstName: players.firstName, lastName: players.lastName })
    .from(players)
    .where(
      and(
        eq(players.clubId, ctx.club.id),
        eq(players.categoryId, categoryId),
        eq(players.status, "active"),
        playerScope(ctx),
      ),
    )
    .orderBy(asc(players.lastName));
}

export async function familyChargeSummary(ctx: TenantContext, familyId: string) {
  const [row] = await db
    .select({
      outstanding: sql<number>`coalesce(sum(${charges.totalCents} - ${charges.paidCents}), 0)::int`,
      overdue: sql<number>`coalesce(sum(case when ${charges.dueDate} < current_date then ${charges.totalCents} - ${charges.paidCents} else 0 end), 0)::int`,
    })
    .from(charges)
    .where(
      and(
        eq(charges.clubId, ctx.club.id),
        eq(charges.familyId, familyId),
        inArray(charges.status, ["pending", "partial"]),
      ),
    );
  return {
    outstandingCents: Number(row?.outstanding ?? 0),
    overdueCents: Number(row?.overdue ?? 0),
  };
}
