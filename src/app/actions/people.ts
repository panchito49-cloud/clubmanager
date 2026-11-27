"use server";

import { redirect } from "next/navigation";
import { and, eq, sql } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db/client";
import { categories, families, players } from "@/db/schema";
import { writeAudit } from "@/server/audit";
import { assertCan, getTenant } from "@/server/tenant";

export type PeopleFormState = { error?: string; ok?: string } | null;

const optionalText = z
  .string()
  .trim()
  .max(200)
  .optional()
  .transform((value) => (value ? value : null));

const optionalDate = z
  .string()
  .trim()
  .optional()
  .transform((value) => (value ? value : null))
  .refine((value) => value === null || /^\d{4}-\d{2}-\d{2}$/.test(value), {
    message: "Fecha inválida",
  });

const playerSchema = z.object({
  firstName: z.string().trim().min(1, "El nombre es obligatorio").max(80),
  lastName: z.string().trim().min(1, "El apellido es obligatorio").max(80),
  dni: z
    .string()
    .trim()
    .max(20)
    .optional()
    .transform((value) => (value ? value.replace(/[^\d]/g, "") || null : null)),
  birthDate: optionalDate,
  gender: z.enum(["female", "male", "other"]).optional().or(z.literal("")),
  categoryId: z.string().uuid().optional().or(z.literal("")),
  familyId: z.string().uuid().optional().or(z.literal("")),
  jerseyNumber: z.coerce.number().int().min(0).max(99).optional().or(z.literal("")),
  position: optionalText,
  school: optionalText,
  address: optionalText,
  city: optionalText,
  emergencyContactName: optionalText,
  emergencyContactPhone: optionalText,
  bloodType: optionalText,
  insuranceProvider: optionalText,
  insuranceNumber: optionalText,
  medicalCertificateExpiresAt: optionalDate,
  medicalNotes: optionalText,
  joinedAt: optionalDate,
});

function toNumber(value: FormDataEntryValue | null): number | null {
  const text = String(value ?? "").trim();
  if (!text) return null;
  const parsed = Number(text);
  return Number.isFinite(parsed) ? parsed : null;
}

function parsePlayer(formData: FormData) {
  return playerSchema.safeParse({
    firstName: formData.get("firstName"),
    lastName: formData.get("lastName"),
    dni: formData.get("dni"),
    birthDate: formData.get("birthDate"),
    gender: formData.get("gender") ?? "",
    categoryId: formData.get("categoryId") ?? "",
    familyId: formData.get("familyId") ?? "",
    jerseyNumber: formData.get("jerseyNumber") ?? "",
    position: formData.get("position"),
    school: formData.get("school"),
    address: formData.get("address"),
    city: formData.get("city"),
    emergencyContactName: formData.get("emergencyContactName"),
    emergencyContactPhone: formData.get("emergencyContactPhone"),
    bloodType: formData.get("bloodType"),
    insuranceProvider: formData.get("insuranceProvider"),
    insuranceNumber: formData.get("insuranceNumber"),
    medicalCertificateExpiresAt: formData.get("medicalCertificateExpiresAt"),
    medicalNotes: formData.get("medicalNotes"),
    joinedAt: formData.get("joinedAt"),
  });
}

async function assertClubCategory(clubId: string, categoryId: string) {
  const [row] = await db
    .select({ id: categories.id })
    .from(categories)
    .where(and(eq(categories.id, categoryId), eq(categories.clubId, clubId)))
    .limit(1);
  if (!row) throw new Error("La categoría no pertenece al club.");
}

async function assertClubFamily(clubId: string, familyId: string) {
  const [row] = await db
    .select({ id: families.id })
    .from(families)
    .where(and(eq(families.id, familyId), eq(families.clubId, clubId)))
    .limit(1);
  if (!row) throw new Error("La familia no pertenece al club.");
}

