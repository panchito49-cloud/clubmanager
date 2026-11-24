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
  const ourScore = Number(formData.get("ourScore"));
  const rivalScore = Number(formData.get("rivalScore"));
  const status = formData.get("status") === "played" ? "played" : "scheduled";

  await db
    .update(matches)
    .set({
      ourScore: Number.isFinite(ourScore) ? ourScore : null,
      rivalScore: Number.isFinite(rivalScore) ? rivalScore : null,
      status,
    })
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

  redirect(`/app/partidos/${matchId}?ok=${encodeURIComponent("Resultado actualizado.")}`);
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
