import {
  boolean,
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
import { chargeStatusEnum } from "./finance";
import { categories, players } from "./people";

export const trainingStatusEnum = pgEnum("training_status", [
  "scheduled",
  "completed",
  "cancelled",
]);

export const attendanceStatusEnum = pgEnum("attendance_status", [
  "present",
  "absent",
  "late",
  "justified",
]);

export const matchStatusEnum = pgEnum("match_status", [
  "scheduled",
  "played",
  "cancelled",
]);

export const callupStatusEnum = pgEnum("callup_status", [
  "invited",
  "confirmed",
  "declined",
]);

export const tripStatusEnum = pgEnum("trip_status", [
  "draft",
  "open",
  "confirmed",
  "closed",
  "cancelled",
]);

export const authorizationStatusEnum = pgEnum("authorization_status", [
  "pending",
  "granted",
  "rejected",
]);

export const trainings = pgTable(
  "trainings",
  {
    id: uuid().primaryKey().defaultRandom(),
    clubId: uuid()
      .notNull()
      .references(() => clubs.id, { onDelete: "cascade" }),
    categoryId: uuid()
      .notNull()
      .references(() => categories.id, { onDelete: "cascade" }),
    coachMembershipId: uuid().references(() => memberships.id, {
      onDelete: "set null",
    }),
    title: text().notNull().default("Entrenamiento"),
    startsAt: timestamp({ withTimezone: true }).notNull(),
    endsAt: timestamp({ withTimezone: true }),
    location: text(),
    notes: text(),
    status: trainingStatusEnum().notNull().default("scheduled"),
    createdByUserId: uuid().references(() => users.id, { onDelete: "set null" }),
    createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("trainings_club_start_idx").on(t.clubId, t.startsAt),
    index("trainings_category_idx").on(t.categoryId, t.startsAt),
  ],
);

export const attendance = pgTable(
  "attendance",
  {
    id: uuid().primaryKey().defaultRandom(),
    clubId: uuid()
      .notNull()
      .references(() => clubs.id, { onDelete: "cascade" }),
    trainingId: uuid()
      .notNull()
      .references(() => trainings.id, { onDelete: "cascade" }),
    playerId: uuid()
      .notNull()
      .references(() => players.id, { onDelete: "cascade" }),
    status: attendanceStatusEnum().notNull(),
    note: text(),
    recordedByUserId: uuid().references(() => users.id, {
      onDelete: "set null",
    }),
    recordedAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex("attendance_training_player_uq").on(t.trainingId, t.playerId),
    index("attendance_player_idx").on(t.playerId),
  ],
);

export const matches = pgTable(
  "matches",
  {
    id: uuid().primaryKey().defaultRandom(),
    clubId: uuid()
      .notNull()
      .references(() => clubs.id, { onDelete: "cascade" }),
    categoryId: uuid()
      .notNull()
      .references(() => categories.id, { onDelete: "cascade" }),
    coachMembershipId: uuid().references(() => memberships.id, {
      onDelete: "set null",
    }),
    rival: text().notNull(),
    startsAt: timestamp({ withTimezone: true }).notNull(),
    location: text(),
    isHome: boolean().notNull().default(true),
    status: matchStatusEnum().notNull().default("scheduled"),
    ourScore: integer(),
    rivalScore: integer(),
    notes: text(),
    createdByUserId: uuid().references(() => users.id, { onDelete: "set null" }),
    createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("matches_club_start_idx").on(t.clubId, t.startsAt),
    index("matches_category_idx").on(t.categoryId, t.startsAt),
  ],
);

export const callups = pgTable(
  "callups",
  {
    id: uuid().primaryKey().defaultRandom(),
    clubId: uuid()
      .notNull()
      .references(() => clubs.id, { onDelete: "cascade" }),
    matchId: uuid()
      .notNull()
      .references(() => matches.id, { onDelete: "cascade" }),
    playerId: uuid()
      .notNull()
      .references(() => players.id, { onDelete: "cascade" }),
    status: callupStatusEnum().notNull().default("invited"),
    respondedByUserId: uuid().references(() => users.id, {
      onDelete: "set null",
    }),
    respondedAt: timestamp({ withTimezone: true }),
    note: text(),
    createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex("callups_match_player_uq").on(t.matchId, t.playerId),
    index("callups_player_idx").on(t.playerId),
  ],
);

export const trips = pgTable(
  "trips",
  {
    id: uuid().primaryKey().defaultRandom(),
    clubId: uuid()
      .notNull()
      .references(() => clubs.id, { onDelete: "cascade" }),
    matchId: uuid().references(() => matches.id, { onDelete: "set null" }),
    categoryId: uuid().references(() => categories.id, {
      onDelete: "set null",
    }),
    title: text().notNull(),
    destination: text().notNull(),
    departureAt: timestamp({ withTimezone: true }).notNull(),
    returnAt: timestamp({ withTimezone: true }),
    transport: text(),
    costCents: integer().notNull().default(0),
    seats: integer(),
    authorizationRequired: boolean().notNull().default(true),
    status: tripStatusEnum().notNull().default("draft"),
    notes: text(),
    createdByUserId: uuid().references(() => users.id, { onDelete: "set null" }),
    createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("trips_club_departure_idx").on(t.clubId, t.departureAt)],
);

export const tripPassengers = pgTable(
  "trip_passengers",
  {
    id: uuid().primaryKey().defaultRandom(),
    clubId: uuid()
      .notNull()
      .references(() => clubs.id, { onDelete: "cascade" }),
    tripId: uuid()
      .notNull()
      .references(() => trips.id, { onDelete: "cascade" }),
    playerId: uuid()
      .notNull()
      .references(() => players.id, { onDelete: "cascade" }),
    status: callupStatusEnum().notNull().default("invited"),
    /** Estado del pago del viaje (pendiente, parcial, pagado, anulado). */
    paymentStatus: chargeStatusEnum().notNull().default("pending"),
    paymentNote: text(),
    authorizationStatus: authorizationStatusEnum().notNull().default("pending"),
    authorizedByUserId: uuid().references(() => users.id, {
      onDelete: "set null",
    }),
    authorizedAt: timestamp({ withTimezone: true }),
    respondedAt: timestamp({ withTimezone: true }),
    note: text(),
    createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex("trip_passengers_uq").on(t.tripId, t.playerId),
    index("trip_passengers_player_idx").on(t.playerId),
  ],
);
