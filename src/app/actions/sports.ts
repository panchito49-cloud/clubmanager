"use server";

import { redirect } from "next/navigation";
import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db/client";
import {
  attendance,
  callups,
  categories,
  matches,
  trainings,
  tripPassengers,
  trips,
} from "@/db/schema";
import { writeAudit } from "@/server/audit";
import { assertCan, getTenant } from "@/server/tenant";

export type SportsFormState = { error?: string; ok?: string } | null;

const trainingSchema = z.object({
  title: z.string().trim().min(1, "El título es obligatorio").max(120),
  categoryId: z.string().uuid("Seleccioná una categoría válida"),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Fecha inválida"),
  time: z.string().regex(/^\d{2}:\d{2}$/, "Hora inválida"),
  location: z.string().trim().max(160).optional(),
  notes: z.string().trim().max(500).optional(),
});

export async function createTrainingAction(
  _prev: SportsFormState,
  formData: FormData,
): Promise<SportsFormState> {
  const ctx = await getTenant();
  assertCan(ctx, "trainings.manage");

  const parsed = trainingSchema.safeParse({
    title: formData.get("title"),
    categoryId: formData.get("categoryId"),
    date: formData.get("date"),
    time: formData.get("time"),
    location: formData.get("location") || undefined,
    notes: formData.get("notes") || undefined,
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Revisá los datos ingresados." };
  }

  // Argentina UTC-3
  const startsAt = new Date(`${parsed.data.date}T${parsed.data.time}:00-03:00`);

  try {
    const [row] = await db
      .insert(trainings)
      .values({
        clubId: ctx.club.id,
        categoryId: parsed.data.categoryId,
        coachMembershipId: ctx.membership.id,
        title: parsed.data.title,
        startsAt,
        location: parsed.data.location ?? null,
        notes: parsed.data.notes ?? null,
        status: "scheduled",
        createdByUserId: ctx.auth.user.id,
      })
      .returning({ id: trainings.id });

    await writeAudit({
      clubId: ctx.club.id,
      actorUserId: ctx.auth.user.id,
      actorEmail: ctx.auth.user.email,
      action: "training.created",
      entity: "training",
      entityId: row.id,
    });

    redirect(`/app/calendario/${row.id}?ok=${encodeURIComponent("Entrenamiento creado. Ya podés registrar la asistencia.")}`);
  } catch (error) {
    if (error instanceof Error && error.message.startsWith("NEXT_REDIRECT")) throw error;
    console.error("[sports.createTraining]", error);
    return { error: "No se pudo crear el entrenamiento." };
  }
}

export async function recordAttendanceAction(formData: FormData): Promise<void> {
  const ctx = await getTenant();
  assertCan(ctx, "attendance.record");

  const trainingId = String(formData.get("trainingId") ?? "");
  const playerId = String(formData.get("playerId") ?? "");
  const status = String(formData.get("status") ?? "") as "present" | "absent" | "late" | "justified";

  if (!["present", "absent", "late", "justified"].includes(status)) {
    throw new Error("Estado de asistencia inválido");
  }

  await db
    .insert(attendance)
    .values({
      clubId: ctx.club.id,
      trainingId,
      playerId,
      status,
      recordedByUserId: ctx.auth.user.id,
      recordedAt: new Date(),
    })
    .onConflictDoUpdate({
      target: [attendance.trainingId, attendance.playerId],
      set: {
        status,
        recordedByUserId: ctx.auth.user.id,
        recordedAt: new Date(),
      },
    });

  // Marcar el entrenamiento como completado si aún estaba como scheduled
  await db
    .update(trainings)
    .set({ status: "completed" })
    .where(and(eq(trainings.id, trainingId), eq(trainings.clubId, ctx.club.id)));
}

export async function recordAttendanceQuickAction(
  trainingId: string,
  playerId: string,
  status: "present" | "absent" | "late" | "justified",
  note?: string,
): Promise<{ success: boolean; status: string; error?: string }> {
  try {
    const ctx = await getTenant();
    assertCan(ctx, "attendance.record");

    await db
      .insert(attendance)
      .values({
        clubId: ctx.club.id,
        trainingId,
        playerId,
        status,
        note: note ?? null,
        recordedByUserId: ctx.auth.user.id,
        recordedAt: new Date(),
      })
      .onConflictDoUpdate({
        target: [attendance.trainingId, attendance.playerId],
        set: {
          status,
          note: note !== undefined ? (note ? note : null) : attendance.note,
          recordedByUserId: ctx.auth.user.id,
          recordedAt: new Date(),
        },
      });

    return { success: true, status };
  } catch (error) {
    console.error("[sports.recordAttendanceQuickAction]", error);
    return { success: false, status, error: "Error al registrar la asistencia" };
  }
}

export async function startExpressTrainingAction(formData: FormData): Promise<void> {
  const ctx = await getTenant();
  assertCan(ctx, "trainings.manage");

  const categoryId = String(formData.get("categoryId") ?? "");
  const location = String(formData.get("location") || "Estadio Centenario - Cancha 1");

  if (!categoryId) {
    throw new Error("Categoría requerida");
  }

  const [category] = await db
    .select({ name: categories.name })
    .from(categories)
    .where(and(eq(categories.id, categoryId), eq(categories.clubId, ctx.club.id)))
    .limit(1);

  const title = `Entrenamiento ${category?.name ?? ""}`.trim();
  const now = new Date();

  const [row] = await db
    .insert(trainings)
    .values({
      clubId: ctx.club.id,
      categoryId,
      coachMembershipId: ctx.membership.id,
      title,
      startsAt: now,
      location,
      status: "scheduled",
      createdByUserId: ctx.auth.user.id,
    })
    .returning({ id: trainings.id });

  await writeAudit({
    clubId: ctx.club.id,
    actorUserId: ctx.auth.user.id,
    actorEmail: ctx.auth.user.email,
    action: "training.created_express",
    entity: "training",
    entityId: row.id,
  });

  redirect(`/app/asistencias/${row.id}?ok=${encodeURIComponent("Entrenamiento iniciado. Tomá lista al plantel.")}`);
}

export async function finishTrainingAction(formData: FormData): Promise<void> {
  const ctx = await getTenant();
  assertCan(ctx, "trainings.manage");

  const trainingId = String(formData.get("trainingId") ?? "");
  await db
    .update(trainings)
    .set({ status: "completed", endsAt: new Date() })
    .where(and(eq(trainings.id, trainingId), eq(trainings.clubId, ctx.club.id)));

  redirect(`/app/asistencias?ok=${encodeURIComponent("Entrenamiento finalizado y asistencia guardada.")}`);
}

export async function markAllAttendanceAction(formData: FormData): Promise<void> {
  const ctx = await getTenant();
  assertCan(ctx, "attendance.record");

  const trainingId = String(formData.get("trainingId") ?? "");
  const playerIds = formData.getAll("playerIds").map(String);
  const status = (String(formData.get("status") ?? "present")) as "present" | "absent";

  for (const playerId of playerIds) {
    await db
      .insert(attendance)
      .values({
        clubId: ctx.club.id,
        trainingId,
        playerId,
        status,
        recordedByUserId: ctx.auth.user.id,
        recordedAt: new Date(),
      })
      .onConflictDoUpdate({
        target: [attendance.trainingId, attendance.playerId],
        set: {
          status,
          recordedByUserId: ctx.auth.user.id,
          recordedAt: new Date(),
        },
      });
  }

  await db
    .update(trainings)
    .set({ status: "completed" })
    .where(and(eq(trainings.id, trainingId), eq(trainings.clubId, ctx.club.id)));

  redirect(`/app/calendario/${trainingId}?ok=${encodeURIComponent("Asistencia registrada para el plantel.")}`);
}

const matchSchema = z.object({
  rival: z.string().trim().min(1, "El nombre del rival es obligatorio").max(100),
  categoryId: z.string().uuid("Seleccioná una categoría válida"),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Fecha inválida"),
  time: z.string().regex(/^\d{2}:\d{2}$/, "Hora inválida"),
  location: z.string().trim().max(160).optional(),
  isHome: z.enum(["true", "false"]),
  notes: z.string().trim().max(500).optional(),
});

export async function createMatchAction(
  _prev: SportsFormState,
  formData: FormData,
): Promise<SportsFormState> {
  const ctx = await getTenant();
  assertCan(ctx, "matches.manage");

  const parsed = matchSchema.safeParse({
    rival: formData.get("rival"),
    categoryId: formData.get("categoryId"),
    date: formData.get("date"),
    time: formData.get("time"),
    location: formData.get("location") || undefined,
    isHome: formData.get("isHome"),
    notes: formData.get("notes") || undefined,
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Revisá los datos ingresados." };
  }

  const startsAt = new Date(`${parsed.data.date}T${parsed.data.time}:00-03:00`);

  try {
    const [row] = await db
      .insert(matches)
      .values({
        clubId: ctx.club.id,
        categoryId: parsed.data.categoryId,
        coachMembershipId: ctx.membership.id,
        rival: parsed.data.rival,
        startsAt,
        location: parsed.data.location ?? null,
        isHome: parsed.data.isHome === "true",
        notes: parsed.data.notes ?? null,
        status: "scheduled",
        createdByUserId: ctx.auth.user.id,
      })
      .returning({ id: matches.id });

    await writeAudit({
      clubId: ctx.club.id,
      actorUserId: ctx.auth.user.id,
      actorEmail: ctx.auth.user.email,
      action: "match.created",
      entity: "match",
      entityId: row.id,
    });

    redirect(`/app/partidos/${row.id}?ok=${encodeURIComponent("Partido creado. Ya podés convocar jugadores.")}`);
  } catch (error) {
    if (error instanceof Error && error.message.startsWith("NEXT_REDIRECT")) throw error;
    console.error("[sports.createMatch]", error);
    return { error: "No se pudo programar el partido." };
  }
}

export async function updateMatchScoreAction(formData: FormData): Promise<void> {
  const ctx = await getTenant();
  assertCan(ctx, "matches.manage");

  const matchId = String(formData.get("matchId") ?? "");
  const ourScoreRaw = formData.get("ourScore");
  const rivalScoreRaw = formData.get("rivalScore");

  const ourScore = ourScoreRaw !== "" && ourScoreRaw !== null && !isNaN(Number(ourScoreRaw)) ? Number(ourScoreRaw) : null;
  const rivalScore = rivalScoreRaw !== "" && rivalScoreRaw !== null && !isNaN(Number(rivalScoreRaw)) ? Number(rivalScoreRaw) : null;
  const statusInput = formData.get("status");
  const status = statusInput === "scheduled" ? "scheduled" : (ourScore !== null && rivalScore !== null ? "played" : "scheduled");
  const notes = formData.get("notes") !== null ? String(formData.get("notes")) : undefined;
  const redirectTo = formData.get("redirectTo") ? String(formData.get("redirectTo")) : null;

  const updates: Record<string, any> = {
    ourScore,
    rivalScore,
    status,
  };
  if (notes !== undefined) {
    updates.notes = notes;
  }

  await db
    .update(matches)
    .set(updates)
    .where(and(eq(matches.id, matchId), eq(matches.clubId, ctx.club.id)));

  await writeAudit({
    clubId: ctx.club.id,
    actorUserId: ctx.auth.user.id,
    actorEmail: ctx.auth.user.email,
    action: "match.score_updated",
    entity: "match",
    entityId: matchId,
    meta: { ourScore, rivalScore, status },
  });

  const dest = redirectTo || `/app/partidos/${matchId}`;
  redirect(`${dest}?ok=${encodeURIComponent("Resultado final guardado correctamente.")}`);
}

export async function setMatchStatusAction(formData: FormData): Promise<void> {
  const ctx = await getTenant();
  assertCan(ctx, "matches.manage");

  const matchId = String(formData.get("matchId") ?? "");
  const status = String(formData.get("status") ?? "scheduled") as "scheduled" | "played" | "cancelled";
  const notes = formData.get("notes") !== null ? String(formData.get("notes")) : undefined;
  const redirectTo = formData.get("redirectTo") ? String(formData.get("redirectTo")) : null;

  const updates: Record<string, any> = { status };
  if (notes !== undefined) {
    updates.notes = notes;
  }

  await db
    .update(matches)
    .set(updates)
    .where(and(eq(matches.id, matchId), eq(matches.clubId, ctx.club.id)));

  await writeAudit({
    clubId: ctx.club.id,
    actorUserId: ctx.auth.user.id,
    actorEmail: ctx.auth.user.email,
    action: "match.status_updated",
    entity: "match",
    entityId: matchId,
    meta: { status, notes },
  });

  const msg =
    status === "cancelled"
      ? "Partido marcado como suspendido."
      : status === "scheduled"
        ? "Partido reprogramado / reactivado."
        : "Partido marcado como jugado.";

  const dest = redirectTo || `/app/partidos/${matchId}`;
  redirect(`${dest}?ok=${encodeURIComponent(msg)}`);
}

export type ImportFixtureResultState = {
  error?: string;
  ok?: string;
  importedCount?: number;
  skippedCount?: number;
  details?: string[];
} | null;

export async function importFixtureAction(
  _prev: ImportFixtureResultState,
  formData: FormData,
): Promise<ImportFixtureResultState> {
  const ctx = await getTenant();
  assertCan(ctx, "matches.manage");

  const file = formData.get("file") as File | null;
  const rawText = (formData.get("csvText") as string | null)?.trim() || "";

  let content = "";

  if (file && file.size > 0) {
    if (file.size > 5 * 1024 * 1024) {
      return { error: "El archivo no puede superar los 5 MB." };
    }
    content = await file.text();
  } else if (rawText) {
    content = rawText;
  } else {
    return { error: "Seleccioná un archivo CSV o pegá las filas del fixture en el cuadro de texto." };
  }

  if (content.charCodeAt(0) === 0xfeff) {
    content = content.slice(1);
  }

  const lines = content
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.length > 0);

  if (lines.length < 2) {
    return { error: "El archivo debe contener al menos la fila de títulos y una fila de partido." };
  }

  const delimiter = lines[0].includes(";") ? ";" : ",";
  const header = lines[0]
    .split(delimiter)
    .map((h) => h.trim().toLowerCase().replace(/['"]/g, ""));

  const colIdx = {
    category: header.findIndex((h) => h.includes("categor") || h.includes("cat")),
    rival: header.findIndex((h) => h.includes("rival") || h.includes("equipo")),
    date: header.findIndex((h) => h.includes("fecha") || h.includes("dia")),
    time: header.findIndex((h) => h.includes("hora") || h.includes("horario")),
    condition: header.findIndex((h) => h.includes("condicion") || h.includes("local") || h.includes("sede")),
    address: header.findIndex((h) => h.includes("direccion") || h.includes("cancha") || h.includes("lugar") || h.includes("ubicacion")),
    notes: header.findIndex((h) => h.includes("observ") || h.includes("nota") || h.includes("detalle")),
  };

  if (colIdx.category === -1 || colIdx.rival === -1 || colIdx.date === -1) {
    return {
      error:
        "Faltan columnas requeridas en el archivo. Debe incluir al menos: Categoria, Rival y Fecha.",
    };
  }

  const existingCategories = await db
    .select({ id: categories.id, name: categories.name, gender: categories.gender })
    .from(categories)
    .where(eq(categories.clubId, ctx.club.id));

  const catMap = new Map<string, string>();
  for (const c of existingCategories) {
    catMap.set(c.name.trim().toLowerCase(), c.id);
    const genderTag = c.gender === "male" ? "masc" : c.gender === "female" ? "fem" : "mixto";
    catMap.set(`${c.name.trim().toLowerCase()} ${genderTag}`, c.id);
  }

  let importedCount = 0;
  let skippedCount = 0;
  const details: string[] = [];

  for (let i = 1; i < lines.length; i++) {
    const rawCols = lines[i].split(delimiter).map((c) => c.trim().replace(/^["']|["']$/g, ""));
    const catName = rawCols[colIdx.category] || "";
    const rivalName = rawCols[colIdx.rival] || "";
    const dateStr = rawCols[colIdx.date] || "";
    const timeStr = (colIdx.time !== -1 ? rawCols[colIdx.time] : "") || "18:00";
    const condStr = (colIdx.condition !== -1 ? rawCols[colIdx.condition] : "").toLowerCase();
    const addressStr = colIdx.address !== -1 ? rawCols[colIdx.address] : "";
    const notesStr = colIdx.notes !== -1 ? rawCols[colIdx.notes] : "";

    if (!catName || !rivalName || !dateStr) {
      skippedCount++;
      details.push(`Fila ${i + 1}: Datos incompletos (requiere categoría, rival y fecha).`);
      continue;
    }

    const cleanCat = catName.toLowerCase().trim();
    let categoryId = catMap.get(cleanCat);
    if (!categoryId) {
      for (const [key, id] of catMap.entries()) {
        if (cleanCat.includes(key) || key.includes(cleanCat)) {
          categoryId = id;
          break;
        }
      }
    }

    if (!categoryId) {
      skippedCount++;
      details.push(`Fila ${i + 1}: Categoría "${catName}" no encontrada en el club.`);
      continue;
    }

    let startsAt: Date;
    try {
      const parts = dateStr.includes("/") ? dateStr.split("/") : dateStr.split("-");
      let y: string, m: string, d: string;
      if (dateStr.includes("/")) {
        d = parts[0].padStart(2, "0");
        m = parts[1].padStart(2, "0");
        y = parts[2].length === 2 ? `20${parts[2]}` : parts[2];
      } else {
        if (parts[0].length === 4) {
          y = parts[0];
          m = parts[1].padStart(2, "0");
          d = parts[2].padStart(2, "0");
        } else {
          d = parts[0].padStart(2, "0");
          m = parts[1].padStart(2, "0");
          y = parts[2].length === 2 ? `20${parts[2]}` : parts[2];
        }
      }

      const cleanTime = timeStr.includes(":") ? timeStr.slice(0, 5) : "18:00";
      startsAt = new Date(`${y}-${m}-${d}T${cleanTime}:00-03:00`);
      if (isNaN(startsAt.getTime())) {
        throw new Error("Fecha inválida");
      }
    } catch {
      skippedCount++;
      details.push(`Fila ${i + 1}: Fecha "${dateStr}" u hora "${timeStr}" no válida.`);
      continue;
    }

    const isHome =
      condStr.includes("local") ||
      condStr === "l" ||
      condStr.includes("propia") ||
      condStr.includes("31") ||
      !condStr;

    const location =
      isHome
        ? "Calle 33 N° 334, Mercedes (Sede Club Atlético Estudiantes)"
        : addressStr || `Cancha de ${rivalName}`;

    await db.insert(matches).values({
      clubId: ctx.club.id,
      categoryId,
      rival: rivalName,
      startsAt,
      isHome,
      location,
      notes: notesStr || null,
      status: "scheduled",
      createdByUserId: ctx.auth.user.id,
    });

    importedCount++;
  }

  await writeAudit({
    clubId: ctx.club.id,
    actorUserId: ctx.auth.user.id,
    actorEmail: ctx.auth.user.email,
    action: "matches.imported",
    entity: "match",
    meta: { importedCount, skippedCount },
  });

  return {
    ok: `Importación completada: ${importedCount} partido(s) programados con éxito.`,
    importedCount,
    skippedCount,
    details: details.length > 0 ? details.slice(0, 10) : undefined,
  };
}

export async function toggleCallupAction(formData: FormData): Promise<void> {
  const ctx = await getTenant();
  assertCan(ctx, "matches.manage");

  const matchId = String(formData.get("matchId") ?? "");
  const playerId = String(formData.get("playerId") ?? "");
  const actionType = String(formData.get("actionType") ?? "");

  if (actionType === "remove") {
    await db
      .delete(callups)
      .where(and(eq(callups.matchId, matchId), eq(callups.playerId, playerId)));
  } else {
    const status = (String(formData.get("status") ?? "invited")) as "invited" | "confirmed" | "declined";
    await db
      .insert(callups)
      .values({
        clubId: ctx.club.id,
        matchId,
        playerId,
        status,
      })
      .onConflictDoUpdate({
        target: [callups.matchId, callups.playerId],
        set: { status },
      });
  }

  redirect(`/app/partidos/${matchId}?ok=${encodeURIComponent("Convocatoria actualizada.")}`);
}

const tripSchema = z.object({
  title: z.string().trim().min(1, "El título es obligatorio").max(120),
  destination: z.string().trim().min(1, "El destino es obligatorio").max(160),
  categoryId: z.string().uuid("Seleccioná una categoría válida").optional().or(z.literal("")),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Fecha inválida"),
  time: z.string().regex(/^\d{2}:\d{2}$/, "Hora inválida"),
  transport: z.string().trim().max(100).optional(),
  cost: z.coerce.number().min(0, "El costo no puede ser negativo").default(0),
  seats: z.coerce.number().int().min(1).optional().or(z.literal("")),
  notes: z.string().trim().max(500).optional(),
});

export async function createTripAction(
  _prev: SportsFormState,
  formData: FormData,
): Promise<SportsFormState> {
  const ctx = await getTenant();
  assertCan(ctx, "trips.manage");

  const parsed = tripSchema.safeParse({
    title: formData.get("title"),
    destination: formData.get("destination"),
    categoryId: formData.get("categoryId") || undefined,
    date: formData.get("date"),
    time: formData.get("time"),
    transport: formData.get("transport") || undefined,
    cost: formData.get("cost") || 0,
    seats: formData.get("seats") || undefined,
    notes: formData.get("notes") || undefined,
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Revisá los datos ingresados." };
  }

  const departureAt = new Date(`${parsed.data.date}T${parsed.data.time}:00-03:00`);
  const costCents = Math.round(parsed.data.cost * 100);

  try {
    const [row] = await db
      .insert(trips)
      .values({
        clubId: ctx.club.id,
        categoryId: parsed.data.categoryId || null,
        title: parsed.data.title,
        destination: parsed.data.destination,
        departureAt,
        transport: parsed.data.transport ?? null,
        costCents,
        seats: typeof parsed.data.seats === "number" ? parsed.data.seats : null,
        notes: parsed.data.notes ?? null,
        status: "open",
        createdByUserId: ctx.auth.user.id,
      })
      .returning({ id: trips.id });

    await writeAudit({
      clubId: ctx.club.id,
      actorUserId: ctx.auth.user.id,
      actorEmail: ctx.auth.user.email,
      action: "trip.created",
      entity: "trip",
      entityId: row.id,
    });

    redirect(`/app/viajes/${row.id}?ok=${encodeURIComponent("Viaje organizado exitosamente.")}`);
  } catch (error) {
    if (error instanceof Error && error.message.startsWith("NEXT_REDIRECT")) throw error;
    console.error("[sports.createTrip]", error);
    return { error: "No se pudo crear el viaje." };
  }
}

export async function addTripPassengerAction(formData: FormData): Promise<void> {
  const ctx = await getTenant();
  assertCan(ctx, "trips.manage");

  const tripId = String(formData.get("tripId") ?? "");
  const playerId = String(formData.get("playerId") ?? "");

  await db
    .insert(tripPassengers)
    .values({
      clubId: ctx.club.id,
      tripId,
      playerId,
      status: "invited",
      paymentStatus: "pending",
      authorizationStatus: "pending",
    })
    .onConflictDoNothing();

  redirect(`/app/viajes/${tripId}?ok=${encodeURIComponent("Pasajero agregado a la delegación.")}`);
}

export async function updatePassengerStatusAction(formData: FormData): Promise<void> {
  const ctx = await getTenant();
  assertCan(ctx, "trips.manage");

  const passengerId = String(formData.get("passengerId") ?? "");
  const tripId = String(formData.get("tripId") ?? "");
  const paymentStatus = formData.get("paymentStatus") as "pending" | "paid" | "partial" | "void";
  const authorizationStatus = formData.get("authorizationStatus") as "pending" | "granted" | "rejected";

  const updates: Record<string, any> = {};
  if (paymentStatus) updates.paymentStatus = paymentStatus;
  if (authorizationStatus) {
    updates.authorizationStatus = authorizationStatus;
    if (authorizationStatus === "granted") {
      updates.authorizedAt = new Date();
      updates.authorizedByUserId = ctx.auth.user.id;
    }
  }

  await db
    .update(tripPassengers)
    .set(updates)
    .where(and(eq(tripPassengers.id, passengerId), eq(tripPassengers.clubId, ctx.club.id)));

  redirect(`/app/viajes/${tripId}?ok=${encodeURIComponent("Estado del pasajero actualizado.")}`);
}
