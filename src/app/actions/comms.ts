"use server";

import { redirect } from "next/navigation";
import { and, eq, inArray } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db/client";
import {
  announcements,
  familyMembers,
  memberships,
  notifications,
  players,
} from "@/db/schema";
import { writeAudit } from "@/server/audit";
import { assertCan, getTenant } from "@/server/tenant";

export type CommsFormState = { error?: string; ok?: string } | null;

const announcementSchema = z.object({
  title: z.string().trim().min(1, "El título es obligatorio").max(120),
  body: z.string().trim().min(1, "El mensaje no puede estar vacío").max(2000),
  audience: z.enum(["all", "category", "families", "coaches", "players"]),
  categoryId: z.string().uuid("Seleccioná una categoría válida").optional().or(z.literal("")),
  channel: z.enum(["in_app", "whatsapp"]).default("in_app"),
});

export async function createAnnouncementAction(
  _prev: CommsFormState,
  formData: FormData,
): Promise<CommsFormState> {
  const ctx = await getTenant();
  assertCan(ctx, "comms.send");

  const parsed = announcementSchema.safeParse({
    title: formData.get("title"),
    body: formData.get("body"),
    audience: formData.get("audience"),
    categoryId: formData.get("categoryId") || undefined,
    channel: formData.get("channel") || "in_app",
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Revisá los datos ingresados." };
  }

  if (parsed.data.audience === "category" && !parsed.data.categoryId) {
    return { error: "Debés seleccionar una categoría para esta audiencia." };
  }

  try {
    const [row] = await db
      .insert(announcements)
      .values({
        clubId: ctx.club.id,
        title: parsed.data.title,
        body: parsed.data.body,
        audience: parsed.data.audience,
        categoryId: parsed.data.categoryId || null,
        channel: parsed.data.channel,
        status: "draft",
        createdByUserId: ctx.auth.user.id,
      })
      .returning({ id: announcements.id });

    await writeAudit({
      clubId: ctx.club.id,
      actorUserId: ctx.auth.user.id,
      actorEmail: ctx.auth.user.email,
      action: "announcement.created",
      entity: "announcement",
      entityId: row.id,
    });

    redirect(`/app/comunicaciones/${row.id}?ok=${encodeURIComponent("Comunicación creada como borrador. Podés revisarla y enviarla.")}`);
  } catch (error) {
    if (error instanceof Error && error.message.startsWith("NEXT_REDIRECT")) throw error;
    console.error("[comms.createAnnouncement]", error);
    return { error: "No se pudo crear la comunicación." };
  }
}

export async function sendAnnouncementAction(formData: FormData): Promise<void> {
  const ctx = await getTenant();
  assertCan(ctx, "comms.send");

  const announcementId = String(formData.get("announcementId") ?? "");

  const [announcement] = await db
    .select()
    .from(announcements)
    .where(
      and(
        eq(announcements.id, announcementId),
        eq(announcements.clubId, ctx.club.id),
      ),
    )
    .limit(1);

  if (!announcement) {
    throw new Error("Comunicado no encontrado.");
  }

  if (announcement.status === "sent") {
    redirect(`/app/comunicaciones/${announcementId}?error=${encodeURIComponent("Este comunicado ya fue enviado anteriormente.")}`);
  }

  // Recolectar userIds destinatarios según la audiencia
  const recipientUserIds = new Set<string>();

  if (announcement.audience === "all") {
    const members = await db
      .select({ userId: memberships.userId })
      .from(memberships)
      .where(
        and(
          eq(memberships.clubId, ctx.club.id),
          eq(memberships.status, "active"),
        ),
      );
    for (const m of members) recipientUserIds.add(m.userId);
  } else if (announcement.audience === "coaches") {
    const members = await db
      .select({ userId: memberships.userId })
      .from(memberships)
      .where(
        and(
          eq(memberships.clubId, ctx.club.id),
          eq(memberships.role, "coach"),
          eq(memberships.status, "active"),
        ),
      );
    for (const m of members) recipientUserIds.add(m.userId);
  } else if (announcement.audience === "families") {
    const members = await db
      .select({ userId: memberships.userId })
      .from(memberships)
      .where(
        and(
          eq(memberships.clubId, ctx.club.id),
          eq(memberships.role, "guardian"),
          eq(memberships.status, "active"),
        ),
      );
    for (const m of members) recipientUserIds.add(m.userId);
  } else if (announcement.audience === "players") {
    const members = await db
      .select({ userId: memberships.userId })
      .from(memberships)
      .where(
        and(
          eq(memberships.clubId, ctx.club.id),
          eq(memberships.role, "player"),
          eq(memberships.status, "active"),
        ),
      );
    for (const m of members) recipientUserIds.add(m.userId);
  } else if (announcement.audience === "category" && announcement.categoryId) {
    // 1. Jugadores de la categoría que tengan usuario asociado
    const categoryPlayers = await db
      .select({ userId: players.userId, familyId: players.familyId })
      .from(players)
      .where(
        and(
          eq(players.clubId, ctx.club.id),
          eq(players.categoryId, announcement.categoryId),
          eq(players.status, "active"),
        ),
      );

    const familyIds = new Set<string>();
    for (const p of categoryPlayers) {
      if (p.userId) recipientUserIds.add(p.userId);
      if (p.familyId) familyIds.add(p.familyId);
    }

    // 2. Familias/tutores vinculados a esos jugadores
    if (familyIds.size > 0) {
      const familyUserRows = await db
        .select({ userId: familyMembers.userId })
        .from(familyMembers)
        .where(
          and(
            eq(familyMembers.clubId, ctx.club.id),
            inArray(familyMembers.familyId, Array.from(familyIds)),
          ),
        );
      for (const fm of familyUserRows) {
        if (fm.userId) recipientUserIds.add(fm.userId);
      }
    }
  }

  const userIdsArray = Array.from(recipientUserIds);

  // Crear notificaciones en la bandeja interna
  if (userIdsArray.length > 0) {
    const notificationsToInsert = userIdsArray.map((userId) => ({
      clubId: ctx.club.id,
      userId,
      title: announcement.title,
      body: announcement.body,
      link: `/app/comunicaciones/${announcement.id}`,
    }));

    // Inserción en lotes de 100 para escalabilidad
    const batchSize = 100;
    for (let i = 0; i < notificationsToInsert.length; i += batchSize) {
      const batch = notificationsToInsert.slice(i, i + batchSize);
      await db.insert(notifications).values(batch);
    }
  }

  // Actualizar comunicado a sent
  await db
    .update(announcements)
    .set({
      status: "sent",
      sentAt: new Date(),
      recipientCount: userIdsArray.length,
    })
    .where(and(eq(announcements.id, announcementId), eq(announcements.clubId, ctx.club.id)));

  await writeAudit({
    clubId: ctx.club.id,
    actorUserId: ctx.auth.user.id,
    actorEmail: ctx.auth.user.email,
    action: "announcement.sent",
    entity: "announcement",
    entityId: announcementId,
    meta: {
      recipientCount: userIdsArray.length,
      audience: announcement.audience,
    },
  });

  redirect(`/app/comunicaciones/${announcementId}?ok=${encodeURIComponent(`Comunicación enviada a ${userIdsArray.length} destinatario(s).`)}`);
}

export async function markNotificationReadAction(formData: FormData): Promise<void> {
  const ctx = await getTenant();
  const notificationId = String(formData.get("notificationId") ?? "");

  await db
    .update(notifications)
    .set({ readAt: new Date() })
    .where(
      and(
        eq(notifications.id, notificationId),
        eq(notifications.userId, ctx.auth.user.id),
        eq(notifications.clubId, ctx.club.id),
      ),
    );
}

export async function markAllNotificationsReadAction(): Promise<void> {
  const ctx = await getTenant();

  await db
    .update(notifications)
    .set({ readAt: new Date() })
    .where(
      and(
        eq(notifications.userId, ctx.auth.user.id),
        eq(notifications.clubId, ctx.club.id),
      ),
    );
}
