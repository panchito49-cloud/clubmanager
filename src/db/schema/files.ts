import {
  boolean,
  index,
  integer,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";
import { clubs, users } from "./core";

export const documentOwnerEnum = pgEnum("document_owner", [
  "player",
  "payment",
  "trip",
  "club",
]);

/**
 * Archivos privados (comprobantes, autorizaciones, documentacion).
 * Nunca se sirven de forma publica: se descargan por /api/archivos/[id]
 * con verificacion de sesion y club.
 */
export const documents = pgTable(
  "documents",
  {
    id: uuid().primaryKey().defaultRandom(),
    clubId: uuid()
      .notNull()
      .references(() => clubs.id, { onDelete: "cascade" }),
    ownerType: documentOwnerEnum().notNull(),
    ownerId: uuid(),
    fileName: text().notNull(),
    mimeType: text().notNull(),
    sizeBytes: integer().notNull(),
    storageKey: text().notNull(),
    checksum: text(),
    isPublic: boolean().notNull().default(false),
    uploadedByUserId: uuid().references(() => users.id, { onDelete: "set null" }),
    createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("documents_club_owner_idx").on(t.clubId, t.ownerType, t.ownerId),
  ],
);
