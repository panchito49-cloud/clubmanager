import "server-only";

import { and, asc, desc, eq, inArray, isNull, sql } from "drizzle-orm";
import { db } from "@/db/client";
import {
  announcements,
  categories,
  families,
  familyMembers,
  memberships,
  notifications,
  players,
  users,
} from "@/db/schema";
import { formatWhatsAppUrl } from "@/lib/whatsapp-link";
import type { TenantContext } from "@/server/tenant";

export type AnnouncementFilters = {
  status?: string;
};

export async function listAnnouncements(
  ctx: TenantContext,
  filters: AnnouncementFilters = {},
) {
  const where = [eq(announcements.clubId, ctx.club.id)];

  if (filters.status) {
    where.push(eq(announcements.status, filters.status as any));
  }

  const rows = await db
    .select({
      id: announcements.id,
      title: announcements.title,
      body: announcements.body,
      audience: announcements.audience,
      channel: announcements.channel,
      status: announcements.status,
      recipientCount: announcements.recipientCount,
      sentAt: announcements.sentAt,
      createdAt: announcements.createdAt,
      categoryId: announcements.categoryId,
      categoryName: categories.name,
      categoryGender: categories.gender,
      authorName: users.fullName,
    })
    .from(announcements)
    .leftJoin(categories, eq(categories.id, announcements.categoryId))
    .leftJoin(users, eq(users.id, announcements.createdByUserId))
    .where(and(...where))
    .orderBy(desc(announcements.createdAt))
    .limit(50);

  return rows;
}

export async function getAnnouncement(ctx: TenantContext, id: string) {
  const [row] = await db
    .select({
      id: announcements.id,
      title: announcements.title,
      body: announcements.body,
      audience: announcements.audience,
      channel: announcements.channel,
      status: announcements.status,
      recipientCount: announcements.recipientCount,
      sentAt: announcements.sentAt,
      createdAt: announcements.createdAt,
      categoryId: announcements.categoryId,
      categoryName: categories.name,
      categoryGender: categories.gender,
      authorName: users.fullName,
      createdByUserId: announcements.createdByUserId,
    })
    .from(announcements)
    .leftJoin(categories, eq(categories.id, announcements.categoryId))
    .leftJoin(users, eq(users.id, announcements.createdByUserId))
    .where(
      and(
        eq(announcements.id, id),
        eq(announcements.clubId, ctx.club.id),
      ),
    )
    .limit(1);

  return row ?? null;
}

export async function listNotifications(
  ctx: TenantContext,
  opts: { limit?: number } = {},
) {
  const limit = opts.limit ?? 30;

  const rows = await db
    .select({
      id: notifications.id,
      title: notifications.title,
      body: notifications.body,
      link: notifications.link,
      readAt: notifications.readAt,
      createdAt: notifications.createdAt,
    })
    .from(notifications)
    .where(
      and(
        eq(notifications.clubId, ctx.club.id),
        eq(notifications.userId, ctx.auth.user.id),
      ),
    )
    .orderBy(
      sql`case when ${notifications.readAt} is null then 0 else 1 end asc`,
      desc(notifications.createdAt),
    )
    .limit(limit);

  return rows;
}

export async function getUnreadCount(ctx: TenantContext): Promise<number> {
  const [row] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(notifications)
    .where(
      and(
        eq(notifications.clubId, ctx.club.id),
        eq(notifications.userId, ctx.auth.user.id),
        isNull(notifications.readAt),
      ),
    );

  return row?.count ?? 0;
}

export type WhatsAppRecipient = {
  id: string;
  name: string;
  relationshipLabel: string;
  playerName?: string;
  categoryName?: string;
  jerseyNumber?: number | null;
  phone: string | null;
  waUrl: string | null;
};

