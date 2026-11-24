import fs from "node:fs";
import path from "node:path";
import { PGlite } from "@electric-sql/pglite";
import type { PgliteDatabase } from "drizzle-orm/pglite";
import { drizzle as drizzlePglite } from "drizzle-orm/pglite";
import { drizzle as drizzlePostgres } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

/**
 * Conexion a base de datos.
 *
 * - Desarrollo local: PGlite (PostgreSQL compilado a WASM, persistido en disco).
 *   No requiere servidor ni Docker y ejecuta el mismo SQL que produccion.
 * - Produccion: PostgreSQL gestionado mediante DATABASE_URL.
 *
 * Este modulo NO importa "server-only" porque los scripts de migracion/seed lo
 * reutilizan fuera de React. Solo debe importarse desde codigo de servidor.
 */

export type Database = PgliteDatabase<typeof schema> & {
  $client: { close?: () => Promise<void> };
};

const globalForDb = globalThis as unknown as {
  __clubmanagerDb?: Database;
};

function createDatabase(): Database {
  const url = process.env.DATABASE_URL?.trim();

  if (url) {
    const client = postgres(url, {
      max: Number(process.env.DATABASE_POOL_MAX ?? 10),
      idle_timeout: 20,
      connect_timeout: 10,
    });

    // Ambas implementaciones comparten la misma API de consulta de Drizzle.
    return drizzlePostgres(client, {
      schema,
      casing: "snake_case",
    }) as unknown as Database;
  }

  const dir = path.resolve(process.cwd(), process.env.PGLITE_DIR ?? ".data/pglite");
  fs.mkdirSync(dir, { recursive: true });

  const client = new PGlite(dir);

  return drizzlePglite(client, {
    schema,
    casing: "snake_case",
  }) as unknown as Database;
}

export const db: Database = globalForDb.__clubmanagerDb ?? createDatabase();

if (process.env.NODE_ENV !== "production") {
  globalForDb.__clubmanagerDb = db;
}

/** Cierra la conexion (scripts y procesos de larga duracion). */
export async function closeDb(): Promise<void> {
  await db.$client.close?.();
}
