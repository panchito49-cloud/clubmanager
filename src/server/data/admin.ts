import "server-only";

import { desc, eq, sql } from "drizzle-orm";
import { db } from "@/db/client";
import {
  clubs,
  memberships,
  plans,
  players,
  subscriptions,
  users,
} from "@/db/schema";
import { requirePlatformAdmin } from "@/server/tenant";

export async function getPlatformMetrics() {
  await requirePlatformAdmin();

  const [clubMetrics] = await db
    .select({
      totalClubs: sql<number>`count(*)::int`,
      activeClubs: sql<number>`count(case when ${clubs.status} = 'active' then 1 end)::int`,
      trialClubs: sql<number>`count(case when ${clubs.status} = 'trial' then 1 end)::int`,
      suspendedClubs: sql<number>`count(case when ${clubs.status} = 'suspended' then 1 end)::int`,
    })
    .from(clubs);

  const [userMetrics] = await db
    .select({
      totalUsers: sql<number>`count(*)::int`,
    })
    .from(users);

  const [playerMetrics] = await db
    .select({
      totalPlayers: sql<number>`count(*)::int`,
      activePlayers: sql<number>`count(case when ${players.status} = 'active' then 1 end)::int`,
    })
    .from(players);

  // Ingreso Mensual Recurrente (MRR) estimado de suscripciones activas
  const [mrrRow] = await db
    .select({
      mrrCents: sql<number>`coalesce(sum(${subscriptions.amountCents}), 0)::bigint`,
    })
    .from(subscriptions)
    .where(eq(subscriptions.status, "active"));

  return {
    totalClubs: clubMetrics?.totalClubs ?? 0,
    activeClubs: clubMetrics?.activeClubs ?? 0,
    trialClubs: clubMetrics?.trialClubs ?? 0,
    suspendedClubs: clubMetrics?.suspendedClubs ?? 0,
    totalUsers: userMetrics?.totalUsers ?? 0,
    totalPlayers: playerMetrics?.totalPlayers ?? 0,
    activePlayers: playerMetrics?.activePlayers ?? 0,
    mrrCents: Number(mrrRow?.mrrCents ?? 0),
  };
}

export async function listAllClubs() {
  await requirePlatformAdmin();

  const rows = await db
    .select({
      id: clubs.id,
      slug: clubs.slug,
      name: clubs.name,
      city: clubs.city,
      province: clubs.province,
      status: clubs.status,
      discipline: clubs.discipline,
      createdAt: clubs.createdAt,
      planId: clubs.planId,
      planName: plans.name,
      planPriceCents: plans.priceCents,
      playerCount: sql<number>`(
        select count(*) from players p where p.club_id = ${clubs.id} and p.status = 'active'
      )::int`,
      adminCount: sql<number>`(
        select count(*) from memberships m
        where m.club_id = ${clubs.id} and m.role = 'club_admin' and m.status = 'active'
      )::int`,
      subscriptionStatus: subscriptions.status,
    })
    .from(clubs)
    .leftJoin(plans, eq(plans.id, clubs.planId))
    .leftJoin(subscriptions, eq(subscriptions.clubId, clubs.id))
    .orderBy(desc(clubs.createdAt));

  return rows;
}

export async function listAllPlans() {
  await requirePlatformAdmin();

  const rows = await db
    .select({
      id: plans.id,
      code: plans.code,
      name: plans.name,
      description: plans.description,
      priceCents: plans.priceCents,
      maxPlayers: plans.maxPlayers,
      maxAdmins: plans.maxAdmins,
      isActive: plans.isActive,
      sortOrder: plans.sortOrder,
      clubCount: sql<number>`(
        select count(*) from clubs c where c.plan_id = ${plans.id}
      )::int`,
    })
    .from(plans)
    .orderBy(plans.sortOrder);

  return rows;
}

export async function listAllPlatformUsers() {
  await requirePlatformAdmin();

  const rows = await db
    .select({
      id: users.id,
      email: users.email,
      fullName: users.fullName,
      phone: users.phone,
      status: users.status,
      isPlatformAdmin: users.isPlatformAdmin,
      lastLoginAt: users.lastLoginAt,
      createdAt: users.createdAt,
      clubsCount: sql<number>`(
        select count(*) from memberships m where m.user_id = ${users.id} and m.status = 'active'
      )::int`,
    })
    .from(users)
    .orderBy(desc(users.createdAt))
    .limit(100);

  return rows;
}