export async function getAnnouncementRecipients(
  ctx: TenantContext,
  announcementId: string,
): Promise<{
  announcement: Awaited<ReturnType<typeof getAnnouncement>>;
  recipients: WhatsAppRecipient[];
  shareGroupWaUrl: string;
  fullMessageText: string;
}> {
  const announcement = await getAnnouncement(ctx, announcementId);
  if (!announcement) {
    throw new Error("Comunicado no encontrado");
  }

  const fullMessageText = `🏀 *CLUB ATLÉTICO ESTUDIANTES DE MERCEDES*\n*COMUNICADO INSTITUCIONAL*\n\n📌 *${announcement.title.toUpperCase()}*\n\n${announcement.body}\n\n---\n📍 Cancha: Calle 33 N° 334, Mercedes (B)\n🏛️ Centenario 1926-2026`;

  const shareGroupWaUrl = `https://wa.me/?text=${encodeURIComponent(fullMessageText)}`;

  const recipients: WhatsAppRecipient[] = [];

  if (announcement.audience === "category" && announcement.categoryId) {
    const playerRows = await db
      .select({
        id: players.id,
        firstName: players.firstName,
        lastName: players.lastName,
        jerseyNumber: players.jerseyNumber,
        emergencyPhone: players.emergencyContactPhone,
        familyId: players.familyId,
        familyName: families.name,
        familyContactName: families.contactName,
        familyPhone: families.contactPhone,
        categoryName: categories.name,
      })
      .from(players)
      .leftJoin(categories, eq(categories.id, players.categoryId))
      .leftJoin(families, eq(families.id, players.familyId))
      .where(
        and(
          eq(players.clubId, ctx.club.id),
          eq(players.categoryId, announcement.categoryId),
          eq(players.status, "active"),
        ),
      )
      .orderBy(asc(players.lastName), asc(players.firstName));

    for (const p of playerRows) {
      const phone = p.familyPhone || p.emergencyPhone || null;
      const tutorName = p.familyContactName || p.familyName || `Familia de ${p.firstName}`;
      const waUrl = formatWhatsAppUrl({
        phone,
        message: `Hola ${tutorName}!\n\n${fullMessageText}`,
      });

      recipients.push({
        id: p.id,
        name: tutorName,
        relationshipLabel: "Tutor / Familia",
        playerName: `${p.lastName}, ${p.firstName}`,
        categoryName: p.categoryName || undefined,
        jerseyNumber: p.jerseyNumber,
        phone,
        waUrl,
      });
    }
  } else if (announcement.audience === "families" || announcement.audience === "all") {
    const familyRows = await db
      .select({
        id: families.id,
        name: families.name,
        contactName: families.contactName,
        contactPhone: families.contactPhone,
      })
      .from(families)
      .where(eq(families.clubId, ctx.club.id))
      .orderBy(asc(families.name));

    for (const f of familyRows) {
      const waUrl = formatWhatsAppUrl({
        phone: f.contactPhone,
        message: `Hola ${f.contactName || f.name}!\n\n${fullMessageText}`,
      });

      recipients.push({
        id: f.id,
        name: f.contactName || f.name,
        relationshipLabel: "Familia del Club",
        phone: f.contactPhone,
        waUrl,
      });
    }
  } else if (announcement.audience === "coaches") {
    const coachRows = await db
      .select({
        id: users.id,
        name: users.fullName,
        email: users.email,
        phone: users.phone,
      })
      .from(memberships)
      .innerJoin(users, eq(users.id, memberships.userId))
      .where(
        and(
          eq(memberships.clubId, ctx.club.id),
          eq(memberships.role, "coach"),
          eq(memberships.status, "active"),
        ),
      );

    for (const c of coachRows) {
      const waUrl = formatWhatsAppUrl({
        phone: c.phone,
        message: `Hola ${c.name} (Cuerpo Técnico):\n\n${fullMessageText}`,
      });

      recipients.push({
        id: c.id,
        name: c.name,
        relationshipLabel: "Entrenador / Cuerpo Técnico",
        phone: c.phone,
        waUrl,
      });
    }
  }

  return {
    announcement,
    recipients,
    shareGroupWaUrl,
    fullMessageText,
  };
}

export async function getCommsHubData(ctx: TenantContext, filters: AnnouncementFilters = {}) {
  const announcementsList = await listAnnouncements(ctx, filters);

  const totalCount = announcementsList.length;
  const sentCount = announcementsList.filter((a) => a.status === "sent").length;
  const draftCount = announcementsList.filter((a) => a.status === "draft").length;
  let totalRecipientsReached = 0;

  for (const a of announcementsList) {
    if (a.status === "sent") {
      totalRecipientsReached += a.recipientCount;
    }
  }

  return {
    announcements: announcementsList,
    stats: {
      totalCount,
      sentCount,
      draftCount,
      totalRecipientsReached,
    },
  };
}
