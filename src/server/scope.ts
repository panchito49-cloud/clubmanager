import "server-only";

import { eq, inArray, sql, type SQL } from "drizzle-orm";
import { charges, families, players } from "@/db/schema";
import type { TenantContext } from "./tenant";

/**
 * Alcance de datos por rol (row-level scoping).
 *
 * El RBAC define que puede hacer un rol; estas condiciones definen SOBRE QUE
 * filas puede hacerlo. Se aplican en toda consulta de la capa de datos.
 * Si un alcance queda vacio se devuelve `false` (deny by default).
 */

export function playerScope(ctx: TenantContext): SQL {
  if (ctx.role === "club_admin") return sql`true`;

  if (ctx.role === "coach") {
    return ctx.coachCategoryIds.length > 0
      ? inArray(players.categoryId, ctx.coachCategoryIds)
      : sql`false`;
  }

  if (ctx.role === "guardian") {
    return ctx.familyIds.length > 0
      ? inArray(players.familyId, ctx.familyIds)
      : sql`false`;
  }

  return ctx.playerId ? eq(players.id, ctx.playerId) : sql`false`;
}

export function familyScope(ctx: TenantContext): SQL {
  if (ctx.role === "club_admin") return sql`true`;

  if (ctx.role === "coach") {
    if (ctx.coachCategoryIds.length === 0) return sql`false`;
    return sql`${families.id} in (
      select p.family_id from players p
      where p.club_id = ${ctx.club.id}
        and p.category_id in ${sql`(${sql.join(
          ctx.coachCategoryIds.map((id) => sql`${id}`),
          sql`, `,
        )})`}
    )`;
  }

  if (ctx.role === "guardian") {
    return ctx.familyIds.length > 0
      ? inArray(families.id, ctx.familyIds)
      : sql`false`;
  }

  if (!ctx.playerId) return sql`false`;
  return sql`${families.id} = (
    select p.family_id from players p
    where p.id = ${ctx.playerId} and p.club_id = ${ctx.club.id}
  )`;
}

export function chargeScope(ctx: TenantContext): SQL {
  if (ctx.role === "club_admin") return sql`true`;

  if (ctx.role === "coach") {
    if (ctx.coachCategoryIds.length === 0) return sql`false`;
    return sql`${charges.playerId} in (
      select p.id from players p
      where p.club_id = ${ctx.club.id}
        and p.category_id in ${sql`(${sql.join(
          ctx.coachCategoryIds.map((id) => sql`${id}`),
          sql`, `,
        )})`}
    )`;
  }

  if (ctx.role === "guardian") {
    return ctx.familyIds.length > 0
      ? inArray(charges.familyId, ctx.familyIds)
      : sql`false`;
  }

  return ctx.playerId ? eq(charges.playerId, ctx.playerId) : sql`false`;
}

export function categoryScope(ctx: TenantContext, column: any): SQL {
  if (ctx.role === "club_admin") return sql`true`;
  if (ctx.role === "coach") {
    return ctx.coachCategoryIds.length > 0
      ? inArray(column, ctx.coachCategoryIds)
      : sql`false`;
  }
  return sql`true`;
}

/** Verifica que un jugador pertenezca al club y al alcance del usuario. */
export async function assertPlayerVisible(
  ctx: TenantContext,
  playerId: string,
): Promise<void> {
  const [row] = await ctxSafeQuery(ctx, playerId);
  if (!row) throw new Error("Jugador inexistente o fuera de tu alcance.");
}

async function ctxSafeQuery(ctx: TenantContext, playerId: string) {
  const { db } = await import("@/db/client");
  const { and } = await import("drizzle-orm");
  return db
    .select({ id: players.id })
    .from(players)
    .where(and(eq(players.id, playerId), eq(players.clubId, ctx.club.id), playerScope(ctx)))
    .limit(1);
}
