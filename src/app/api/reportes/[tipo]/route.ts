import { NextResponse } from "next/server";
import { getTenant, assertCan } from "@/server/tenant";
import {
  getPlayersByCategoryReport,
  getCollectionSummaryReport,
  getAttendanceByCategoryReport,
  getDebtByFamilyReport,
} from "@/server/data/reports";
import { db } from "@/db/client";
import { charges, families, players, categories } from "@/db/schema";
import { and, eq } from "drizzle-orm";
import { currentPeriod } from "@/lib/format";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ tipo: string }> },
) {
  let ctx;
  try {
    ctx = await getTenant();
    assertCan(ctx, "reports.view");
  } catch {
    return new NextResponse("No autorizado", { status: 401 });
  }

  const { tipo } = await params;
  const { searchParams } = new URL(request.url);
  const period = searchParams.get("periodo") || currentPeriod();

  const bom = "\uFEFF"; // Para compatibilidad nativa con Excel en Windows

  if (tipo === "jugadores") {
    const report = await getPlayersByCategoryReport(ctx);
    const headers = ["Categoria", "Rama", "Jugadores Activos", "Jugadores Inactivos", "Total"].join(";");
    const rows = report.map((r) =>
      [
        `"${r.categoryName}"`,
        r.categoryGender === "male" ? "Masculino" : r.categoryGender === "female" ? "Femenino" : "Mixto",
        r.activeCount,
        r.inactiveCount,
        r.totalCount,
      ].join(";"),
    );

    const csv = `${bom}${headers}\r\n${rows.join("\r\n")}\r\n`;
    return new NextResponse(csv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="reporte_jugadores_${ctx.club.slug}.csv"`,
      },
    });
  }

  if (tipo === "cobranzas") {
    // Exportación detallada de cuotas del período
    const rowsList = await db
      .select({
        period: charges.period,
        playerName: players.firstName,
        playerLastName: players.lastName,
        dni: players.dni,
        categoryName: categories.name,
        categoryGender: categories.gender,
        familyName: families.name,
        concept: charges.concept,
        amount: charges.amountCents,
        paid: charges.paidCents,
        status: charges.status,
        dueDate: charges.dueDate,
      })
      .from(charges)
      .leftJoin(players, eq(players.id, charges.playerId))
      .leftJoin(categories, eq(categories.id, players.categoryId))
      .leftJoin(families, eq(families.id, charges.familyId))
      .where(and(eq(charges.clubId, ctx.club.id), eq(charges.period, period)));

    const headers = [
      "Periodo",
      "Jugador",
      "DNI",
      "Categoria",
      "Familia",
      "Concepto",
      "Importe Facturado ($)",
      "Importe Cobrado ($)",
      "Saldo Pendiente ($)",
      "Estado",
      "Vencimiento",
    ].join(";");

    const rows = rowsList.map((r) => {
      const amount = (r.amount / 100).toFixed(2).replace(".", ",");
      const paid = (r.paid / 100).toFixed(2).replace(".", ",");
      const pending = ((r.amount - r.paid) / 100).toFixed(2).replace(".", ",");
      const statusMap: Record<string, string> = {
        pending: "Pendiente",
        partial: "Pago parcial",
        paid: "Pagado",
        void: "Anulado",
      };

      return [
        r.period,
        `"${r.playerLastName || ""}, ${r.playerName || ""}"`,
        r.dni || "",
        `"${r.categoryName || ""}"`,
        `"${r.familyName || ""}"`,
        `"${r.concept}"`,
        amount,
        paid,
        pending,
        statusMap[r.status] || r.status,
        r.dueDate,
      ].join(";");
    });

    const csv = `${bom}${headers}\r\n${rows.join("\r\n")}\r\n`;
    return new NextResponse(csv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="reporte_cobranzas_${period}_${ctx.club.slug}.csv"`,
      },
    });
  }

  if (tipo === "asistencia") {
    const report = await getAttendanceByCategoryReport(ctx);
    const headers = ["Categoria", "Rama", "Total Sesiones", "Asistencia Promedio (%)"].join(";");
    const rows = report.map((r) =>
      [
        `"${r.categoryName}"`,
        r.categoryGender === "male" ? "Masculino" : r.categoryGender === "female" ? "Femenino" : "Mixto",
        r.totalTrainings,
        `${r.avgAttendancePct}%`,
      ].join(";"),
    );

    const csv = `${bom}${headers}\r\n${rows.join("\r\n")}\r\n`;
    return new NextResponse(csv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="reporte_asistencia_${ctx.club.slug}.csv"`,
      },
    });
  }

  if (tipo === "deudas") {
    const report = await getDebtByFamilyReport(ctx);
    const headers = ["Familia", "Jugadores a Cargo", "Cuotas Vencidas / Impagas", "Deuda Total ($)"].join(";");
    const rows = report.map((r) =>
      [
        `"${r.familyName}"`,
        r.playerCount,
        r.unpaidChargesCount,
        (r.totalDebtCents / 100).toFixed(2).replace(".", ","),
      ].join(";"),
    );

    const csv = `${bom}${headers}\r\n${rows.join("\r\n")}\r\n`;
    return new NextResponse(csv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="reporte_morosidad_${ctx.club.slug}.csv"`,
      },
    });
  }

  return new NextResponse("Tipo de reporte no encontrado", { status: 404 });
}
