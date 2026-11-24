import "server-only";

import { db } from "@/db/client";
import { auditLogs } from "@/db/schema";

/**
 * Registro de auditoria. Nunca interrumpe la operacion de negocio:
 * si falla el log, se informa en consola pero la accion continua.
 */
export async function writeAudit(input: {
  clubId?: string | null;
  actorUserId?: string | null;
  actorEmail?: string | null;
  action: string;
  entity?: string;
  entityId?: string | null;
  meta?: Record<string, unknown>;
  ip?: string | null;
  userAgent?: string | null;
}): Promise<void> {
  try {
    await db.insert(auditLogs).values({
      clubId: input.clubId ?? null,
      actorUserId: input.actorUserId ?? null,
      actorEmail: input.actorEmail ?? null,
      action: input.action,
      entity: input.entity ?? null,
      entityId: input.entityId ?? null,
      meta: input.meta ?? null,
      ip: input.ip ?? null,
      userAgent: input.userAgent ?? null,
    });
  } catch (error) {
    console.error("[audit] no se pudo registrar el evento", input.action, error);
  }
}
