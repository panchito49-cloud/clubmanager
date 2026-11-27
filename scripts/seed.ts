import { eq } from "drizzle-orm";
import { closeDb, db } from "../src/db/client";
import {
  announcements,
  attendance,
  callups,
  categories,
  charges,
  clubs,
  coachCategories,
  families,
  familyMembers,
  feePlans,
  integrations,
  matches,
  memberships,
  notifications,
  paymentApplications,
  payments,
  plans,
  playerDiscounts,
  players,
  subscriptions,
  trainings,
  tripPassengers,
  trips,
  users,
} from "../src/db/schema";
import { computeChargeAmounts } from "../src/lib/billing";
import { currentPeriod, shiftMonth, todayISO } from "../src/lib/format";
import { hashPassword } from "../src/lib/password";

/**
 * Seed de desarrollo.
 *
 * Crea:
 *  - Planes comerciales reales del SaaS.
 *  - El superadministrador de la plataforma (credenciales por .env).
 *  - Un club de DEMOSTRACION con datos ficticios y contraseñas conocidas.
 *
 * El club demo se identifica con el slug "barrio-norte-demo" y su nombre lleva
 * el sufijo (demo). No debe usarse para datos reales.
 *
 * Uso: npm run db:seed
 */

const DEMO_PASSWORD = "Demo2026!";
const DEMO_SLUG = "barrio-norte-demo";

function dueDateFor(period: string, day: number): string {
  const [year, month] = period.split("-").map(Number);
  const lastDay = new Date(Date.UTC(year, month, 0)).getUTCDate();
  const safeDay = Math.min(Math.max(1, day), lastDay);
  return `${period}-${String(safeDay).padStart(2, "0")}`;
}

function atLocal(dateISO: string, time: string): Date {
  // Argentina (UTC-3): 18:30 local = 21:30 UTC.
  return new Date(`${dateISO}T${time}:00-03:00`);
}

