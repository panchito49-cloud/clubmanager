import type { ReactNode } from "react";
import { AppShell } from "@/components/app/app-shell";
import { PLATFORM_NAV } from "@/components/app/nav-items";
import { requirePlatformAdmin } from "@/server/tenant";

export const dynamic = "force-dynamic";

export default async function AdminLayout({ children }: { children: ReactNode }) {
  const auth = await requirePlatformAdmin();

  return (
    <AppShell
      nav={PLATFORM_NAV}
      clubName="SaaS Platform"
      roleLabel="Superadministrador"
      userName={auth.user.fullName}
      userEmail={auth.user.email}
      unreadCount={0}
      variant="platform"
      isPlatformAdmin={true}
    >
      {children}
    </AppShell>
  );
}
