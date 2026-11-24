import "server-only";

import { and, desc, eq, isNull, sql } from "drizzle-orm";
import { db } from "@/db/client";
import {
  announcements,
  categories,
  notifications,
  users,
} from "@/db/schema";
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
