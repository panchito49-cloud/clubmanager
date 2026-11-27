import "server-only";

import { and, asc, desc, eq, gte, lte, sql } from "drizzle-orm";
import { db } from "@/db/client";
import {
  attendance,
  callups,
  categories,
  matches,
  memberships,
  players,
  trainings,
  tripPassengers,
  trips,
  users,
} from "@/db/schema";
import { categoryScope } from "@/server/scope";
import type { TenantContext } from "@/server/tenant";

export type TrainingFilters = {
  categoryId?: string;
  from?: string;
  to?: string;
  status?: string;
};

export async function listTrainings(ctx: TenantContext, filters: TrainingFilters = {}) {
  const where = [
    eq(trainings.clubId, ctx.club.id),
    categoryScope(ctx, trainings.categoryId),
  ];

  if (filters.categoryId) {
    where.push(eq(trainings.categoryId, filters.categoryId));
  }
  if (filters.status) {
    where.push(eq(trainings.status, filters.status as any));
  }
  if (filters.from) {
    where.push(gte(trainings.startsAt, new Date(`${filters.from}T00:00:00Z`)));
  }
  if (filters.to) {
    where.push(lte(trainings.startsAt, new Date(`${filters.to}T23:59:59Z`)));
  }

  const rows = await db
    .select({
      id: trainings.id,
      title: trainings.title,
      startsAt: trainings.startsAt,
      endsAt: trainings.endsAt,
      location: trainings.location,
      notes: trainings.notes,
      status: trainings.status,
      categoryId: trainings.categoryId,
      categoryName: categories.name,
      categoryGender: categories.gender,
      coachName: users.fullName,
      totalPlayers: sql<number>`(
        select count(*) from players p
        where p.category_id = ${trainings.categoryId} and p.status = 'active'
      )::int`,
      presentCount: sql<number>`(
        select count(*) from attendance a
        where a.training_id = ${trainings.id} and a.status in ('present', 'late')
      )::int`,
      recordedCount: sql<number>`(
        select count(*) from attendance a
        where a.training_id = ${trainings.id}
      )::int`,
    })
    .from(trainings)
    .innerJoin(categories, eq(categories.id, trainings.categoryId))
    .leftJoin(memberships, eq(memberships.id, trainings.coachMembershipId))
    .leftJoin(users, eq(users.id, memberships.userId))
    .where(and(...where))
    .orderBy(desc(trainings.startsAt))
    .limit(50);

  return rows;
}

export async function getTraining(ctx: TenantContext, trainingId: string) {
  const [training] = await db
    .select({
      id: trainings.id,
      title: trainings.title,
      startsAt: trainings.startsAt,
      endsAt: trainings.endsAt,
      location: trainings.location,
      notes: trainings.notes,
      status: trainings.status,
      categoryId: trainings.categoryId,
      categoryName: categories.name,
      categoryGender: categories.gender,
      coachName: users.fullName,
      coachMembershipId: trainings.coachMembershipId,
    })
    .from(trainings)
    .innerJoin(categories, eq(categories.id, trainings.categoryId))
    .leftJoin(memberships, eq(memberships.id, trainings.coachMembershipId))
    .leftJoin(users, eq(users.id, memberships.userId))
    .where(
      and(
        eq(trainings.id, trainingId),
        eq(trainings.clubId, ctx.club.id),
        categoryScope(ctx, trainings.categoryId),
      ),
    )
    .limit(1);

  if (!training) return null;

  // Jugadores de la categoría y su asistencia registrada
  const roster = await db
    .select({
      id: players.id,
      firstName: players.firstName,
      lastName: players.lastName,
      jerseyNumber: players.jerseyNumber,
      birthDate: players.birthDate,
      position: players.position,
      medicalCertificateExpiresAt: players.medicalCertificateExpiresAt,
      attendanceStatus: attendance.status,
      attendanceNote: attendance.note,
    })
    .from(players)
    .leftJoin(
      attendance,
      and(eq(attendance.playerId, players.id), eq(attendance.trainingId, training.id)),
    )
    .where(
      and(
        eq(players.clubId, ctx.club.id),
        eq(players.categoryId, training.categoryId),
        eq(players.status, "active"),
      ),
    )
    .orderBy(asc(players.lastName), asc(players.firstName));

  return { training, roster };
}

