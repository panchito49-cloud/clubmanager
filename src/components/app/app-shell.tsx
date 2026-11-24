"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, type ReactNode } from "react";
import { logoutAction } from "@/app/actions/auth";
import { Icon } from "@/components/ui/icon";
import { cn } from "@/lib/cn";
import { initials } from "@/lib/format";
import type { NavSection } from "./nav-items";

function isActive(pathname: string, href: string, exact?: boolean): boolean {
  if (exact) return pathname === href;
  return pathname === href || pathname.startsWith(`${href}/`);
}

function Brand({
  variant,
  clubName,
}: {
  variant: "club" | "platform";
  clubName: string;
}) {
  return (
    <Link href={variant === "platform" ? "/admin" : "/app"} className="flex items-center gap-2.5 px-3">
      <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-brand-400 to-brand-700 text-sm font-bold text-white shadow-sm">
        CM
      </span>
      <span className="min-w-0">
        <span className="block text-sm font-semibold leading-tight text-white">
          ClubManager
        </span>
        <span className="block truncate text-[11px] leading-tight text-ink-400">
          {variant === "platform" ? "Panel de plataforma" : clubName}
        </span>
      </span>
    </Link>
  );
}

function NavList({
  nav,
  pathname,
}: {
  nav: NavSection[];
  pathname: string;
}) {
  return (
    <nav className="flex-1 space-y-5 overflow-y-auto px-2 py-4">
      {nav.map((section) => (
        <div key={section.title}>
          <p className="mb-1.5 px-2.5 text-[10px] font-semibold uppercase tracking-wider text-ink-500">
            {section.title}
          </p>
          <ul className="space-y-0.5">
            {section.items.map((item) => {
              const active = isActive(pathname, item.href, item.exact);
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    className={cn(
                      "flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm transition-colors",
                      active
                        ? "bg-white/10 font-medium text-white"
                        : "text-ink-300 hover:bg-white/5 hover:text-white",
                    )}
                  >
                    <Icon
                      name={item.icon}
                      size={17}
                      className={active ? "text-brand-300" : "text-ink-400"}
                    />
                    <span className="truncate">{item.label}</span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </nav>
  );
}

export function AppShell({
  nav,
  clubName,
  roleLabel,
  planName,
  userName,
  userEmail,
  unreadCount,
  variant = "club",
  isPlatformAdmin,
  children,
}: {
  nav: NavSection[];
  clubName: string;
  roleLabel: string;
  planName?: string | null;
  userName: string;
  userEmail: string;
  unreadCount: number;
  variant?: "club" | "platform";
  isPlatformAdmin: boolean;
  children: ReactNode;
}) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  const sidebar = (
    <div className="flex h-full flex-col bg-ink-950">
      <div className="flex h-16 shrink-0 items-center justify-between border-b border-white/5">
        <Brand variant={variant} clubName={clubName} />
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="mr-2 rounded-md p-1.5 text-ink-400 hover:bg-white/10 hover:text-white lg:hidden"
          aria-label="Cerrar menú"
        >
          <Icon name="x" />
        </button>
      </div>

      <NavList nav={nav} pathname={pathname} />

      <div className="shrink-0 border-t border-white/5 p-2">
        {planName ? (
          <p className="mb-2 px-2 text-[10px] text-ink-500">
            Plan <span className="font-medium text-ink-300">{planName}</span>
          </p>
        ) : null}
        <Link
          href={variant === "platform" ? "/admin" : "/app/perfil"}
          className="flex items-center gap-2.5 rounded-lg p-2 hover:bg-white/5"
        >
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white/10 text-[11px] font-semibold text-white">
            {initials(userName)}
          </span>
          <span className="min-w-0 flex-1">
            <span className="block truncate text-xs font-medium text-white">{userName}</span>
            <span className="block truncate text-[10px] text-ink-400">{roleLabel}</span>
          </span>
        </Link>
        <form action={logoutAction}>
          <button
            type="submit"
            className="mt-1 flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-xs text-ink-400 hover:bg-white/5 hover:text-white"
          >
            <Icon name="logout" size={15} />
            Cerrar sesión
          </button>
        </form>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-ink-50">
      {/* Sidebar escritorio */}
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-60 lg:block">{sidebar}</aside>

      {/* Drawer móvil */}
      {open ? (
        <div className="fixed inset-0 z-40 lg:hidden">
          <button
            type="button"
            aria-label="Cerrar menú"
            className="absolute inset-0 bg-ink-950/60"
            onClick={() => setOpen(false)}
          />
          <div className="absolute inset-y-0 left-0 w-64 shadow-xl">{sidebar}</div>
        </div>
      ) : null}

      <div className="lg:pl-60">
        <header className="sticky top-0 z-20 flex h-14 items-center gap-2 border-b border-ink-200 bg-white/90 px-3 backdrop-blur sm:px-5">
          <button
            type="button"
            onClick={() => setOpen(true)}
            className="rounded-md p-1.5 text-ink-600 hover:bg-ink-100 lg:hidden"
            aria-label="Abrir menú"
          >
            <Icon name="menu" size={20} />
          </button>

          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium text-ink-800">
              {variant === "platform" ? "Administración de la plataforma" : clubName}
            </p>
            <p className="hidden truncate text-[11px] text-ink-500 sm:block">{userEmail}</p>
          </div>

          {isPlatformAdmin ? (
            <Link
              href={variant === "platform" ? "/app" : "/admin"}
              className="hidden rounded-lg px-2.5 py-1.5 text-xs font-medium text-ink-600 ring-1 ring-inset ring-ink-200 hover:bg-ink-50 sm:inline-flex"
            >
              {variant === "platform" ? "Ir al club" : "Panel de plataforma"}
            </Link>
          ) : null}

          {variant === "club" ? (
            <Link
              href="/app/notificaciones"
              className="relative rounded-md p-2 text-ink-600 hover:bg-ink-100"
              aria-label="Notificaciones"
            >
              <Icon name="bell" size={19} />
              {unreadCount > 0 ? (
                <span className="absolute right-1 top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-rose-500 px-1 text-[9px] font-bold text-white">
                  {unreadCount > 9 ? "9+" : unreadCount}
                </span>
              ) : null}
            </Link>
          ) : null}

          <Link
            href={variant === "platform" ? "/admin" : "/app/perfil"}
            className="flex h-8 w-8 items-center justify-center rounded-full bg-ink-900 text-[11px] font-semibold text-white"
            title={userName}
          >
            {initials(userName)}
          </Link>
        </header>

        <main className="mx-auto w-full max-w-[1440px] px-3 py-5 sm:px-5 sm:py-6 lg:px-7">
          {children}
        </main>
      </div>
    </div>
  );
}
