import type { IconName } from "@/components/ui/icon";
import type { Permission } from "@/lib/permissions";

export type NavItem = {
  href: string;
  label: string;
  icon: IconName;
  permission: Permission;
  exact?: boolean;
  /** Modulo del plan requerido (si el plan del club no lo incluye, se oculta). */
  module?: string;
  /** Solo visible para administradores del club. */
  adminOnly?: boolean;
};

export type NavSection = {
  title: string;
  items: NavItem[];
};

export const CLUB_NAV: NavSection[] = [
  {
    title: "Gestión",
    items: [
      { href: "/app", label: "Panel", icon: "grid", permission: "club.view", exact: true },
      { href: "/app/portal", label: "Portal familiar", icon: "shield", permission: "club.view" },
      { href: "/app/jugadores", label: "Jugadores", icon: "users", permission: "players.view", module: "jugadores" },
      { href: "/app/familias", label: "Familias", icon: "home", permission: "families.view", module: "jugadores" },
      { href: "/app/categorias", label: "Categorías", icon: "layers", permission: "categories.manage", module: "jugadores" },
    ],
  },
  {
    title: "Economía",
    items: [
      { href: "/app/cuotas", label: "Cuotas", icon: "wallet", permission: "fees.view", module: "cuotas" },
      { href: "/app/pagos", label: "Pagos", icon: "receipt", permission: "fees.view", module: "cuotas" },
    ],
  },
  {
    title: "Deportivo",
    items: [
      { href: "/app/asistencias", label: "Asistencias", icon: "check", permission: "attendance.record", module: "deportivo" },
      { href: "/app/calendario", label: "Calendario", icon: "calendar", permission: "trainings.view", module: "deportivo" },
      { href: "/app/partidos", label: "Partidos", icon: "trophy", permission: "matches.view", module: "deportivo" },
      { href: "/app/viajes", label: "Viajes", icon: "bus", permission: "trips.view", module: "deportivo" },
    ],
  },
  {
    title: "Comunicación",
    items: [
      { href: "/app/comunicaciones", label: "Comunicaciones", icon: "megaphone", permission: "comms.view", module: "comunicaciones" },
      { href: "/app/reportes", label: "Reportes", icon: "chart", permission: "reports.view", module: "reportes" },
    ],
  },
  {
    title: "Administración",
    items: [
      { href: "/app/usuarios", label: "Usuarios y staff", icon: "shield", permission: "users.view", adminOnly: true },
      { href: "/app/configuracion", label: "Configuración", icon: "settings", permission: "club.manage", adminOnly: true },
    ],
  },
];

export const PLATFORM_NAV: NavSection[] = [
  {
    title: "Plataforma",
    items: [
      { href: "/admin", label: "Resumen", icon: "grid", permission: "club.view", exact: true },
      { href: "/admin/clubes", label: "Clubes", icon: "building", permission: "club.view" },
      { href: "/admin/planes", label: "Planes", icon: "layers", permission: "club.view" },
      { href: "/admin/usuarios", label: "Usuarios", icon: "users", permission: "club.view" },
    ],
  },
];
