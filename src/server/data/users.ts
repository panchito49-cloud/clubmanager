import "server-only";

import { and, desc, eq, inArray, sql } from "drizzle-orm";
import { db } from "@/db/client";
import {
  categories,
  coachCategories,
  memberships,
  users,
} from "@/db/schema";
import type { TenantContext } from "@/server/tenant";

export type ClubUser = {
  membershipId: string;
  userId: string;
  email: string;
  fullName: string;
  phone: string | null;
  role: "club_admin" | "coach" | "guardian" | "player";
  status: "active" | "invited" | "disabled";
  userStatus: "active" | "disabled";
  lastLoginAt: Date | null;
  createdAt: Date;
  assignedCategories: { id: string; name: string; gender: string }[];
};

export async function listClubUsers(
  ctx: TenantContext,
  filters: { role?: string; status?: string } = {},
): Promise<ClubUser[]> {
  const where = [eq(memberships.clubId, ctx.club.id)];

  if (filters.role) {
    where.push(eq(memberships.role, filters.role as any));
  }
  if (filters.status) {
    where.push(eq(memberships.status, filters.status as any));
  }

  const rows = await db
    .select({
      membershipId: memberships.id,
      userId: users.id,
      email: users.email,
      fullName: users.fullName,
      phone: users.phone,
      role: memberships.role,
      status: memberships.status,
      userStatus: users.status,
      lastLoginAt: users.lastLoginAt,
      createdAt: memberships.createdAt,
    })
    .from(memberships)
    .innerJoin(users, eq(users.id, memberships.userId))
    .where(and(...where))
    .orderBy(desc(memberships.createdAt))
    .limit(100);

  // Categorías asignadas a entrenadores
  const coachMembershipIds = rows
    .filter((r) => r.role === "coach")
    .map((r) => r.membershipId);

  let coachCatMap = new Map<string, { id: string; name: string; gender: string }[]>();

  if (coachMembershipIds.length > 0) {
    const catRows = await db
      .select({
        membershipId: coachCategories.membershipId,
        categoryId: categories.id,
        categoryName: categories.name,
        categoryGender: categories.gender,
      })
      .from(coachCategories)
      .innerJoin(categories, eq(categories.id, coachCategories.categoryId))
      .where(
        and(
          eq(coachCategories.clubId, ctx.club.id),
          inArray(coachCategories.membershipId, coachMembershipIds),
        ),
      );

    for (const c of catRows) {
      const existing = coachCatMap.get(c.membershipId) || [];
      existing.push({
        id: c.categoryId,
        name: c.categoryName,
        gender: c.categoryGender,
      });
      coachCatMap.set(c.membershipId, existing);
    }
  }

  return rows.map((r) => ({
    ...r,
    assignedCategories: coachCatMap.get(r.membershipId) || [],
  }));
}
