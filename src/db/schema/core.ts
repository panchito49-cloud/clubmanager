import {
  boolean,
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

/**
 * Nucleo multi-tenant del SaaS: planes, clubes, suscripciones, usuarios,
 * sesiones y membresias (rol de un usuario dentro de un club).
 *
 * Reglas de diseno:
 * - Toda tabla de datos de club lleva `club_id` y se consulta SIEMPRE a traves
 *   de la capa de datos (src/data/*) con el club de la sesion.
 * - El dinero se guarda en centavos (integer) para evitar errores de redondeo.
 */

export const clubStatusEnum = pgEnum("club_status", [
  "trial",
  "active",
  "suspended",
  "cancelled",
]);

export const subscriptionStatusEnum = pgEnum("subscription_status", [
  "trialing",
  "active",
  "past_due",
  "suspended",
  "cancelled",
]);

export const membershipRoleEnum = pgEnum("membership_role", [
  "club_admin",
  "coach",
  "guardian",
  "player",
]);

export const membershipStatusEnum = pgEnum("membership_status", [
  "active",
  "invited",
  "disabled",
]);

export const userStatusEnum = pgEnum("user_status", ["active", "disabled"]);

export type PlanFeatures = {
  modules: string[];
};

export const plans = pgTable(
  "plans",
  {
    id: uuid().primaryKey().defaultRandom(),
    code: text().notNull(),
    name: text().notNull(),
    description: text(),
    priceCents: integer().notNull().default(0),
    maxPlayers: integer(),
    maxAdmins: integer(),
    features: jsonb().$type<PlanFeatures>().notNull().default({ modules: [] }),
    isActive: boolean().notNull().default(true),
    sortOrder: integer().notNull().default(0),
    createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp({ withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (t) => [uniqueIndex("plans_code_uq").on(t.code)],
);

export type ClubSettings = {
  address?: string;
  phone?: string;
  email?: string;
  cuit?: string;
  /** Descuento automatico por hermano, en porcentaje entero (0-100). */
  siblingDiscountPct?: number;
  /** Dias de gracia antes de considerar una cuota vencida. */
  graceDays?: number;
  /** Dia de vencimiento por defecto para nuevas cuotas. */
  billingDay?: number;
  /** Recordatorios automaticos: pendiente de configurar proveedor de envio. */
  remindersEnabled?: boolean;
  notes?: string;
};

export const clubs = pgTable(
  "clubs",
  {
    id: uuid().primaryKey().defaultRandom(),
    slug: text().notNull(),
    name: text().notNull(),
    city: text(),
    province: text(),
    discipline: text().notNull().default("basquet"),
    logoUrl: text(),
    primaryColor: text().notNull().default("#0f766e"),
    status: clubStatusEnum().notNull().default("trial"),
    planId: uuid().references(() => plans.id, { onDelete: "set null" }),
    trialEndsAt: timestamp({ withTimezone: true }),
    timezone: text().notNull().default("America/Argentina/Buenos_Aires"),
    settings: jsonb().$type<ClubSettings>().notNull().default({}),
    createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp({ withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (t) => [
    uniqueIndex("clubs_slug_uq").on(t.slug),
    index("clubs_status_idx").on(t.status),
  ],
);

export const subscriptions = pgTable(
  "subscriptions",
  {
    id: uuid().primaryKey().defaultRandom(),
    clubId: uuid()
      .notNull()
      .references(() => clubs.id, { onDelete: "cascade" }),
    planId: uuid().references(() => plans.id, { onDelete: "set null" }),
    status: subscriptionStatusEnum().notNull().default("trialing"),
    periodStart: timestamp({ withTimezone: true }),
    periodEnd: timestamp({ withTimezone: true }),
    /** Proveedor real de cobro. "manual" = registrado por el superadmin. */
    provider: text().notNull().default("manual"),
    providerRef: text(),
    amountCents: integer().notNull().default(0),
    notes: text(),
    createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp({ withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (t) => [uniqueIndex("subscriptions_club_uq").on(t.clubId)],
);

export const subscriptionEvents = pgTable(
  "subscription_events",
  {
    id: uuid().primaryKey().defaultRandom(),
    clubId: uuid()
      .notNull()
      .references(() => clubs.id, { onDelete: "cascade" }),
    subscriptionId: uuid()
      .notNull()
      .references(() => subscriptions.id, { onDelete: "cascade" }),
    type: text().notNull(),
    amountCents: integer().notNull().default(0),
    note: text(),
    providerRef: text(),
    createdByUserId: uuid(),
    happenedAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("subscription_events_club_idx").on(t.clubId, t.happenedAt)],
);

export const users = pgTable(
  "users",
  {
    id: uuid().primaryKey().defaultRandom(),
    email: text().notNull(),
    passwordHash: text().notNull(),
    fullName: text().notNull(),
    phone: text(),
    status: userStatusEnum().notNull().default("active"),
    isPlatformAdmin: boolean().notNull().default(false),
    mustChangePassword: boolean().notNull().default(false),
    lastLoginAt: timestamp({ withTimezone: true }),
    failedLoginCount: integer().notNull().default(0),
    lockedUntil: timestamp({ withTimezone: true }),
    createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp({ withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (t) => [uniqueIndex("users_email_uq").on(t.email)],
);

export const sessions = pgTable(
  "sessions",
  {
    id: uuid().primaryKey().defaultRandom(),
    userId: uuid()
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    /** SHA-256 del token entregado en la cookie. Nunca se guarda el token. */
    tokenHash: text().notNull(),
    clubId: uuid().references(() => clubs.id, { onDelete: "cascade" }),
    expiresAt: timestamp({ withTimezone: true }).notNull(),
    revokedAt: timestamp({ withTimezone: true }),
    ip: text(),
    userAgent: text(),
    createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex("sessions_token_uq").on(t.tokenHash),
    index("sessions_user_idx").on(t.userId),
  ],
);

export const memberships = pgTable(
  "memberships",
  {
    id: uuid().primaryKey().defaultRandom(),
    clubId: uuid()
      .notNull()
      .references(() => clubs.id, { onDelete: "cascade" }),
    userId: uuid()
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    role: membershipRoleEnum().notNull(),
    status: membershipStatusEnum().notNull().default("active"),
    createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp({ withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (t) => [
    uniqueIndex("memberships_club_user_uq").on(t.clubId, t.userId),
    index("memberships_club_role_idx").on(t.clubId, t.role),
  ],
);

export const passwordResetTokens = pgTable(
  "password_reset_tokens",
  {
    id: uuid().primaryKey().defaultRandom(),
    userId: uuid()
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    tokenHash: text().notNull(),
    expiresAt: timestamp({ withTimezone: true }).notNull(),
    usedAt: timestamp({ withTimezone: true }),
    createdByUserId: uuid(),
    createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [uniqueIndex("password_reset_token_uq").on(t.tokenHash)],
);

export const auditLogs = pgTable(
  "audit_logs",
  {
    id: uuid().primaryKey().defaultRandom(),
    clubId: uuid().references(() => clubs.id, { onDelete: "cascade" }),
    actorUserId: uuid().references(() => users.id, { onDelete: "set null" }),
    actorEmail: text(),
    action: text().notNull(),
    entity: text(),
    entityId: text(),
    meta: jsonb().$type<Record<string, unknown>>(),
    ip: text(),
    userAgent: text(),
    createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("audit_logs_club_idx").on(t.clubId, t.createdAt),
    index("audit_logs_actor_idx").on(t.actorUserId, t.createdAt),
  ],
);