export async function getAttendanceHubData(ctx: TenantContext) {
  const where = [
    eq(trainings.clubId, ctx.club.id),
    categoryScope(ctx, trainings.categoryId),
  ];

  // Listado de sesiones recientes
  const recentTrainings = await db
    .select({
      id: trainings.id,
      title: trainings.title,
      startsAt: trainings.startsAt,
      endsAt: trainings.endsAt,
      location: trainings.location,
      notes: trainings.notes,
      status: trainings.status,
      categoryId: trainings.categoryId,
      categoryName: categories.name,
      categoryGender: categories.gender,
      coachName: users.fullName,
      totalPlayers: sql<number>`(
        select count(*) from players p
        where p.category_id = ${trainings.categoryId} and p.status = 'active'
      )::int`,
      presentCount: sql<number>`(
        select count(*) from attendance a
        where a.training_id = ${trainings.id} and a.status in ('present', 'late')
      )::int`,
      absentCount: sql<number>`(
        select count(*) from attendance a
        where a.training_id = ${trainings.id} and a.status = 'absent'
      )::int`,
      recordedCount: sql<number>`(
        select count(*) from attendance a
        where a.training_id = ${trainings.id}
      )::int`,
    })
    .from(trainings)
    .innerJoin(categories, eq(categories.id, trainings.categoryId))
    .leftJoin(memberships, eq(memberships.id, trainings.coachMembershipId))
    .leftJoin(users, eq(users.id, memberships.userId))
    .where(and(...where))
    .orderBy(desc(trainings.startsAt))
    .limit(20);

  // Categorías activas accesibles por el usuario
  const accessibleCategories = await db
    .select({
      id: categories.id,
      name: categories.name,
      gender: categories.gender,
      sport: categories.sport,
    })
    .from(categories)
    .where(
      and(
        eq(categories.clubId, ctx.club.id),
        eq(categories.isActive, true),
        categoryScope(ctx, categories.id),
      ),
    )
    .orderBy(asc(categories.name));

  // Métricas globales de asistencia
  const totalSessions = recentTrainings.length;
  let totalPresent = 0;
  let totalRecorded = 0;

  for (const t of recentTrainings) {
    totalPresent += t.presentCount;
    totalRecorded += t.recordedCount;
  }

  const averageAttendancePct =
    totalRecorded > 0 ? Math.round((totalPresent / totalRecorded) * 100) : 0;

  return {
    recentTrainings,
    accessibleCategories,
    stats: {
      totalSessions,
      totalPresent,
      totalRecorded,
      averageAttendancePct,
    },
  };
}

export type MatchFilters = {
  categoryId?: string;
  status?: string;
};

export async function listMatches(ctx: TenantContext, filters: MatchFilters = {}) {
  const where = [
    eq(matches.clubId, ctx.club.id),
    categoryScope(ctx, matches.categoryId),
  ];

  if (filters.categoryId) {
    where.push(eq(matches.categoryId, filters.categoryId));
  }
  if (filters.status) {
    where.push(eq(matches.status, filters.status as any));
  }

  const rows = await db
    .select({
      id: matches.id,
      rival: matches.rival,
      startsAt: matches.startsAt,
      location: matches.location,
      isHome: matches.isHome,
      status: matches.status,
      ourScore: matches.ourScore,
      rivalScore: matches.rivalScore,
      notes: matches.notes,
      categoryId: matches.categoryId,
      categoryName: categories.name,
      categoryGender: categories.gender,
      coachName: users.fullName,
      callupCount: sql<number>`(
        select count(*) from callups c
        where c.match_id = ${matches.id}
      )::int`,
      confirmedCount: sql<number>`(
        select count(*) from callups c
        where c.match_id = ${matches.id} and c.status = 'confirmed'
      )::int`,
    })
    .from(matches)
    .innerJoin(categories, eq(categories.id, matches.categoryId))
    .leftJoin(memberships, eq(memberships.id, matches.coachMembershipId))
    .leftJoin(users, eq(users.id, memberships.userId))
    .where(and(...where))
    .orderBy(desc(matches.startsAt))
    .limit(50);

  return rows;
}

export async function getMatchesHubData(ctx: TenantContext, filters: MatchFilters = {}) {
  const matchesList = await listMatches(ctx, filters);

  const played = matchesList.filter((m) => m.status === "played" && m.ourScore !== null && m.rivalScore !== null);
  const upcoming = matchesList.filter((m) => m.status === "scheduled");

  let wonCount = 0;
  let lostCount = 0;
  let tieCount = 0;
  let totalPointsFor = 0;
  let totalPointsAgainst = 0;

  for (const m of played) {
    const us = m.ourScore ?? 0;
    const them = m.rivalScore ?? 0;
    totalPointsFor += us;
    totalPointsAgainst += them;
    if (us > them) wonCount++;
    else if (us < them) lostCount++;
    else tieCount++;
  }

  const playedCount = played.length;
  const winRatePct = playedCount > 0 ? Math.round((wonCount / playedCount) * 100) : 0;
  const avgPointsFor = playedCount > 0 ? Math.round(totalPointsFor / playedCount) : 0;
  const avgPointsAgainst = playedCount > 0 ? Math.round(totalPointsAgainst / playedCount) : 0;

  return {
    matches: matchesList,
    stats: {
      totalCount: matchesList.length,
      playedCount,
      upcomingCount: upcoming.length,
      wonCount,
      lostCount,
      tieCount,
      totalPointsFor,
      totalPointsAgainst,
      winRatePct,
      avgPointsFor,
      avgPointsAgainst,
    },
  };
}

