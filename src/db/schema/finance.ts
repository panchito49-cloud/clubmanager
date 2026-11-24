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
import { clubs, users } from "./core";
import { documents } from "./files";
import { categories, families, players } from "./people";

/**
 * Modulo economico. Importes en centavos de ARS.
 *
 * El estado "vencido" NO se persiste: se deriva de due_date + estado, para que
 * nunca quede desactualizado. Los estados persistidos son los del ciclo de vida
 * del comprobante y del pago.
 */

export const chargeStatusEnum = pgEnum("charge_status", [
  "pending",
  "partial",
  "paid",
  "void",
]);

export const paymentStatusEnum = pgEnum("payment_status", [
  "declared",
  "under_review",
  "approved",
  "rejected",
]);

export const paymentMethodEnum = pgEnum("payment_method", [
  "cash",
  "transfer",
  "mercadopago",
  "other",
]);

/** Plantilla de cuota: define importe por categoria y dia de vencimiento. */
export const feePlans = pgTable(
  "fee_plans",
  {
    id: uuid().primaryKey().defaultRandom(),
    clubId: uuid()
      .notNull()
      .references(() => clubs.id, { onDelete: "cascade" }),
    name: text().notNull(),
    concept: text().notNull().default("Cuota mensual"),
    categoryId: uuid().references(() => categories.id, {
      onDelete: "set null",
    }),
    amountCents: integer().notNull(),
    dueDay: integer().notNull().default(10),
    /** Si es false, no se genera automaticamente al liquidar el mes. */
    isActive: boolean().notNull().default(true),
    createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp({ withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (t) => [index("fee_plans_club_idx").on(t.clubId, t.isActive)],
);

/** Obligacion de pago (cuota, cuota extraordinaria, viaje, etc.). */
export const charges = pgTable(
  "charges",
  {
    id: uuid().primaryKey().defaultRandom(),
    clubId: uuid()
      .notNull()
      .references(() => clubs.id, { onDelete: "cascade" }),
    playerId: uuid().references(() => players.id, { onDelete: "set null" }),
    familyId: uuid().references(() => families.id, { onDelete: "set null" }),
    feePlanId: uuid().references(() => feePlans.id, { onDelete: "set null" }),
    concept: text().notNull(),
    /** Periodo facturado en formato YYYY-MM. */
    period: text().notNull(),
    dueDate: date().notNull(),
    amountCents: integer().notNull(),
    discountCents: integer().notNull().default(0),
    totalCents: integer().notNull(),
    paidCents: integer().notNull().default(0),
    status: chargeStatusEnum().notNull().default("pending"),
    notes: text(),
    createdByUserId: uuid().references(() => users.id, { onDelete: "set null" }),
    voidedAt: timestamp({ withTimezone: true }),
    voidedByUserId: uuid().references(() => users.id, { onDelete: "set null" }),
    createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp({ withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (t) => [
    index("charges_club_period_idx").on(t.clubId, t.period),
    index("charges_club_status_idx").on(t.clubId, t.status),
    index("charges_family_idx").on(t.familyId),
    index("charges_player_idx").on(t.playerId),
    // Evita duplicar la cuota generada de un jugador para un mismo periodo.
    uniqueIndex("charges_generated_uq")
      .on(t.clubId, t.playerId, t.feePlanId, t.period)
      .where(sql`voided_at is null and fee_plan_id is not null`),
  ],
);

/**
 * Pago declarado por una familia o registrado por el club.
 * Un pago declarado NO cancela deuda: solo al aprobarse se imputa a cuotas.
 */
export const payments = pgTable(
  "payments",
  {
    id: uuid().primaryKey().defaultRandom(),
    clubId: uuid()
      .notNull()
      .references(() => clubs.id, { onDelete: "cascade" }),
    familyId: uuid().references(() => families.id, { onDelete: "set null" }),
    playerId: uuid().references(() => players.id, { onDelete: "set null" }),
    amountCents: integer().notNull(),
    method: paymentMethodEnum().notNull(),
    status: paymentStatusEnum().notNull().default("declared"),
    payerName: text(),
    reference: text(),
    receiptDocumentId: uuid().references(() => documents.id, {
      onDelete: "set null",
    }),
    notes: text(),
    declaredByUserId: uuid().references(() => users.id, { onDelete: "set null" }),
    reviewedByUserId: uuid().references(() => users.id, { onDelete: "set null" }),
    reviewedAt: timestamp({ withTimezone: true }),
    rejectionReason: text(),
    /**
     * Importe del pago que no pudo imputarse a ninguna cuota (saldo a favor).
     * Se calcula al aprobar el pago y queda registrado para futuras cuotas.
     */
    creditCents: integer().notNull().default(0),
    createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp({ withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (t) => [
    index("payments_club_status_idx").on(t.clubId, t.status),
    index("payments_family_idx").on(t.familyId),
    index("payments_club_created_idx").on(t.clubId, t.createdAt),
    // Evita declarar dos veces la misma transferencia por numero de operacion.
    uniqueIndex("payments_club_reference_uq")
      .on(t.clubId, t.reference)
      .where(sql`reference is not null and status <> 'rejected'`),
  ],
);

/** Imputacion de un pago a una o varias obligaciones. */
export const paymentApplications = pgTable(
  "payment_applications",
  {
    id: uuid().primaryKey().defaultRandom(),
    clubId: uuid()
      .notNull()
      .references(() => clubs.id, { onDelete: "cascade" }),
    paymentId: uuid()
      .notNull()
      .references(() => payments.id, { onDelete: "cascade" }),
    chargeId: uuid()
      .notNull()
      .references(() => charges.id, { onDelete: "cascade" }),
    amountCents: integer().notNull(),
    createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex("payment_applications_uq").on(t.paymentId, t.chargeId),
    index("payment_applications_charge_idx").on(t.chargeId),
  ],
);
