import fs from "node:fs";
import path from "node:path";
import { sql } from "drizzle-orm";
import { closeDb, db } from "../src/db/client";

/**
 * Aplicador de migraciones idempotente.
 * Funciona igual con PGlite (desarrollo) y con PostgreSQL (produccion).
 *
 * Uso: npm run db:migrate
 */

type Journal = {
  entries: Array<{ idx: number; tag: string; when: number }>;
};

async function execRaw(statement: string) {
  const client = db.$client as unknown as {
    exec?: (sql: string) => Promise<unknown>;
    unsafe?: (sql: string) => Promise<unknown>;
  };

  if (typeof client.exec === "function") {
    await client.exec(statement);
    return;
  }
  if (typeof client.unsafe === "function") {
    await client.unsafe(statement);
    return;
  }
  throw new Error("Cliente de base de datos no soportado por el migrador");
}

async function main() {
  const root = process.cwd();
  const journalPath = path.join(root, "drizzle", "meta", "_journal.json");

  if (!fs.existsSync(journalPath)) {
    throw new Error(
      "No se encontro drizzle/meta/_journal.json. Ejecutá primero: npm run db:generate",
    );
  }

  const journal = JSON.parse(fs.readFileSync(journalPath, "utf8")) as Journal;

  await execRaw(
    `create table if not exists app_migrations (
       tag text primary key,
       applied_at timestamptz not null default now()
     )`,
  );

  const applied = new Set<string>();
  const result = (await db.execute(
    sql`select tag from app_migrations`,
  )) as unknown as { rows: Array<{ tag: string }> };
  for (const row of result.rows ?? []) applied.add(row.tag);

  let count = 0;
  for (const entry of journal.entries.sort((a, b) => a.idx - b.idx)) {
    if (applied.has(entry.tag)) continue;

    const file = path.join(root, "drizzle", `${entry.tag}.sql`);
    if (!fs.existsSync(file)) {
      throw new Error(`Falta el archivo de migracion ${file}`);
    }

    const content = fs.readFileSync(file, "utf8");
    const statements = content
      .split("--> statement-breakpoint")
      .map((s) => s.trim())
      .filter(Boolean);

    console.log(`Aplicando ${entry.tag} (${statements.length} sentencias)...`);
    for (const statement of statements) {
      await execRaw(statement);
    }

    await execRaw(
      `insert into app_migrations (tag) values ('${entry.tag.replace(/'/g, "''")}')`,
    );
    count += 1;
  }

  console.log(
    count === 0
      ? "Base de datos al dia. No hay migraciones pendientes."
      : `Listo: ${count} migracion(es) aplicada(s).`,
  );
}

main()
  .catch((error) => {
    console.error("Error aplicando migraciones:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await closeDb();
  });
