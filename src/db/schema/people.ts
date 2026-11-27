import { sql } from "drizzle-orm";
import {
  boolean,
  date,
  index,
  integer,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";
import { clubs, memberships, users } from "./core";

export const playerStatusEnum = pgEnum("player_status", ["active", "inactive"]);
export const genderEnum = pgEnum("gender", ["female", "male", "other"]);
export const teamGenderEnum = pgEnum("team_gender", ["female", "male", "mixed"]);
export const discountTypeEnum = pgEnum("discount_type", [
  "percentage",
  "fixed",
]);

export const categories = pgTable(
  "categories",
  {
    id: uuid().primaryKey().defaultRandom(),
    clubId: uuid()
      .notNull()
      .references(() => clubs.id, { onDelete: "cascade" }),
    name: text().notNull(),
    sport: text().notNull().default("basquet"),
    birthYearFrom: integer(),
    birthYearTo: integer(),
    gender: teamGenderEnum().notNull().default("mixed"),
    sortOrder: integer().notNull().default(0),
    isActive: boolean().notNull().default(true),
    createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp({ withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (t) => [
    uniqueIndex("categories_club_name_gender_uq").on(t.clubId, t.name, t.gender),
    index("categories_club_idx").on(t.clubId, t.sortOrder),
  ],
);

/** Categorias asignadas a un entrenador (alcance de sus permisos). */
export const coachCategories = pgTable(
  "coach_categories",
  {
    id: uuid().primaryKey().defaultRandom(),
    clubId: uuid()
      .notNull()
      .references(() => clubs.id, { onDelete: "cascade" }),
    membershipId: uuid()
      .notNull()
      .references(() => memberships.id, { onDelete: "cascade" }),
    categoryId: uuid()
      .notNull()
      .references(() => categories.id, { onDelete: "cascade" }),
    createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex("coach_categories_uq").on(t.membershipId, t.categoryId),
    index("coach_categories_category_idx").on(t.categoryId),
  ],
);

export const families = pgTable(
  "families",
  {
    id: uuid().primaryKey().defaultRandom(),
    clubId: uuid()
      .notNull()
      .references(() => clubs.id, { onDelete: "cascade" }),
    name: text().notNull(),
    contactName: text(),
    contactPhone: text(),
    contactEmail: text(),
    notes: text(),
    createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp({ withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (t) => [index("families_club_idx").on(t.clubId, t.name)],
);

/** Integrantes adultos de una familia. `userId` existe si tiene acceso al portal. */
export const familyMembers = pgTable(
  "family_members",
  {
    id: uuid().primaryKey().defaultRandom(),
    clubId: uuid()
      .notNull()
      .references(() => clubs.id, { onDelete: "cascade" }),
    familyId: uuid()
      .notNull()
      .references(() => families.id, { onDelete: "cascade" }),
    userId: uuid().references(() => users.id, { onDelete: "set null" }),
    fullName: text().notNull(),
    relationship: text().notNull().default("tutor"),
    phone: text(),
    email: text(),
    isPrimary: boolean().notNull().default(false),
    createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("family_members_family_idx").on(t.familyId),
    index("family_members_user_idx").on(t.userId),
  ],
);

export const players = pgTable(
  "players",
  {
    id: uuid().primaryKey().defaultRandom(),
    clubId: uuid()
      .notNull()
      .references(() => clubs.id, { onDelete: "cascade" }),
    familyId: uuid().references(() => families.id, { onDelete: "set null" }),
    categoryId: uuid().references(() => categories.id, { onDelete: "set null" }),
    userId: uuid().references(() => users.id, { onDelete: "set null" }),
    firstName: text().notNull(),
    lastName: text().notNull(),
    dni: text(),
    birthDate: date(),
    gender: genderEnum(),
    status: playerStatusEnum().notNull().default("active"),
    jerseyNumber: integer(),
    position: text(),
    school: text(),
    address: text(),
    city: text(),
    emergencyContactName: text(),
    emergencyContactPhone: text(),
    bloodType: text(),
    insuranceProvider: text(),
    insuranceNumber: text(),
    medicalCertificateExpiresAt: date(),
    /** Informacion medica sensible: visible solo para staff del club. */
    medicalNotes: text(),
    joinedAt: date(),
    createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp({ withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (t) => [
    index("players_club_status_idx").on(t.clubId, t.status),
    index("players_club_category_idx").on(t.clubId, t.categoryId),
    index("players_family_idx").on(t.familyId),
    // El DNI es opcional; si esta cargado no puede repetirse dentro del club.
    uniqueIndex("players_club_dni_uq")
      .on(t.clubId, t.dni)
      .where(sql`${t.dni} is not null`),
  ],
);

/** Historial del jugador: notas, cambios de categoria, estado y salud. */
export const playerEvents = pgTable(
  "player_events",
  {
    id: uuid().primaryKey().defaultRandom(),
    clubId: uuid()
      .notNull()
      .references(() => clubs.id, { onDelete: "cascade" }),
    playerId: uuid()
      .notNull()
      .references(() => players.id, { onDelete: "cascade" }),
    type: text().notNull().default("note"),
    body: text().notNull(),
    createdByUserId: uuid().references(() => users.id, { onDelete: "set null" }),
    createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("player_events_player_idx").on(t.playerId, t.createdAt)],
);

/** Becas y descuentos individuales. `value` es % (0-100) o centavos fijos. */
export const playerDiscounts = pgTable(
  "player_discounts",
  {
    id: uuid().primaryKey().defaultRandom(),
    clubId: uuid()
      .notNull()
      .references(() => clubs.id, { onDelete: "cascade" }),
    playerId: uuid()
      .notNull()
      .references(() => players.id, { onDelete: "cascade" }),
    type: discountTypeEnum().notNull(),
    value: integer().notNull(),
    reason: text().notNull(),
    startsOn: date().notNull(),
    endsOn: date(),
    isActive: boolean().notNull().default(true),
    createdByUserId: uuid().references(() => users.id, { onDelete: "set null" }),
    createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("player_discounts_player_idx").on(t.playerId, t.isActive)],
);
