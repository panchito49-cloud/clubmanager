/**
 * RBAC: permisos por rol dentro de un club.
 *
 * El rol define QUE puede hacer un usuario; el alcance de datos (que categorias,
 * que familia, que jugador) se aplica ademas en la capa de datos.
 */

export const ROLES = ["club_admin", "coach", "guardian", "player"] as const;
export type Role = (typeof ROLES)[number];

export const PERMISSIONS = [
  "club.view",
  "club.manage",
  "users.view",
  "users.manage",
  "audit.view",
  "players.view",
  "players.manage",
  "families.view",
  "families.manage",
  "categories.manage",
  "fees.view",
  "fees.manage",
  "payments.declare",
  "payments.review",
  "trainings.view",
  "trainings.manage",
  "attendance.record",
  "matches.view",
  "matches.manage",
  "callups.respond",
  "trips.view",
  "trips.manage",
  "trips.respond",
  "comms.view",
  "comms.send",
  "reports.view",
] as const;

export type Permission = (typeof PERMISSIONS)[number];

const ADMIN_PERMISSIONS: Permission[] = [...PERMISSIONS];

const COACH_PERMISSIONS: Permission[] = [
  "club.view",
  "players.view",
  "families.view",
  "trainings.view",
  "trainings.manage",
  "attendance.record",
  "matches.view",
  "matches.manage",
  "callups.respond",
  "trips.view",
  "comms.view",
  "comms.send",
  "reports.view",
];

const GUARDIAN_PERMISSIONS: Permission[] = [
  "club.view",
  "players.view",
  "families.view",
  "fees.view",
  "payments.declare",
  "trainings.view",
  "matches.view",
  "callups.respond",
  "trips.view",
  "trips.respond",
  "comms.view",
];

const PLAYER_PERMISSIONS: Permission[] = [
  "club.view",
  "trainings.view",
  "matches.view",
  "trips.view",
  "comms.view",
];

const ROLE_PERMISSIONS: Record<Role, Permission[]> = {
  club_admin: ADMIN_PERMISSIONS,
  coach: COACH_PERMISSIONS,
  guardian: GUARDIAN_PERMISSIONS,
  player: PLAYER_PERMISSIONS,
};

export function permissionsForRole(role: Role): Permission[] {
  return ROLE_PERMISSIONS[role] ?? [];
}

export function roleLabel(role: Role): string {
  switch (role) {
    case "club_admin":
      return "Administrador";
    case "coach":
      return "Entrenador";
    case "guardian":
      return "Padre / Tutor";
    case "player":
      return "Jugador";
  }
}

export function isStaff(role: Role): boolean {
  return role === "club_admin" || role === "coach";
}