export async function getMatch(ctx: TenantContext, matchId: string) {
  const [match] = await db
    .select({
      id: matches.id,
      rival: matches.rival,
      startsAt: matches.startsAt,
      location: matches.location,
      isHome: matches.isHome,
      status: matches.status,
      ourScore: matches.ourScore,
      rivalScore: matches.rivalScore,
      notes: matches.notes,
      categoryId: matches.categoryId,
      categoryName: categories.name,
      categoryGender: categories.gender,
      coachName: users.fullName,
      coachMembershipId: matches.coachMembershipId,
    })
    .from(matches)
    .innerJoin(categories, eq(categories.id, matches.categoryId))
    .leftJoin(memberships, eq(memberships.id, matches.coachMembershipId))
    .leftJoin(users, eq(users.id, memberships.userId))
    .where(
      and(
        eq(matches.id, matchId),
        eq(matches.clubId, ctx.club.id),
        categoryScope(ctx, matches.categoryId),
      ),
    )
    .limit(1);

  if (!match) return null;

  // Jugadores convocados y disponibles en la categoría
  const playerRows = await db
    .select({
      id: players.id,
      firstName: players.firstName,
      lastName: players.lastName,
      dni: players.dni,
      birthDate: players.birthDate,
      jerseyNumber: players.jerseyNumber,
      position: players.position,
      medicalCertificateExpiresAt: players.medicalCertificateExpiresAt,
      emergencyContactPhone: players.emergencyContactPhone,
      callupStatus: callups.status,
      callupNote: callups.note,
      callupId: callups.id,
    })
    .from(players)
    .leftJoin(callups, and(eq(callups.playerId, players.id), eq(callups.matchId, match.id)))
    .where(
      and(
        eq(players.clubId, ctx.club.id),
        eq(players.categoryId, match.categoryId),
        eq(players.status, "active"),
      ),
    )
    .orderBy(asc(players.lastName), asc(players.firstName));

  return { match, players: playerRows };
}

export async function listTrips(ctx: TenantContext) {
  const where = [
    eq(trips.clubId, ctx.club.id),
  ];

  const rows = await db
    .select({
      id: trips.id,
      title: trips.title,
      destination: trips.destination,
      departureAt: trips.departureAt,
      returnAt: trips.returnAt,
      transport: trips.transport,
      costCents: trips.costCents,
      seats: trips.seats,
      status: trips.status,
      categoryId: trips.categoryId,
      categoryName: categories.name,
      categoryGender: categories.gender,
      passengerCount: sql<number>`(
        select count(*) from trip_passengers tp
        where tp.trip_id = ${trips.id}
      )::int`,
      authorizedCount: sql<number>`(
        select count(*) from trip_passengers tp
        where tp.trip_id = ${trips.id} and tp.authorization_status = 'granted'
      )::int`,
      paidCount: sql<number>`(
        select count(*) from trip_passengers tp
        where tp.trip_id = ${trips.id} and tp.payment_status = 'paid'
      )::int`,
    })
    .from(trips)
    .leftJoin(categories, eq(categories.id, trips.categoryId))
    .where(and(...where))
    .orderBy(desc(trips.departureAt))
    .limit(50);

  return rows;
}

export async function getTrip(ctx: TenantContext, tripId: string) {
  const [trip] = await db
    .select({
      id: trips.id,
      title: trips.title,
      destination: trips.destination,
      departureAt: trips.departureAt,
      returnAt: trips.returnAt,
      transport: trips.transport,
      costCents: trips.costCents,
      seats: trips.seats,
      status: trips.status,
      notes: trips.notes,
      authorizationRequired: trips.authorizationRequired,
      categoryId: trips.categoryId,
      categoryName: categories.name,
      categoryGender: categories.gender,
    })
    .from(trips)
    .leftJoin(categories, eq(categories.id, trips.categoryId))
    .where(and(eq(trips.id, tripId), eq(trips.clubId, ctx.club.id)))
    .limit(1);

  if (!trip) return null;

  const passengers = await db
    .select({
      id: tripPassengers.id,
      playerId: players.id,
      firstName: players.firstName,
      lastName: players.lastName,
      jerseyNumber: players.jerseyNumber,
      dni: players.dni,
      emergencyContactName: players.emergencyContactName,
      emergencyContactPhone: players.emergencyContactPhone,
      medicalCertificateExpiresAt: players.medicalCertificateExpiresAt,
      status: tripPassengers.status,
      paymentStatus: tripPassengers.paymentStatus,
      paymentNote: tripPassengers.paymentNote,
      authorizationStatus: tripPassengers.authorizationStatus,
      authorizedAt: tripPassengers.authorizedAt,
      note: tripPassengers.note,
    })
    .from(tripPassengers)
    .innerJoin(players, eq(players.id, tripPassengers.playerId))
    .where(and(eq(tripPassengers.tripId, trip.id), eq(tripPassengers.clubId, ctx.club.id)))
    .orderBy(asc(players.lastName), asc(players.firstName));

  return { trip, passengers };
}