export async function createPlayerAction(
  _prev: PeopleFormState,
  formData: FormData,
): Promise<PeopleFormState> {
  const ctx = await getTenant();
  assertCan(ctx, "players.manage");

  const parsed = parsePlayer(formData);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Revisá los datos del jugador." };
  }
  const data = parsed.data;

  try {
    if (data.categoryId) await assertClubCategory(ctx.club.id, data.categoryId);
    if (data.familyId) await assertClubFamily(ctx.club.id, data.familyId);

    const [row] = await db
      .insert(players)
      .values({
        clubId: ctx.club.id,
        firstName: data.firstName,
        lastName: data.lastName,
        dni: data.dni,
        birthDate: data.birthDate,
        gender: data.gender || null,
        categoryId: data.categoryId || null,
        familyId: data.familyId || null,
        jerseyNumber: toNumber(formData.get("jerseyNumber")),
        position: data.position,
        school: data.school,
        address: data.address,
        city: data.city,
        emergencyContactName: data.emergencyContactName,
        emergencyContactPhone: data.emergencyContactPhone,
        bloodType: data.bloodType,
        insuranceProvider: data.insuranceProvider,
        insuranceNumber: data.insuranceNumber,
        medicalCertificateExpiresAt: data.medicalCertificateExpiresAt,
        medicalNotes: data.medicalNotes,
        joinedAt: data.joinedAt,
      })
      .returning({ id: players.id });

    await writeAudit({
      clubId: ctx.club.id,
      actorUserId: ctx.auth.user.id,
      actorEmail: ctx.auth.user.email,
      action: "player.created",
      entity: "player",
      entityId: row.id,
      meta: { name: `${data.firstName} ${data.lastName}` },
    });

    redirect(`/app/jugadores/${row.id}?ok=${encodeURIComponent("Jugador creado.")}`);
  } catch (error) {
    if (error instanceof Error && error.message.includes("players_club_dni_uq")) {
      return { error: "Ya existe un jugador con ese DNI en el club." };
    }
    if (error instanceof Error && error.message.startsWith("NEXT_REDIRECT")) throw error;
    console.error("[players.create]", error);
    return { error: "No se pudo crear el jugador. Intentá nuevamente." };
  }
}

export async function updatePlayerAction(
  playerId: string,
  _prev: PeopleFormState,
  formData: FormData,
): Promise<PeopleFormState> {
  const ctx = await getTenant();
  assertCan(ctx, "players.manage");

  const [existing] = await db
    .select({ id: players.id })
    .from(players)
    .where(and(eq(players.id, playerId), eq(players.clubId, ctx.club.id)))
    .limit(1);
  if (!existing) return { error: "El jugador no existe en este club." };

  const parsed = parsePlayer(formData);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Revisá los datos del jugador." };
  }
  const data = parsed.data;

  try {
    if (data.categoryId) await assertClubCategory(ctx.club.id, data.categoryId);
    if (data.familyId) await assertClubFamily(ctx.club.id, data.familyId);

    await db
      .update(players)
      .set({
        firstName: data.firstName,
        lastName: data.lastName,
        dni: data.dni,
        birthDate: data.birthDate,
        gender: data.gender || null,
        categoryId: data.categoryId || null,
        familyId: data.familyId || null,
        jerseyNumber: toNumber(formData.get("jerseyNumber")),
        position: data.position,
        school: data.school,
        address: data.address,
        city: data.city,
        emergencyContactName: data.emergencyContactName,
        emergencyContactPhone: data.emergencyContactPhone,
        bloodType: data.bloodType,
        insuranceProvider: data.insuranceProvider,
        insuranceNumber: data.insuranceNumber,
        medicalCertificateExpiresAt: data.medicalCertificateExpiresAt,
        medicalNotes: data.medicalNotes,
        joinedAt: data.joinedAt,
        updatedAt: new Date(),
      })
      .where(and(eq(players.id, playerId), eq(players.clubId, ctx.club.id)));

    await writeAudit({
      clubId: ctx.club.id,
      actorUserId: ctx.auth.user.id,
      actorEmail: ctx.auth.user.email,
      action: "player.updated",
      entity: "player",
      entityId: playerId,
    });

    return { ok: "Datos del jugador actualizados." };
  } catch (error) {
    if (error instanceof Error && error.message.includes("players_club_dni_uq")) {
      return { error: "Ya existe un jugador con ese DNI en el club." };
    }
    console.error("[players.update]", error);
    return { error: "No se pudieron guardar los cambios." };
  }
}

