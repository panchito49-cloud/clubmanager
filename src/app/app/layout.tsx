import { and, eq, isNull, sql } from "drizzle-orm";
import type { ReactNode } from "react";
import { db } from "@/db/client";
import { notifications } from "@/db/schema";
import { AppShell } from "@/components/app/app-shell";
import { CLUB_NAV, type NavSection } from "@/components/app/nav-items";
import { roleLabel } from "@/lib/permissions";
import { hasModule } from "@/server/plan";
import { getTenant } from "@/server/tenant";

export const dynamic = "force-dynamic";

export default async function AppLayout({ children }: { children: ReactNode }) {
  const ctx = await getTenant();

  const nav: NavSection[] = CLUB_NAV.map((section) => ({
    ...section,
    items: section.items.filter((item) => {
      if (!ctx.permissions.has(item.permission)) return false;
      if (item.adminOnly && ctx.role !== "club_admin") return false;
      if (item.module && !hasModule(ctx, item.module)) return false;
      return true;
    }),
  })).filter((section) => section.items.length > 0);

  const [unread] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(notifications)
    .where(
      and(
        eq(notifications.clubId, ctx.club.id),
        eq(notifications.userId, ctx.auth.user.id),
        isNull(notifications.readAt),
      ),
    );

  return (
    <AppShell
      nav={nav}
      clubName={ctx.club.name}
      roleLabel={roleLabel(ctx.role)}
      planName={ctx.plan?.name ?? null}
      userName={ctx.auth.user.fullName}
      userEmail={ctx.auth.user.email}
      unreadCount={Number(unread?.count ?? 0)}
      variant="club"
      isPlatformAdmin={ctx.auth.user.isPlatformAdmin}
    >
      {children}
    </AppShell>
  );
}
