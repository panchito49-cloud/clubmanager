import fs from "node:fs";
import path from "node:path";
import { execSync } from "node:child_process";

async function main() {
  const pgliteDir = path.resolve(process.cwd(), process.env.PGLITE_DIR ?? ".data/pglite");

  if (fs.existsSync(pgliteDir)) {
    console.log(`Eliminando base de datos local en ${pgliteDir}...`);
    fs.rmSync(pgliteDir, { recursive: true, force: true });
  }

  console.log("Ejecutando migraciones...");
  execSync("npm run db:migrate", { stdio: "inherit" });

  console.log("Ejecutando seed con 16 categorías...");
  execSync("npm run db:seed", { stdio: "inherit" });

  console.log("Reset completado con éxito.");
}

main().catch((err) => {
  console.error("Error en reset:", err);
  process.exit(1);
});