export async function togglePlayerStatusAction(formData: FormData): Promise<void> {
  const ctx = await getTenant();
  assertCan(ctx, "players.manage");

  const playerId = String(formData.get("playerId") ?? "");
  const nextStatus = formData.get("status") === "inactive" ? "inactive" : "active";

  await db
    .update(players)
    .set({ status: nextStatus, updatedAt: new Date() })
    .where(and(eq(players.id, playerId), eq(players.clubId, ctx.club.id)));

  await writeAudit({
    clubId: ctx.club.id,
    actorUserId: ctx.auth.user.id,
    actorEmail: ctx.auth.user.email,
    action: nextStatus === "active" ? "player.activated" : "player.deactivated",
    entity: "player",
    entityId: playerId,
  });

  redirect(`/app/jugadores/${playerId}`);
}

// Familias -------------------------------------------------------------------

const familySchema = z.object({
  name: z.string().trim().min(1, "El nombre de la familia es obligatorio").max(120),
  contactName: z.string().trim().min(1, "El contacto es obligatorio").max(120),
  contactPhone: z.string().trim().min(6, "Ingresá un teléfono de contacto").max(40),
  contactEmail: z
    .string()
    .trim()
    .max(160)
    .optional()
    .transform((value) => (value ? value : null))
    .refine((value) => value === null || /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(value), {
      message: "Email inválido",
    }),
  notes: optionalText,
});

function parseFamily(formData: FormData) {
  return familySchema.safeParse({
    name: formData.get("name"),
    contactName: formData.get("contactName"),
    contactPhone: formData.get("contactPhone"),
    contactEmail: formData.get("contactEmail"),
    notes: formData.get("notes"),
  });
}

export async function createFamilyAction(
  _prev: PeopleFormState,
  formData: FormData,
): Promise<PeopleFormState> {
  const ctx = await getTenant();
  assertCan(ctx, "families.manage");

  const parsed = parseFamily(formData);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Revisá los datos." };
  }

  try {
    const [row] = await db
      .insert(families)
      .values({
        clubId: ctx.club.id,
        name: parsed.data.name,
        contactName: parsed.data.contactName,
        contactPhone: parsed.data.contactPhone,
        contactEmail: parsed.data.contactEmail,
        notes: parsed.data.notes,
      })
      .returning({ id: families.id });

    await writeAudit({
      clubId: ctx.club.id,
      actorUserId: ctx.auth.user.id,
      actorEmail: ctx.auth.user.email,
      action: "family.created",
      entity: "family",
      entityId: row.id,
      meta: { name: parsed.data.name },
    });

    redirect(`/app/familias/${row.id}?ok=${encodeURIComponent("Familia creada.")}`);
  } catch (error) {
    if (error instanceof Error && error.message.startsWith("NEXT_REDIRECT")) throw error;
    console.error("[families.create]", error);
    return { error: "No se pudo crear la familia." };
  }
}

export async function updateFamilyAction(
  familyId: string,
  _prev: PeopleFormState,
  formData: FormData,
): Promise<PeopleFormState> {
  const ctx = await getTenant();
  assertCan(ctx, "families.manage");

  const [existing] = await db
    .select({ id: families.id })
    .from(families)
    .where(and(eq(families.id, familyId), eq(families.clubId, ctx.club.id)))
    .limit(1);
  if (!existing) return { error: "La familia no existe en este club." };

  const parsed = parseFamily(formData);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Revisá los datos." };
  }

  try {
    await db
      .update(families)
      .set({
        name: parsed.data.name,
        contactName: parsed.data.contactName,
        contactPhone: parsed.data.contactPhone,
        contactEmail: parsed.data.contactEmail,
        notes: parsed.data.notes,
        updatedAt: new Date(),
      })
      .where(and(eq(families.id, familyId), eq(families.clubId, ctx.club.id)));

    await writeAudit({
      clubId: ctx.club.id,
      actorUserId: ctx.auth.user.id,
      actorEmail: ctx.auth.user.email,
      action: "family.updated",
      entity: "family",
      entityId: familyId,
    });

    return { ok: "Datos de la familia actualizados." };
  } catch (error) {
    console.error("[families.update]", error);
    return { error: "No se pudieron guardar los cambios." };
  }
}

// Categorias -----------------------------------------------------------------

const categorySchema = z.object({
  name: z.string().trim().min(1, "El nombre es obligatorio").max(60),
  birthYearFrom: z.coerce.number().int().min(1950).max(2100).optional().or(z.literal("")),
  birthYearTo: z.coerce.number().int().min(1950).max(2100).optional().or(z.literal("")),
  gender: z.enum(["female", "male", "mixed"]),
  sortOrder: z.coerce.number().int().min(0).max(999).optional().or(z.literal("")),
});

