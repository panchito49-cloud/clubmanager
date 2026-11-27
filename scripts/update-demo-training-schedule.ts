import { and, eq, gte } from "drizzle-orm";
import { closeDb, db } from "../src/db/client";
import { categories, clubs, trainings } from "../src/db/schema";

const DEMO_SLUG = "barrio-norte-demo";
const LOCATION = "Estadio cubierto - Cancha 1";
const WEEKS_TO_SCHEDULE = 4;

type TrainingSlot = {
  weekday: number; // Sunday = 0
  category: "Escuelita" | "Pre Mini" | "U11" | "U13" | "U15" | "U17" | "Primera";
  gender?: "male" | "female";
  start: string;
  end: string;
  label: string;
};

const slots: TrainingSlot[] = [
  { weekday: 1, category: "U15", start: "16:30", end: "18:00", label: "U15" },
  { weekday: 1, category: "Escuelita", start: "18:00", end: "19:00", label: "U7" },
  { weekday: 1, category: "Pre Mini", start: "19:00", end: "20:00", label: "U9" },
  { weekday: 1, category: "U13", start: "20:00", end: "21:00", label: "U13" },
  { weekday: 1, category: "U17", start: "21:00", end: "22:30", label: "U17" },
  { weekday: 2, category: "U11", start: "18:00", end: "19:30", label: "U11" },
  { weekday: 2, category: "Primera", gender: "female", start: "19:30", end: "21:00", label: "1ra Femenina" },
  { weekday: 2, category: "Primera", gender: "male", start: "21:00", end: "22:30", label: "1ra Masculina" },
  { weekday: 3, category: "U15", start: "16:30", end: "18:00", label: "U15" },
  { weekday: 3, category: "Escuelita", start: "18:00", end: "19:00", label: "U7" },
  { weekday: 3, category: "Pre Mini", start: "19:00", end: "20:00", label: "U9" },
  { weekday: 3, category: "U13", start: "20:00", end: "21:00", label: "U13" },
  { weekday: 3, category: "U17", start: "21:00", end: "22:30", label: "U17" },
  { weekday: 4, category: "U11", start: "18:00", end: "19:30", label: "U11" },
  { weekday: 4, category: "Primera", gender: "female", start: "19:30", end: "21:00", label: "1ra Femenina" },
  { weekday: 4, category: "Primera", gender: "male", start: "21:00", end: "22:30", label: "1ra Masculina" },
  { weekday: 5, category: "U15", start: "16:30", end: "18:00", label: "U15" },
  { weekday: 5, category: "U11", start: "18:00", end: "19:30", label: "U11-U13" },
  { weekday: 5, category: "U13", start: "18:00", end: "19:30", label: "U11-U13" },
  { weekday: 5, category: "U17", start: "19:30", end: "21:00", label: "U17" },
  { weekday: 5, category: "Primera", gender: "male", start: "21:00", end: "22:30", label: "1ra Masculina" },
];

function atArgentinaLocal(date: Date, time: string): Date {
  const datePart = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
  return new Date(`${datePart}T${time}:00-03:00`);
}

async function main() {
  const [club] = await db
    .select({ id: clubs.id, name: clubs.name })
    .from(clubs)
    .where(eq(clubs.slug, DEMO_SLUG))
    .limit(1);

  if (!club) throw new Error(`No existe el club demo con slug ${DEMO_SLUG}.`);

  const categoryRows = await db
    .select({ id: categories.id, name: categories.name, gender: categories.gender })
    .from(categories)
    .where(eq(categories.clubId, club.id));
  const categoryIds = new Map(categoryRows.map((row) => [`${row.name}:${row.gender}`, row.id]));

  const now = new Date();
  const firstDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const scheduleRows: Array<typeof trainings.$inferInsert> = [];

  for (let offset = 0; offset < WEEKS_TO_SCHEDULE * 7; offset += 1) {
    const date = new Date(firstDate);
    date.setDate(firstDate.getDate() + offset);

    for (const slot of slots.filter((item) => item.weekday === date.getDay())) {
      const startAt = atArgentinaLocal(date, slot.start);
      if (startAt <= now) continue;

      const genders = slot.gender ? [slot.gender] : ["male", "female"] as const;
      for (const gender of genders) {
        const categoryId = categoryIds.get(`${slot.category}:${gender}`);
        if (!categoryId) {
          throw new Error(`Falta la categoría ${slot.category} (${gender}) en el club demo.`);
        }
        scheduleRows.push({
          clubId: club.id,
          categoryId,
          title: `Entrenamiento ${slot.label}`,
          startsAt: startAt,
          endsAt: atArgentinaLocal(date, slot.end),
          location: LOCATION,
          notes: "Horario de demostración basado en la grilla de entrenamientos 2026.",
          status: "scheduled",
        });
      }
    }
  }

  await db.transaction(async (tx) => {
    await tx
      .delete(trainings)
      .where(
        and(
          eq(trainings.clubId, club.id),
          eq(trainings.status, "scheduled"),
          gte(trainings.startsAt, now),
        ),
      );

    if (scheduleRows.length > 0) await tx.insert(trainings).values(scheduleRows);
  });

  console.log(`Agenda demo actualizada: ${scheduleRows.length} sesiones futuras para ${club.name}.`);
}

main()
  .catch((error) => {
    console.error("No se pudo actualizar la agenda demo:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await closeDb();
  });