function addDays(dateISO: string, days: number): string {
  const date = new Date(`${dateISO}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

async function main() {
  console.log("Sembrando planes comerciales...");

  const planRows = await db
    .insert(plans)
    .values([
      {
        code: "inicial",
        name: "Inicial",
        description: "Para clubes que están empezando a ordenarse.",
        priceCents: 4_500_000,
        maxPlayers: 80,
        maxAdmins: 1,
        features: { modules: ["jugadores", "cuotas", "deportivo", "comunicaciones"] },
        sortOrder: 1,
      },
      {
        code: "club",
        name: "Club",
        description: "El plan más elegido por clubes de barrio.",
        priceCents: 8_500_000,
        maxPlayers: 200,
        maxAdmins: 3,
        features: {
          modules: ["jugadores", "cuotas", "deportivo", "comunicaciones", "reportes"],
        },
        sortOrder: 2,
      },
      {
        code: "plus",
        name: "Plus",
        description: "Para instituciones con varias categorías y staff.",
        priceCents: 14_000_000,
        maxPlayers: 400,
        maxAdmins: 8,
        features: {
          modules: [
            "jugadores",
            "cuotas",
            "deportivo",
            "comunicaciones",
            "reportes",
            "whatsapp",
          ],
        },
        sortOrder: 3,
      },
      {
        code: "institucional",
        name: "Institucional",
        description: "Configuración a medida, multi-disciplina.",
        priceCents: 0,
        maxPlayers: null,
        maxAdmins: null,
        features: {
          modules: [
            "jugadores",
            "cuotas",
            "deportivo",
            "comunicaciones",
            "reportes",
            "whatsapp",
            "multi-disciplina",
          ],
        },
        sortOrder: 4,
      },
    ])
    .onConflictDoNothing()
    .returning();

  const plansByCode = new Map<string, { id: string; priceCents: number }>();
  for (const p of planRows) plansByCode.set(p.code, p);
  if (plansByCode.size === 0) {
    for (const p of await db.select().from(plans)) plansByCode.set(p.code, p);
  }
  const clubPlan = plansByCode.get("club")!;

  // Superadministrador de la plataforma -------------------------------------
  const adminEmail = (process.env.SEED_PLATFORM_ADMIN_EMAIL ?? "admin@clubmanager.app")
    .toLowerCase()
    .trim();
  const adminPassword = process.env.SEED_PLATFORM_ADMIN_PASSWORD ?? "CambiarEstaClave123!";

  const [existingAdmin] = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.email, adminEmail))
    .limit(1);

  if (!existingAdmin) {
    await db.insert(users).values({
      email: adminEmail,
      fullName: "Administración ClubManager",
      passwordHash: await hashPassword(adminPassword),
      isPlatformAdmin: true,
    });
    console.log(`Superadministrador creado: ${adminEmail}`);
  }

  // Club demo ---------------------------------------------------------------
  const [existingClub] = await db
    .select({ id: clubs.id })
    .from(clubs)
    .where(eq(clubs.slug, DEMO_SLUG))
    .limit(1);

  if (existingClub) {
    console.log("El club de demostración ya existe. Nada más que hacer.");
    return;
  }

  console.log("Creando club de demostración...");
  const period = currentPeriod();
  const previous = shiftMonth(period, -1);
  const demoHash = await hashPassword(DEMO_PASSWORD);

  const [club] = await db
    .insert(clubs)
    .values({
      slug: DEMO_SLUG,
      name: "Club Atlético Estudiantes",
      city: "Mercedes",
      province: "Buenos Aires",
      status: "active",
      planId: clubPlan.id,
      settings: {
        address: "Calle 33 N° 334",
        phone: "+54 2324 00-0000",
        email: "administracion@caestudiantes.demo",
        cuit: "30-50000000-0",
        siblingDiscountPct: 20,
        graceDays: 5,
        billingDay: 10,
        remindersEnabled: false,
        notes: "Club Atlético Estudiantes de Mercedes (Básquet).",
      },
    })
    .returning();

  await db.insert(subscriptions).values({
    clubId: club.id,
    planId: clubPlan.id,
    status: "active",
    periodStart: new Date(`${period}-01T00:00:00-03:00`),
    periodEnd: new Date(`${shiftMonth(period, 1)}-01T00:00:00-03:00`),
    provider: "manual",
    amountCents: clubPlan.priceCents,
    notes: "Suscripción de demostración (no implica cobro real).",
  });

  // Usuarios del club -------------------------------------------------------
  const staffAndUsers = [
    { email: "admin@barrio-norte.demo", fullName: "Marcela Duarte", role: "club_admin" as const },
    { email: "martin.ferreyra@barrio-norte.demo", fullName: "Martín Ferreyra", role: "coach" as const },
    { email: "lucia.benitez@barrio-norte.demo", fullName: "Lucía Benítez", role: "coach" as const },
    { email: "carla.gomez@barrio-norte.demo", fullName: "Carla Gómez", role: "guardian" as const },
    { email: "diego.perez@barrio-norte.demo", fullName: "Diego Pérez", role: "guardian" as const },
    { email: "silvana.sosa@barrio-norte.demo", fullName: "Silvana Sosa", role: "guardian" as const },
    { email: "tomas.gomez@barrio-norte.demo", fullName: "Tomás Gómez", role: "player" as const },
  ];

  const userIds = new Map<string, string>();
  for (const u of staffAndUsers) {
    const [row] = await db
      .insert(users)
      .values({
        email: u.email,
        fullName: u.fullName,
        passwordHash: demoHash,
        phone: "+54 11 5555-0000",
      })
      .returning({ id: users.id });
    userIds.set(u.email, row.id);
  }

  const membershipIds = new Map<string, string>();
  for (const u of staffAndUsers) {
    const [row] = await db
      .insert(memberships)
      .values({ clubId: club.id, userId: userIds.get(u.email)!, role: u.role })
      .returning({ id: memberships.id });
    membershipIds.set(u.email, row.id);
  }

  // Categorias de Basquet (Masculino y Femenino) ---------------------------
  const categoryDefs = [
    // Rama Masculina
    { key: "Escuelita-M", name: "Escuelita", from: 2018, to: 2022, gender: "male" as const, order: 1 },
    { key: "Pre-Mini-M", name: "Pre Mini", from: 2016, to: 2017, gender: "male" as const, order: 2 },
    { key: "U11-M", name: "U11", from: 2015, to: 2015, gender: "male" as const, order: 3 },
    { key: "U13-M", name: "U13", from: 2013, to: 2014, gender: "male" as const, order: 4 },
    { key: "U15-M", name: "U15", from: 2011, to: 2012, gender: "male" as const, order: 5 },
    { key: "U17-M", name: "U17", from: 2009, to: 2010, gender: "male" as const, order: 6 },
    { key: "U21-M", name: "U21", from: 2005, to: 2008, gender: "male" as const, order: 7 },
    { key: "Primera-M", name: "Primera", from: 1970, to: 2007, gender: "male" as const, order: 8 },
    // Rama Femenina
    { key: "Escuelita-F", name: "Escuelita", from: 2018, to: 2022, gender: "female" as const, order: 9 },
    { key: "Pre-Mini-F", name: "Pre Mini", from: 2016, to: 2017, gender: "female" as const, order: 10 },
    { key: "U11-F", name: "U11", from: 2015, to: 2015, gender: "female" as const, order: 11 },
    { key: "U13-F", name: "U13", from: 2013, to: 2014, gender: "female" as const, order: 12 },
    { key: "U15-F", name: "U15", from: 2011, to: 2012, gender: "female" as const, order: 13 },
    { key: "U17-F", name: "U17", from: 2009, to: 2010, gender: "female" as const, order: 14 },
    { key: "U21-F", name: "U21", from: 2005, to: 2008, gender: "female" as const, order: 15 },
    { key: "Primera-F", name: "Primera", from: 1970, to: 2007, gender: "female" as const, order: 16 },
  ];

  const categoryIds = new Map<string, string>();
  for (const c of categoryDefs) {
    const [row] = await db
      .insert(categories)
      .values({
        clubId: club.id,
        name: c.name,
        birthYearFrom: c.from,
        birthYearTo: c.to,
        gender: c.gender,
        sortOrder: c.order,
      })
      .returning({ id: categories.id });
    categoryIds.set(c.key, row.id);
  }

  // Alias para mantener compatibilidad con las referencias del seed existente
  categoryIds.set("U13", categoryIds.get("U13-M")!);
  categoryIds.set("U15", categoryIds.get("U15-M")!);
  categoryIds.set("U17", categoryIds.get("U17-M")!);
  categoryIds.set("Primera", categoryIds.get("Primera-M")!);

  const coachAssignments: Array<[string, string[]]> = [
    ["martin.ferreyra@barrio-norte.demo", ["U15", "U17", "U21-M"]],
    ["lucia.benitez@barrio-norte.demo", ["U13", "Primera", "U15-F", "U17-F"]],
  ];
  for (const [email, cats] of coachAssignments) {
    for (const cat of cats) {
      await db.insert(coachCategories).values({
        clubId: club.id,
        membershipId: membershipIds.get(email)!,
        categoryId: categoryIds.get(cat)!,
      });
    }
  }

  // Familias y jugadores ----------------------------------------------------
  const familyDefs = [
    {
      name: "Familia Gómez",
      guardianEmail: "carla.gomez@barrio-norte.demo",
      contactName: "Carla Gómez",
      contactPhone: "+54 11 5555-1001",
      children: [
        { firstName: "Tomás", lastName: "Gómez", birth: "2012-04-18", dni: "50123456", cat: "U15", gender: "male" as const, jersey: 7, position: "Base", playerAccount: true, scholarship: 0 },
        { firstName: "Bruno", lastName: "Gómez", birth: "2014-09-02", dni: "51234567", cat: "U13", gender: "male" as const, jersey: 11, position: "Alero", playerAccount: false, scholarship: 0 },
      ],
    },
    {
      name: "Familia Pérez",
      guardianEmail: "diego.perez@barrio-norte.demo",
      contactName: "Diego Pérez",
      contactPhone: "+54 11 5555-1002",
      children: [
        { firstName: "Joaquín", lastName: "Pérez", birth: "2010-06-21", dni: "48000111", cat: "U17", gender: "male" as const, jersey: 4, position: "Escolta", playerAccount: false, scholarship: 0 },
        { firstName: "Valentina", lastName: "Pérez", birth: "2013-01-30", dni: "52000999", cat: "U15", gender: "female" as const, jersey: 9, position: "Alero", playerAccount: false, scholarship: 50 },
      ],
    },
    {
      name: "Familia Sosa",
      guardianEmail: "silvana.sosa@barrio-norte.demo",
      contactName: "Silvana Sosa",
      contactPhone: "+54 11 5555-1003",
      children: [
        { firstName: "Mateo", lastName: "Sosa", birth: "2006-03-11", dni: "44000777", cat: "Primera", gender: "male" as const, jersey: 10, position: "Ala-pívot", playerAccount: false, scholarship: 0 },
        { firstName: "Franco", lastName: "Sosa", birth: "2011-11-08", dni: "49000333", cat: "U17", gender: "male" as const, jersey: 15, position: "Pívot", playerAccount: false, scholarship: 0 },
      ],
    },
    {
      name: "Familia Herrera",
      guardianEmail: null,
      contactName: "Roberto Herrera",
      contactPhone: "+54 11 5555-1004",
      children: [
        { firstName: "Thiago", lastName: "Herrera", birth: "2014-02-14", dni: "51555111", cat: "U13", gender: "male" as const, jersey: 5, position: "Base", playerAccount: false, scholarship: 0 },
        { firstName: "Nicolás", lastName: "Herrera", birth: "2012-12-03", dni: "50555222", cat: "U15", gender: "male" as const, jersey: 13, position: "Alero", playerAccount: false, scholarship: 0 },
      ],
    },
  ];

  const playerRows: Array<{ id: string; familyId: string; cat: string; firstName: string; scholarship: number }> = [];
  const familyIds = new Map<string, string>();

  for (const f of familyDefs) {
    const [family] = await db
      .insert(families)
      .values({
        clubId: club.id,
        name: f.name,
        contactName: f.contactName,
        contactPhone: f.contactPhone,
        contactEmail: f.guardianEmail ?? undefined,
      })
      .returning({ id: families.id });
    familyIds.set(f.name, family.id);

    if (f.guardianEmail) {
      await db.insert(familyMembers).values({
        clubId: club.id,
        familyId: family.id,
        userId: userIds.get(f.guardianEmail)!,
        fullName: f.contactName,
        relationship: "tutor",
        phone: f.contactPhone,
        isPrimary: true,
      });
    }

    // El hermano mayor paga cuota completa; los siguientes tienen descuento.
    const ordered = [...f.children].sort((a, b) => (a.birth < b.birth ? 1 : -1));

    for (const [index, child] of ordered.entries()) {
      const [player] = await db
        .insert(players)
        .values({
          clubId: club.id,
          familyId: family.id,
          categoryId: categoryIds.get(child.cat)!,
          userId:
            child.playerAccount && f.guardianEmail
              ? userIds.get("tomas.gomez@barrio-norte.demo")
              : null,
          firstName: child.firstName,
          lastName: child.lastName,
          dni: child.dni,
          birthDate: child.birth,
          gender: child.gender,
          jerseyNumber: child.jersey,
          position: child.position,
          joinedAt: "2023-03-01",
          emergencyContactName: f.contactName,
          emergencyContactPhone: f.contactPhone,
          insuranceProvider: "Obra Social Provincia",
          medicalCertificateExpiresAt:
            index % 3 === 0
              ? "2027-04-15" // Vigente
              : index % 3 === 1
                ? "2026-12-10" // Por vencer
                : "2026-10-01", // Vencido
        })
        .returning({ id: players.id });

      if (index > 0) {
        // Descuento por hermano aplicado via club.settings (20%).
      }

      if (child.scholarship > 0) {
        await db.insert(playerDiscounts).values({
          clubId: club.id,
          playerId: player.id,
          type: "percentage",
          value: child.scholarship,
          reason: "Beca deportiva",
          startsOn: `${period}-01`,
        });
      }

      playerRows.push({
        id: player.id,
        familyId: family.id,
        cat: child.cat,
        firstName: child.firstName,
        scholarship: child.scholarship,
      });
    }
  }

  // Planes de cuota ---------------------------------------------------------
  const feeDefs = [
    { name: "Cuota U13", cat: "U13", amount: 3_500_000 },
    { name: "Cuota U15", cat: "U15", amount: 3_800_000 },
    { name: "Cuota U17", cat: "U17", amount: 4_000_000 },
    { name: "Cuota Primera", cat: "Primera", amount: 4_500_000 },
  ];

  const feePlanIds = new Map<string, { id: string; amount: number }>();
  for (const f of feeDefs) {
    const [row] = await db
      .insert(feePlans)
      .values({
        clubId: club.id,
        name: f.name,
        concept: "Cuota mensual",
        categoryId: categoryIds.get(f.cat)!,
        amountCents: f.amount,
        dueDay: 10,
      })
      .returning({ id: feePlans.id });
    feePlanIds.set(f.cat, { id: row.id, amount: f.amount });
  }

  // Cuotas de dos periodos --------------------------------------------------
  const createdCharges: Array<{
    id: string;
    familyId: string;
    totalCents: number;
    period: string;
  }> = [];

  const familySiblingIndex = new Map<string, number>();
  for (const p of playerRows) {
    const idx = familySiblingIndex.get(p.familyId) ?? 0;
    familySiblingIndex.set(p.familyId, idx + 1);

    const planForCat = feePlanIds.get(p.cat);
    if (!planForCat) continue;

    const isSosa = p.familyId === familyIds.get("Familia Sosa");
    const periodsToGenerate = isSosa
      ? [shiftMonth(period, -4), shiftMonth(period, -3), previous, period]
      : [previous, period];

    for (const targetPeriod of periodsToGenerate) {
      const amounts = computeChargeAmounts({
        amountCents: planForCat.amount,
        discount: p.scholarship > 0 ? { type: "percentage", value: p.scholarship } : null,
        siblingIndex: idx,
        siblingDiscountPct: 20,
      });

      const [charge] = await db
        .insert(charges)
        .values({
          clubId: club.id,
          playerId: p.id,
          familyId: p.familyId,
          feePlanId: planForCat.id,
          concept: "Cuota mensual",
          period: targetPeriod,
          dueDate: dueDateFor(targetPeriod, 10),
          amountCents: amounts.amountCents,
          discountCents: amounts.discountCents,
          totalCents: amounts.totalCents,
          status: "pending",
        })
        .returning({ id: charges.id });

      createdCharges.push({
        id: charge.id,
        familyId: p.familyId,
        totalCents: amounts.totalCents,
        period: targetPeriod,
      });
    }
  }

  // Pagos del periodo anterior (aprobados) ----------------------------------
  const previousByFamily = new Map<string, typeof createdCharges>();
  for (const c of createdCharges.filter((c) => c.period === previous)) {
    const list = previousByFamily.get(c.familyId) ?? [];
    list.push(c);
    previousByFamily.set(c.familyId, list);
  }

  let paymentSeq = 1;
  for (const [familyId, list] of previousByFamily) {
    const total = list.reduce((sum, c) => sum + c.totalCents, 0);
    const [payment] = await db
      .insert(payments)
      .values({
        clubId: club.id,
        familyId,
        amountCents: total,
        method: "transfer",
        status: "approved",
        payerName: familyDefs.find((f) => familyIds.get(f.name) === familyId)?.contactName,
        reference: `DEMO-TRF-${String(paymentSeq).padStart(3, "0")}`,
        declaredByUserId: userIds.get("admin@barrio-norte.demo"),
        reviewedByUserId: userIds.get("admin@barrio-norte.demo"),
        reviewedAt: new Date(),
        notes: "Pago de demostración generado por el seed.",
      })
      .returning({ id: payments.id });

    for (const charge of list) {
      await db.insert(paymentApplications).values({
        clubId: club.id,
        paymentId: payment.id,
        chargeId: charge.id,
        amountCents: charge.totalCents,
      });
      await db
        .update(charges)
        .set({ paidCents: charge.totalCents, status: "paid" })
        .where(eq(charges.id, charge.id));
    }
    paymentSeq += 1;
  }

  // Pago declarado pendiente de revision (periodo actual) -------------------
  const gomezFamilyId = familyIds.get("Familia Gómez")!;
  const gomezCurrent = createdCharges.filter(
    (c) => c.familyId === gomezFamilyId && c.period === period,
  );
  const declaredTotal = gomezCurrent.reduce((sum, c) => sum + c.totalCents, 0);

  await db.insert(payments).values({
    clubId: club.id,
    familyId: gomezFamilyId,
    amountCents: declaredTotal,
    method: "transfer",
    status: "declared",
    payerName: "Carla Gómez",
    reference: "DEMO-TRF-DECLARADA-001",
    notes: "Transferencia informada por la familia (pendiente de validación).",
    declaredByUserId: userIds.get("carla.gomez@barrio-norte.demo"),
  });

  // Deportivo: entrenamientos ----------------------------------------------
  const today = todayISO();
  const u15 = categoryIds.get("U15")!;
  const u17 = categoryIds.get("U17")!;
  const u13 = categoryIds.get("U13")!;
  const primera = categoryIds.get("Primera")!;

  const [pastTraining] = await db
    .insert(trainings)
    .values({
      clubId: club.id,
      categoryId: u15,
      coachMembershipId: membershipIds.get("martin.ferreyra@barrio-norte.demo"),
      title: "Entrenamiento de tiro y transición",
      startsAt: atLocal(addDays(today, -1), "18:30"),
      endsAt: atLocal(addDays(today, -1), "20:00"),
      location: "Estadio cubierto - Cancha 1",
      status: "completed",
    })
    .returning({ id: trainings.id });

  const u15Players = playerRows.filter((p) => p.cat === "U15");
  const attendanceStates = ["present", "late", "present", "absent"] as const;
  for (const [i, p] of u15Players.entries()) {
    await db.insert(attendance).values({
      clubId: club.id,
      trainingId: pastTraining.id,
      playerId: p.id,
      status: attendanceStates[i % attendanceStates.length],
      recordedByUserId: userIds.get("martin.ferreyra@barrio-norte.demo"),
    });
  }

  const upcomingTrainings = [
    { cat: u15, catKey: "U15", coach: "martin.ferreyra@barrio-norte.demo", days: 2, time: "18:30", title: "Entrenamiento U15" },
    { cat: u17, catKey: "U17", coach: "martin.ferreyra@barrio-norte.demo", days: 4, time: "20:00", title: "Entrenamiento U17" },
    { cat: primera, catKey: "Primera", coach: "lucia.benitez@barrio-norte.demo", days: 5, time: "21:00", title: "Entrenamiento Primera" },
    { cat: u13, catKey: "U13", coach: "lucia.benitez@barrio-norte.demo", days: 6, time: "17:30", title: "Entrenamiento U13" },
  ];

  for (const t of upcomingTrainings) {
    await db.insert(trainings).values({
      clubId: club.id,
      categoryId: t.cat,
      coachMembershipId: membershipIds.get(t.coach),
      title: t.title,
      startsAt: atLocal(addDays(today, t.days), t.time),
      endsAt: atLocal(addDays(today, t.days), t.time === "21:00" ? "22:30" : "20:00"),
      location: "Estadio cubierto - Cancha 1",
      status: "scheduled",
    });
  }

  // Partidos y convocatorias (Liga oficial de 10 equipos) -------------------
  // 1. Partido Jugado U15 vs Club Mercedes (Gran clásico de la ciudad)
  const [matchU15Played] = await db
    .insert(matches)
    .values({
      clubId: club.id,
      categoryId: u15,
      coachMembershipId: membershipIds.get("martin.ferreyra@barrio-norte.demo"),
      rival: "Club Mercedes",
      startsAt: atLocal(addDays(today, -10), "18:30"),
      location: "Estadio Centenario - Cancha 1 (Calle 33 N° 334)",
      isHome: true,
      status: "played",
      ourScore: 74,
      rivalScore: 68,
      notes: "Gran último cuarto defensivo. Triunfo en el clásico mercedino con destacada actuación perimetral.",
    })
    .returning({ id: matches.id });

  for (const p of u15Players) {
    await db.insert(callups).values({
      clubId: club.id,
      matchId: matchU15Played.id,
      playerId: p.id,
      status: "confirmed",
    });
  }

  // 2. Partido Jugado U17 vs Ateneo de la Juventud (Visitante en Mercedes)
  const u17Players = playerRows.filter((p) => p.cat === "U17");
  const [matchU17Played] = await db
    .insert(matches)
    .values({
      clubId: club.id,
      categoryId: u17,
      coachMembershipId: membershipIds.get("martin.ferreyra@barrio-norte.demo"),
      rival: "Ateneo de la Juventud",
      startsAt: atLocal(addDays(today, -5), "20:00"),
      location: "Estadio Polideportivo Ateneo - Calle 11 N° 750",
      isHome: false,
      status: "played",
      ourScore: 65,
      rivalScore: 71,
      notes: "Cotejo parejo y de mucha intensidad física que se definió en las últimas posesiones.",
    })
    .returning({ id: matches.id });

  for (const p of u17Players) {
    await db.insert(callups).values({
      clubId: club.id,
      matchId: matchU17Played.id,
      playerId: p.id,
      status: "confirmed",
    });
  }

  // 3. Partido Jugado Primera vs Sarmiento
  const primeraPlayers = playerRows.filter((p) => p.cat === "Primera");
  const [matchPrimeraPlayed] = await db
    .insert(matches)
    .values({
      clubId: club.id,
      categoryId: primera,
      coachMembershipId: membershipIds.get("lucia.benitez@barrio-norte.demo"),
      rival: "Club Sarmiento",
      startsAt: atLocal(addDays(today, -2), "21:30"),
      location: "Estadio Centenario - Cancha 1 (Calle 33 N° 334)",
      isHome: true,
      status: "played",
      ourScore: 82,
      rivalScore: 76,
      notes: "Sólida victoria de Primera División con gran efectividad desde la línea de triples (11 triples).",
    })
    .returning({ id: matches.id });

  for (const p of primeraPlayers.slice(0, 12)) {
    await db.insert(callups).values({
      clubId: club.id,
      matchId: matchPrimeraPlayed.id,
      playerId: p.id,
      status: "confirmed",
    });
  }

  // 4. Próximo Partido U15 vs Club San Carlos (Fixture)
  const [upcomingMatchU15] = await db
    .insert(matches)
    .values({
      clubId: club.id,
      categoryId: u15,
      coachMembershipId: membershipIds.get("martin.ferreyra@barrio-norte.demo"),
      rival: "Club San Carlos",
      startsAt: atLocal(addDays(today, 3), "18:30"),
      location: "Estadio Centenario - Cancha 1 (Calle 33 N° 334)",
      isHome: true,
      status: "scheduled",
      notes: "Citación 17:30hs en vestuarios. Traer indumentaria titular roja completa.",
    })
    .returning({ id: matches.id });

  for (const p of u15Players) {
    await db.insert(callups).values({
      clubId: club.id,
      matchId: upcomingMatchU15.id,
      playerId: p.id,
      status: "invited",
    });
  }

  // 5. Próximo Partido U17 vs Club Náutico El Timón (Fixture - Visitante)
  const [upcomingMatchU17] = await db
    .insert(matches)
    .values({
      clubId: club.id,
      categoryId: u17,
      coachMembershipId: membershipIds.get("martin.ferreyra@barrio-norte.demo"),
      rival: "El Timón",
      startsAt: atLocal(addDays(today, 4), "11:00"),
      location: "Gimnasio de la Ribera - Av. Flandes y Río Luján, Jáuregui",
      isHome: false,
      status: "scheduled",
      notes: "Punto de encuentro en el club 09:30hs para traslado en combi a Jáuregui.",
    })
    .returning({ id: matches.id });

  for (const p of u17Players) {
    await db.insert(callups).values({
      clubId: club.id,
      matchId: upcomingMatchU17.id,
      playerId: p.id,
      status: "invited",
    });
  }

  // 6. Próximo Partido Primera vs Costa Brava (Fixture - Local)
  const [upcomingMatchPrimera] = await db
    .insert(matches)
    .values({
      clubId: club.id,
      categoryId: primera,
      coachMembershipId: membershipIds.get("lucia.benitez@barrio-norte.demo"),
      rival: "Costa Brava",
      startsAt: atLocal(addDays(today, 7), "21:00"),
      location: "Estadio Centenario - Cancha 1 (Calle 33 N° 334)",
      isHome: true,
      status: "scheduled",
      notes: "Fecha interzonal de la Liga. Entrada libre para socios con carnet digital al día.",
    })
    .returning({ id: matches.id });

  for (const p of primeraPlayers.slice(0, 12)) {
    await db.insert(callups).values({
      clubId: club.id,
      matchId: upcomingMatchPrimera.id,
      playerId: p.id,
      status: "invited",
    });
  }

  // 7. Próximo Partido U13 vs Dorrego (Fixture - Visitante en Navarro)
  const [upcomingMatchU13] = await db
    .insert(matches)
    .values({
      clubId: club.id,
      categoryId: u13,
      coachMembershipId: membershipIds.get("lucia.benitez@barrio-norte.demo"),
      rival: "Dorrego",
      startsAt: atLocal(addDays(today, 9), "10:30"),
      location: "Microestadio Dorrego - Calle 22 N° 550, Navarro",
      isHome: false,
      status: "scheduled",
      notes: "Viaje en caravana de familias hacia Navarro.",
    })
    .returning({ id: matches.id });

  const u13Players = playerRows.filter((p) => p.cat === "U13");
  for (const p of u13Players) {
    await db.insert(callups).values({
      clubId: club.id,
      matchId: upcomingMatchU13.id,
      playerId: p.id,
      status: "invited",
    });
  }

  // Viaje -------------------------------------------------------------------
  const [trip] = await db
    .insert(trips)
    .values({
      clubId: club.id,
      categoryId: u17,
      title: "Torneo Provincial - Mar del Plata",
      destination: "Mar del Plata, Buenos Aires",
      departureAt: atLocal(addDays(today, 12), "07:00"),
      returnAt: atLocal(addDays(today, 13), "22:00"),
      transport: "Micro contratado (28 plazas)",
      costCents: 4_500_000,
      seats: 12,
      authorizationRequired: true,
      status: "open",
      notes: "Salida desde el club 30 minutos antes. Llevar DNI y autorización firmada.",
    })
    .returning({ id: trips.id });

  for (const [i, p] of u17Players.entries()) {
    await db.insert(tripPassengers).values({
      clubId: club.id,
      tripId: trip.id,
      playerId: p.id,
      status: i === 0 ? "confirmed" : "invited",
      authorizationStatus: i === 0 ? "granted" : "pending",
      authorizedByUserId: i === 0 ? userIds.get("diego.perez@barrio-norte.demo") : null,
      authorizedAt: i === 0 ? new Date() : null,
    });
  }

  // Comunicaciones ----------------------------------------------------------
  const [announcement1] = await db
    .insert(announcements)
    .values({
      clubId: club.id,
      title: "Convocatoria vs Deportivo Colón de Chivilcoy",
      body: "Hola familias! Los convocamos para el partido de U15 este sábado 18:30 hs en nuestro Estadio Centenario (Calle 33 N° 334). Indumentaria titular roja completa. Citación 17:30 hs en vestuarios. Por favor confirmar asistencia.",
      audience: "category",
      categoryId: u15,
      channel: "whatsapp",
      status: "draft",
      recipientCount: 0,
      createdByUserId: userIds.get("martin.ferreyra@barrio-norte.demo"),
    })
    .returning({ id: announcements.id });

  const [announcement2] = await db
    .insert(announcements)
    .values({
      clubId: club.id,
      title: "Regularización de Apto Médico (EMDAP) Temporada Centenario",
      body: "Estimadas familias: Por normativa reglamentaria obligatoria de la Federación de Básquetbol, recordamos que todos los jugadores deben contar con el certificado médico EMDAP vigente para poder disputar encuentros oficiales. Acercar el certificado a secretaría (Calle 33 N° 334) o cargarlo en el portal.",
      audience: "families",
      channel: "whatsapp",
      status: "sent",
      recipientCount: 12,
      sentAt: atLocal(addDays(today, -3), "18:00"),
      createdByUserId: userIds.get("admin@barrio-norte.demo"),
    })
    .returning({ id: announcements.id });

  const [announcement3] = await db
    .insert(announcements)
    .values({
      clubId: club.id,
      title: "Festejos del Centenario (1926-2026) y Torneo de Básquet",
      body: "Comunidad de Estudiantes de Mercedes: Los invitamos a participar de los eventos y partidos conmemorativos de nuestro Centenario. Venta de indumentaria conmemorativa disponible en la sede central de Calle 33 N° 334.",
      audience: "all",
      channel: "whatsapp",
      status: "sent",
      recipientCount: 16,
      sentAt: atLocal(addDays(today, -8), "12:00"),
      createdByUserId: userIds.get("admin@barrio-norte.demo"),
    })
    .returning({ id: announcements.id });

  for (const email of [
    "carla.gomez@barrio-norte.demo",
    "diego.perez@barrio-norte.demo",
    "silvana.sosa@barrio-norte.demo",
  ]) {
    await db.insert(notifications).values({
      clubId: club.id,
      userId: userIds.get(email)!,
      title: "Regularización de Apto Médico (EMDAP)",
      body: "Por favor revisar el vencimiento del apto médico de sus hijos.",
      link: "/app/portal",
    });
  }

  // Integracion WhatsApp: explicitamente NO configurada ---------------------
  await db.insert(integrations).values({
    clubId: club.id,
    provider: "whatsapp_business",
    status: "not_configured",
    config: {},
    secretRef: "WHATSAPP_ACCESS_TOKEN",
  });

  console.log("");
  console.log("=== Seed completado ===");
  console.log("Superadmin plataforma:", adminEmail, "/", adminPassword);
  console.log("Admin del club demo:  admin@barrio-norte.demo /", DEMO_PASSWORD);
  console.log("Entrenador:           martin.ferreyra@barrio-norte.demo /", DEMO_PASSWORD);
  console.log("Tutor:                carla.gomez@barrio-norte.demo /", DEMO_PASSWORD);
  console.log("Jugador:              tomas.gomez@barrio-norte.demo /", DEMO_PASSWORD);
  console.log("Periodo liquidado:", previous, "y", period);
  console.log("Club demo id:", club.id);
}

main()
  .catch((error) => {
    console.error("Error en el seed:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await closeDb();
  });