function parseCategory(formData: FormData) {
  return categorySchema.safeParse({
    name: formData.get("name"),
    birthYearFrom: formData.get("birthYearFrom") ?? "",
    birthYearTo: formData.get("birthYearTo") ?? "",
    gender: formData.get("gender") ?? "mixed",
    sortOrder: formData.get("sortOrder") ?? "",
  });
}

export async function createCategoryAction(
  _prev: PeopleFormState,
  formData: FormData,
): Promise<PeopleFormState> {
  const ctx = await getTenant();
  assertCan(ctx, "categories.manage");

  const parsed = parseCategory(formData);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Revisá los datos." };
  }

  try {
    await db.insert(categories).values({
      clubId: ctx.club.id,
      name: parsed.data.name,
      birthYearFrom: toNumber(formData.get("birthYearFrom")),
      birthYearTo: toNumber(formData.get("birthYearTo")),
      gender: parsed.data.gender,
      sortOrder: toNumber(formData.get("sortOrder")) ?? 0,
    });

    await writeAudit({
      clubId: ctx.club.id,
      actorUserId: ctx.auth.user.id,
      actorEmail: ctx.auth.user.email,
      action: "category.created",
      meta: { name: parsed.data.name },
    });

    return { ok: `Categoría "${parsed.data.name}" creada.` };
  } catch (error) {
    if (
      error instanceof Error &&
      (error.message.includes("categories_club_name_gender_uq") ||
        error.message.includes("categories_club_name_uq"))
    ) {
      return { error: "Ya existe una categoría con ese nombre para esa rama deportiva." };
    }
    console.error("[categories.create]", error);
    return { error: "No se pudo crear la categoría." };
  }
}

export async function updateCategoryAction(
  categoryId: string,
  _prev: PeopleFormState,
  formData: FormData,
): Promise<PeopleFormState> {
  const ctx = await getTenant();
  assertCan(ctx, "categories.manage");

  const parsed = parseCategory(formData);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Revisá los datos." };
  }

  try {
    await db
      .update(categories)
      .set({
        name: parsed.data.name,
        birthYearFrom: toNumber(formData.get("birthYearFrom")),
        birthYearTo: toNumber(formData.get("birthYearTo")),
        gender: parsed.data.gender,
        sortOrder: toNumber(formData.get("sortOrder")) ?? 0,
        isActive: formData.get("isActive") === "on",
        updatedAt: new Date(),
      })
      .where(and(eq(categories.id, categoryId), eq(categories.clubId, ctx.club.id)));

    await writeAudit({
      clubId: ctx.club.id,
      actorUserId: ctx.auth.user.id,
      actorEmail: ctx.auth.user.email,
      action: "category.updated",
      entity: "category",
      entityId: categoryId,
    });

    return { ok: "Categoría actualizada." };
  } catch (error) {
    if (
      error instanceof Error &&
      (error.message.includes("categories_club_name_gender_uq") ||
        error.message.includes("categories_club_name_uq"))
    ) {
      return { error: "Ya existe una categoría con ese nombre para esa rama deportiva." };
    }
    console.error("[categories.update]", error);
    return { error: "No se pudo actualizar la categoría." };
  }
}

export async function deleteCategoryAction(formData: FormData): Promise<void> {
  const ctx = await getTenant();
  assertCan(ctx, "categories.manage");

  const categoryId = String(formData.get("categoryId") ?? "");

  const [usage] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(players)
    .where(and(eq(players.clubId, ctx.club.id), eq(players.categoryId, categoryId)));

  if (Number(usage?.count ?? 0) > 0) {
    redirect(
      `/app/categorias?error=${encodeURIComponent(
        "No se puede eliminar una categoría con jugadores asignados. Desactivala en su lugar.",
      )}`,
    );
  }

  await db
    .delete(categories)
    .where(and(eq(categories.id, categoryId), eq(categories.clubId, ctx.club.id)));

  await writeAudit({
    clubId: ctx.club.id,
    actorUserId: ctx.auth.user.id,
    actorEmail: ctx.auth.user.email,
    action: "category.deleted",
    entity: "category",
    entityId: categoryId,
  });

  redirect("/app/categorias");
}

export type ImportResultState = {
  error?: string;
  ok?: string;
  importedCount?: number;
  skippedCount?: number;
  details?: string[];
} | null;

