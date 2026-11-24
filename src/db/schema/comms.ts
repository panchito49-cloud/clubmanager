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
import { clubs, users } from "./core";
import { categories, families, players } from "./people";

export const channelEnum = pgEnum("message_channel", ["in_app", "whatsapp"]);

export const announcementAudienceEnum = pgEnum("announcement_audience", [
  "all",
  "category",
  "families",
  "coaches",
  "players",
]);

export const announcementStatusEnum = pgEnum("announcement_status", [
  "draft",
  "sent",
]);

export const integrationStatusEnum = pgEnum("integration_status", [
  "not_configured",
  "pending",
  "connected",
  "error",
]);

export const consentStatusEnum = pgEnum("consent_status", [
  "granted",
  "revoked",
]);

export const announcements = pgTable(
  "announcements",
  {
    id: uuid().primaryKey().defaultRandom(),
    clubId: uuid()
      .notNull()
      .references(() => clubs.id, { onDelete: "cascade" }),
    title: text().notNull(),
    body: text().notNull(),
    audience: announcementAudienceEnum().notNull().default("all"),
    categoryId: uuid().references(() => categories.id, {
      onDelete: "set null",
    }),
    channel: channelEnum().notNull().default("in_app"),
    status: announcementStatusEnum().notNull().default("draft"),
    recipientCount: integer().notNull().default(0),
    sentAt: timestamp({ withTimezone: true }),
    createdByUserId: uuid().references(() => users.id, { onDelete: "set null" }),
    createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("announcements_club_idx").on(t.clubId, t.createdAt)],
);

/** Bandeja interna: una notificacion por usuario destinatario. */
export const notifications = pgTable(
  "notifications",
  {
    id: uuid().primaryKey().defaultRandom(),
    clubId: uuid()
      .notNull()
      .references(() => clubs.id, { onDelete: "cascade" }),
    userId: uuid()
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    title: text().notNull(),
    body: text(),
    link: text(),
    readAt: timestamp({ withTimezone: true }),
    createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("notifications_user_idx").on(t.userId, t.createdAt),
    index("notifications_unread_idx").on(t.userId, t.readAt),
  ],
);

/** Plantillas de mensajes. Para WhatsApp requieren aprobacion de Meta. */
export const messageTemplates = pgTable(
  "message_templates",
  {
    id: uuid().primaryKey().defaultRandom(),
    clubId: uuid()
      .notNull()
      .references(() => clubs.id, { onDelete: "cascade" }),
    key: text().notNull(),
    name: text().notNull(),
    channel: channelEnum().notNull().default("whatsapp"),
    body: text().notNull(),
    providerTemplateName: text(),
    providerStatus: text().notNull().default("draft"),
    createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp({ withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (t) => [uniqueIndex("message_templates_club_key_uq").on(t.clubId, t.key)],
);

/**
 * Estado de la integracion con WhatsApp Business Platform.
 * `config` solo guarda identificadores no secretos (phone_number_id, WABA id).
 * El token de acceso vive en variables de entorno del servidor.
 */
export const integrations = pgTable(
  "integrations",
  {
    id: uuid().primaryKey().defaultRandom(),
    clubId: uuid()
      .notNull()
      .references(() => clubs.id, { onDelete: "cascade" }),
    provider: text().notNull(),
    status: integrationStatusEnum().notNull().default("not_configured"),
    config: jsonb().$type<Record<string, string>>().notNull().default({}),
    secretRef: text(),
    connectedAt: timestamp({ withTimezone: true }),
    lastCheckedAt: timestamp({ withTimezone: true }),
    lastError: text(),
    createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp({ withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (t) => [uniqueIndex("integrations_club_provider_uq").on(t.clubId, t.provider)],
);

/** Consentimiento explicito de contacto por WhatsApp (Ley 25.326). */
export const messageConsents = pgTable(
  "message_consents",
  {
    id: uuid().primaryKey().defaultRandom(),
    clubId: uuid()
      .notNull()
      .references(() => clubs.id, { onDelete: "cascade" }),
    familyId: uuid().references(() => families.id, { onDelete: "cascade" }),
    playerId: uuid().references(() => players.id, { onDelete: "cascade" }),
    phone: text().notNull(),
    channel: channelEnum().notNull().default("whatsapp"),
    status: consentStatusEnum().notNull().default("granted"),
    source: text(),
    evidenceDocumentId: uuid(),
    updatedAt: timestamp({ withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
    createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex("message_consents_uq").on(t.clubId, t.phone, t.channel),
    index("message_consents_family_idx").on(t.familyId),
  ],
);

/** Cola de envio de WhatsApp. Se procesa solo si la integracion esta conectada. */
export const messageOutbox = pgTable(
  "message_outbox",
  {
    id: uuid().primaryKey().defaultRandom(),
    clubId: uuid()
      .notNull()
      .references(() => clubs.id, { onDelete: "cascade" }),
    toPhone: text().notNull(),
    templateKey: text(),
    body: text().notNull(),
    status: text().notNull().default("queued"),
    providerMessageId: text(),
    error: text(),
    attempts: integer().notNull().default(0),
    sentAt: timestamp({ withTimezone: true }),
    createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("message_outbox_status_idx").on(t.clubId, t.status)],
);

/** Baja voluntaria de WhatsApp (webhook). */
export const whatsappOptOuts = pgTable(
  "whatsapp_opt_outs",
  {
    id: uuid().primaryKey().defaultRandom(),
    clubId: uuid().notNull().references(() => clubs.id, { onDelete: "cascade" }),
    phone: text().notNull(),
    reason: text(),
    active: boolean().notNull().default(true),
    createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [uniqueIndex("whatsapp_opt_outs_uq").on(t.clubId, t.phone)],
);
