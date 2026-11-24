import "server-only";

import { and, eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import { cache } from "react";
import { db } from "@/db/client";
import {
  coachCategories,
  familyMembers,
  memberships,
  players,
  plans,
  clubs,
} from "@/db/schema";
import type { Permission, Role } from "@/lib/permissions";
import { permissionsForRole } from "@/lib/permissions";
import { getAuth } from "./auth";

export type TenantContext = {
  auth: NonNullable<Awaited<ReturnType<typeof getAuth>>>;
  club: typeof clubs.$inferSelect;
  membership: {
    id: string;
    role: Role;
    status: string;
  };
  role: Role;
  permissions: Set<Permission>;
  plan: typeof plans.$inferSelect | null;
  /** Categorias asignadas (solo entrenadores). */
  coachCategoryIds: string[];
  /** Familias del tutor autenticado. */
  familyIds: string[];
  /** Ficha de jugador del usuario autenticado, si es jugador. */
  playerId: string | null;
};

export class PermissionError extends Error {
  constructor(message = "No tenés permisos para realizar esta acción.") {
    super(message);
    this.name = "PermissionError";
  }
}

/**
 * Contexto de la request: usuario + club activo + rol + alcance de datos.
 * Se memoiza por render para no repetir consultas.
 */
export const getTenant = cache(async (): Promise<TenantContext> => {
  const auth = await getAuth();

  if (!auth) redirect("/login");

  if (!auth.clubId) {
    if (auth.user.isPlatformAdmin) redirect("/admin");
    redirect("/seleccionar-club");
  }

  const membership = auth.memberships.find((m) => m.clubId === auth.clubId);
  if (!membership) redirect("/seleccionar-club");

  const role = membership.role;

  const [clubRow] = await db
    .select()
    .from(clubs)
    .where(eq(clubs.id, membership.clubId))
    .limit(1);

  if (!clubRow) redirect("/seleccionar-club");

  if (clubRow.status === "suspended" || clubRow.status === "cancelled") {
    if (!auth.user.isPlatformAdmin) redirect("/club-suspendido");
  }

  const membershipRow = await db
    .select({ id: memberships.id, role: memberships.role, status: memberships.status })
    .from(memberships)
    .where(
      and(
        eq(memberships.id, membership.id),
        eq(memberships.clubId, clubRow.id),
        eq(memberships.status, "active"),
      ),
    )
    .limit(1);

  if (!membershipRow[0]) redirect("/club-suspendido");

  let plan: typeof plans.$inferSelect | null = null;
  if (clubRow.planId) {
    const [planRow] = await db
      .select()
      .from(plans)
      .where(eq(plans.id, clubRow.planId))
      .limit(1);
    plan = planRow ?? null;
  }

  let coachCategoryIds: string[] = [];
  if (role === "coach") {
    const rows = await db
      .select({ categoryId: coachCategories.categoryId })
      .from(coachCategories)
      .where(
        and(
          eq(coachCategories.membershipId, membershipRow[0].id),
          eq(coachCategories.clubId, clubRow.id),
        ),
      );
    coachCategoryIds = rows.map((r) => r.categoryId);
  }

  let familyIds: string[] = [];
  if (role === "guardian") {
    const rows = await db
      .select({ familyId: familyMembers.familyId })
      .from(familyMembers)
      .where(
        and(
          eq(familyMembers.userId, auth.user.id),
          eq(familyMembers.clubId, clubRow.id),
        ),
      );
    familyIds = [...new Set(rows.map((r) => r.familyId))];
  }

  let playerId: string | null = null;
  if (role === "player") {
    const [row] = await db
      .select({ id: players.id })
      .from(players)
      .where(and(eq(players.userId, auth.user.id), eq(players.clubId, clubRow.id)))
      .limit(1);
    playerId = row?.id ?? null;
  }

  return {
    auth,
    club: clubRow,
    membership: membershipRow[0],
    role,
    permissions: new Set(permissionsForRole(role)),
    plan,
    coachCategoryIds,
    familyIds,
    playerId,
  };
});

export function can(ctx: TenantContext, permission: Permission): boolean {
  return ctx.permissions.has(permission);
}

export function assertCan(ctx: TenantContext, permission: Permission): void {
  if (!can(ctx, permission)) throw new PermissionError();
}

/** El entrenador solo opera sobre las categorias que tiene asignadas. */
export function assertCategoryScope(ctx: TenantContext, categoryId: string): void {
  if (ctx.role === "coach" && !ctx.coachCategoryIds.includes(categoryId)) {
    throw new PermissionError("No tenés asignada esa categoría.");
  }
}

/** Superadministrador de la plataforma (panel /admin). */
export const requirePlatformAdmin = cache(async () => {
  const auth = await getAuth();
  if (!auth) redirect("/login");
  if (!auth.user.isPlatformAdmin) redirect("/app");
  return auth;
});