export async function importPlayersAction(
  _prev: ImportResultState,
  formData: FormData,
): Promise<ImportResultState> {
  const ctx = await getTenant();
  assertCan(ctx, "players.manage");

  const file = formData.get("file") as File | null;
  const rawText = (formData.get("csvText") as string | null)?.trim() || "";

  let content = "";

  if (file && file.size > 0) {
    if (file.size > 5 * 1024 * 1024) {
      return { error: "El archivo no puede superar los 5 MB." };
    }
    content = await file.text();
  } else if (rawText) {
    content = rawText;
  } else {
    return { error: "Seleccioná un archivo CSV o pegá el contenido en el cuadro de texto." };
  }

  // Quitar BOM si existe
  if (content.charCodeAt(0) === 0xfeff) {
    content = content.slice(1);
  }

  const lines = content
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.length > 0);

  if (lines.length < 2) {
    return { error: "El archivo no contiene filas de datos suficientes (se requiere encabezado y al menos una fila)." };
  }

  const headerLine = lines[0];
  const delimiter = headerLine.includes(";") ? ";" : ",";

  const normalizeHeader = (h: string) =>
    h
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]/g, "");

  const headers = headerLine.split(delimiter).map(normalizeHeader);

  const getIdx = (keys: string[]) => headers.findIndex((h) => keys.includes(h));

  const firstNameIdx = getIdx(["nombre", "firstname", "nombres"]);
  const lastNameIdx = getIdx(["apellido", "lastname", "apellidos"]);
  const dniIdx = getIdx(["dni", "documento", "identification"]);
  const birthDateIdx = getIdx(["fechanacimiento", "nacimiento", "birthdate", "fechanac"]);
  const genderIdx = getIdx(["genero", "sexo", "gender"]);
  const categoryIdx = getIdx(["categoria", "category", "division"]);
  const ramaIdx = getIdx(["rama", "generocategoria", "categorygender"]);
  const familyIdx = getIdx(["familia", "family", "grupofamiliar"]);
  const phoneIdx = getIdx(["telefonocontacto", "telefono", "phone", "celular"]);
  const emailIdx = getIdx(["emailcontacto", "email", "correo"]);
  const positionIdx = getIdx(["posicion", "puesto", "position"]);
  const jerseyIdx = getIdx(["camiseta", "dorsal", "jerseynumber", "numero"]);
  const insuranceIdx = getIdx(["obrasocial", "mutual", "seguro", "insuranceprovider"]);

  if (firstNameIdx === -1 || lastNameIdx === -1) {
    return {
      error:
        "El encabezado debe contener al menos las columnas 'Nombre' y 'Apellido'. Descargá la plantilla para ver el formato correcto.",
    };
  }

  // Pre-cargar categorias del club
  const clubCategories = await db
    .select()
    .from(categories)
    .where(eq(categories.clubId, ctx.club.id));

  // Pre-cargar familias existentes para buscar por nombre
  const clubFamilies = await db
    .select()
    .from(families)
    .where(eq(families.clubId, ctx.club.id));

  const familyMapByName = new Map<string, string>();
  for (const f of clubFamilies) {
    familyMapByName.set(f.name.toLowerCase().trim(), f.id);
  }

  // Pre-cargar DNIs existentes del club
  const existingDnis = new Set<string>();
  const playersWithDni = await db
    .select({ dni: players.dni })
    .from(players)
    .where(and(eq(players.clubId, ctx.club.id), sql`${players.dni} is not null`));

  for (const p of playersWithDni) {
    if (p.dni) existingDnis.add(p.dni);
  }

  let importedCount = 0;
  let skippedCount = 0;
  const details: string[] = [];

  for (let i = 1; i < lines.length; i++) {
    const rawLine = lines[i];
    const cols = rawLine.split(delimiter).map((c) => c.trim().replace(/^["']|["']$/g, ""));

    const firstName = cols[firstNameIdx] || "";
    const lastName = cols[lastNameIdx] || "";

    if (!firstName || !lastName) {
      skippedCount++;
      details.push(`Fila ${i + 1}: Omitida por no tener Nombre o Apellido.`);
      continue;
    }

    const rawDni = dniIdx !== -1 ? cols[dniIdx]?.replace(/[^\d]/g, "") || null : null;
    if (rawDni && existingDnis.has(rawDni)) {
      skippedCount++;
      details.push(`Fila ${i + 1} (${firstName} ${lastName}): Omitida porque el DNI ${rawDni} ya está registrado.`);
      continue;
    }

    // Normalizar fecha de nacimiento (YYYY-MM-DD o DD/MM/YYYY)
    let birthDate: string | null = null;
    if (birthDateIdx !== -1 && cols[birthDateIdx]) {
      const rawDate = cols[birthDateIdx];
      if (/^\d{4}-\d{2}-\d{2}$/.test(rawDate)) {
        birthDate = rawDate;
      } else if (/^\d{1,2}\/\d{1,2}\/\d{4}$/.test(rawDate)) {
        const [d, m, y] = rawDate.split("/");
        birthDate = `${y}-${m.padStart(2, "0")}-${d.padStart(2, "0")}`;
      }
    }

    // Normalizar género del jugador
    let gender: "male" | "female" | "other" | null = null;
    if (genderIdx !== -1 && cols[genderIdx]) {
      const g = cols[genderIdx].toLowerCase();
      if (g.startsWith("m") || g === "varon" || g === "masculino") gender = "male";
      else if (g.startsWith("f") || g === "mujer" || g === "femenino") gender = "female";
      else gender = "other";
    }

    // Resolver rama deportiva
    let rama: "male" | "female" | "mixed" | null = null;
    if (ramaIdx !== -1 && cols[ramaIdx]) {
      const r = cols[ramaIdx].toLowerCase();
      if (r.startsWith("m")) rama = "male";
      else if (r.startsWith("f")) rama = "female";
      else if (r.startsWith("mix")) rama = "mixed";
    } else if (gender) {
      rama = gender === "female" ? "female" : "male";
    }

    // Resolver categoría
    let categoryId: string | null = null;
    if (categoryIdx !== -1 && cols[categoryIdx]) {
      const catSearch = cols[categoryIdx].toLowerCase().replace(/\s+/g, "");
      const matched =
        clubCategories.find((c) => {
          const cName = c.name.toLowerCase().replace(/\s+/g, "");
          if (cName !== catSearch) return false;
          if (rama && c.gender !== rama) return false;
          return true;
        }) || clubCategories.find((c) => c.name.toLowerCase().replace(/\s+/g, "") === catSearch);

      if (matched) categoryId = matched.id;
    }

    // Resolver o crear familia
    let familyId: string | null = null;
    const familyName = familyIdx !== -1 ? cols[familyIdx]?.trim() : null;
    const contactPhone = phoneIdx !== -1 ? cols[phoneIdx]?.trim() || null : null;
    const contactEmail = emailIdx !== -1 ? cols[emailIdx]?.trim() || null : null;

    if (familyName) {
      const key = familyName.toLowerCase();
      if (familyMapByName.has(key)) {
        familyId = familyMapByName.get(key)!;
      } else {
        const [newFamily] = await db
          .insert(families)
          .values({
            clubId: ctx.club.id,
            name: familyName,
            contactName: `${firstName} ${lastName} (Tutor)`,
            contactPhone,
            contactEmail,
          })
          .returning({ id: families.id });
        familyId = newFamily.id;
        familyMapByName.set(key, familyId);
      }
    }

    const jerseyNumber = jerseyIdx !== -1 && cols[jerseyIdx] ? Number(cols[jerseyIdx]) || null : null;
    const position = positionIdx !== -1 ? cols[positionIdx] || null : null;
    const insuranceProvider = insuranceIdx !== -1 ? cols[insuranceIdx] || null : null;

    await db.insert(players).values({
      clubId: ctx.club.id,
      familyId,
      categoryId,
      firstName,
      lastName,
      dni: rawDni,
      birthDate,
      gender,
      jerseyNumber,
      position,
      insuranceProvider,
      status: "active",
      joinedAt: new Date().toISOString().slice(0, 10),
    });

    if (rawDni) existingDnis.add(rawDni);
    importedCount++;
  }

  await writeAudit({
    clubId: ctx.club.id,
    actorUserId: ctx.auth.user.id,
    actorEmail: ctx.auth.user.email,
    action: "players.imported",
    meta: { importedCount, skippedCount },
  });

  return {
    ok: `Se importaron ${importedCount} jugador(es) exitosamente.${
      skippedCount > 0 ? ` ${skippedCount} fila(s) omitidas.` : ""
    }`,
    importedCount,
    skippedCount,
    details: details.slice(0, 10),
  };
}
