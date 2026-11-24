import Link from "next/link";
import { PageHeader, NoAccess } from "@/components/ui/page";
import { Card, CardHeader, CardBody, StatCard } from "@/components/ui/card";
import { Table, THead, TBody, TR, TH, TD } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Icon } from "@/components/ui/icon";
import { ProgressBar } from "@/components/ui/charts";
import { Select } from "@/components/ui/form";
import { currentPeriod, formatMoney, monthLabel, shiftMonth } from "@/lib/format";
import { can, getTenant } from "@/server/tenant";
import {
  getPlayersByCategoryReport,
  getCollectionSummaryReport,
  getAttendanceByCategoryReport,
  getDebtByFamilyReport,
} from "@/server/data/reports";

export const metadata = { title: "Reportes y Estadísticas" };

export default async function ReportsPage({
  searchParams,
}: {
  searchParams: Promise<{ periodo?: string }>;
}) {
  const ctx = await getTenant();
  if (!can(ctx, "reports.view")) return <NoAccess />;

  const params = await searchParams;
  const selectedPeriod = params.periodo || currentPeriod();

  const [playersReport, collectionSummary, attendanceReport, debtReport] =
    await Promise.all([
      getPlayersByCategoryReport(ctx),
      getCollectionSummaryReport(ctx, selectedPeriod),
      getAttendanceByCategoryReport(ctx),
      getDebtByFamilyReport(ctx),
    ]);

  const totalActivePlayers = playersReport.reduce((acc, r) => acc + r.activeCount, 0);
  const totalInactivePlayers = playersReport.reduce((acc, r) => acc + r.inactiveCount, 0);
  const totalAllPlayers = totalActivePlayers + totalInactivePlayers;

  // Opciones de período: últimos 6 meses
  const periodOptions: string[] = [];
  for (let i = 0; i < 6; i++) {
    periodOptions.push(shiftMonth(currentPeriod(), -i));
  }

  return (
    <div className="space-y-8">
      <PageHeader
        title="Reportes y Métricas"
        description="Indicadores deportivos y económicos consolidados, con exportación para gestión del club."
      />

      {/* SECCIÓN 1: RESUMEN DE COBRANZAS */}
      <div className="space-y-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-lg font-bold text-ink-900">Cobranzas y Cuotas</h2>
            <p className="text-xs text-ink-500">
              Evolución de facturación y recaudación del período seleccionado.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <form method="get" className="flex items-center gap-2">
              <Select
                name="periodo"
                defaultValue={selectedPeriod}
                aria-label="Seleccionar período"
                className="w-44 text-xs"
              >
                {periodOptions.map((p) => (
                  <option key={p} value={p}>
                    {monthLabel(p)}
                  </option>
                ))}
              </Select>
              <button
                type="submit"
                className="inline-flex h-9 items-center rounded-lg bg-ink-100 px-3 text-xs font-semibold text-ink-700 hover:bg-ink-200"
              >
                Ver
              </button>
            </form>
            <a
              href={`/api/reportes/cobranzas?periodo=${selectedPeriod}`}
              className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-ink-200 bg-white px-3 text-xs font-semibold text-ink-700 shadow-xs hover:bg-ink-50"
              download
            >
              <Icon name="download" size={14} /> Exportar CSV
            </a>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard
            label="Total facturado"
            value={formatMoney(collectionSummary.totalChargedCents)}
            hint={`${collectionSummary.totalCount} cuotas emitidas`}
            icon={<Icon name="wallet" />}
          />
          <StatCard
            label="Total cobrado"
            value={formatMoney(collectionSummary.totalPaidCents)}
            hint={`${collectionSummary.paidCount} cuotas canceladas`}
            icon={<Icon name="receipt" />}
          />
          <StatCard
            label="Saldo pendiente"
            value={formatMoney(collectionSummary.totalPendingCents)}
            hint={`${collectionSummary.pendingCount + collectionSummary.partialCount} cuotas impagas`}
            icon={<Icon name="alert" />}
          />
          <StatCard
            label="Efectividad de cobranza"
            value={`${collectionSummary.collectionRatePct}%`}
            hint="Proporción sobre lo emitido"
            icon={<Icon name="chart" />}
          />
        </div>
      </div>

      {/* SECCIÓN 2: JUGADORES POR CATEGORÍA */}
      <Card>
        <CardHeader
          title="Planteles por Categoría"
          description="Distribución de deportistas activos e inactivos por rama y categoría."
          action={
            <a
              href="/api/reportes/jugadores"
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-brand-700 hover:underline"
              download
            >
              <Icon name="download" size={13} /> Exportar CSV
            </a>
          }
        />
        <Table minWidth="min-w-[600px]">
          <THead>
            <TR>
              <TH>Categoría</TH>
              <TH>Rama</TH>
              <TH align="center">Activos</TH>
              <TH align="center">Inactivos</TH>
              <TH align="right">Total</TH>
            </TR>
          </THead>
          <TBody>
            {playersReport.map((r) => (
              <TR key={r.categoryId}>
                <TD className="font-semibold text-ink-900">{r.categoryName}</TD>
                <TD>
                  <Badge tone="info">
                    {r.categoryGender === "male"
                      ? "Masculino"
                      : r.categoryGender === "female"
                        ? "Femenino"
                        : "Mixto"}
                  </Badge>
                </TD>
                <TD align="center" className="font-medium text-emerald-700">
                  {r.activeCount}
                </TD>
                <TD align="center" className="text-ink-400">
                  {r.inactiveCount}
                </TD>
                <TD align="right" className="font-bold text-ink-900">
                  {r.totalCount}
                </TD>
              </TR>
            ))}
            <TR className="bg-ink-50/75 font-bold text-ink-900">
              <TD colSpan={2}>Totales del Club</TD>
              <TD align="center" className="text-emerald-700">
                {totalActivePlayers}
              </TD>
              <TD align="center" className="text-ink-500">
                {totalInactivePlayers}
              </TD>
              <TD align="right">{totalAllPlayers}</TD>
            </TR>
          </TBody>
        </Table>
      </Card>

      {/* SECCIÓN 3: ASISTENCIA Y MOROSIDAD */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Asistencia promedio */}
        <Card>
          <CardHeader
            title="Asistencia Deportiva"
            description="Promedio de presentismo en entrenamientos por categoría."
            action={
              <a
                href="/api/reportes/asistencia"
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-brand-700 hover:underline"
                download
              >
                <Icon name="download" size={13} /> Exportar CSV
              </a>
            }
          />
          {attendanceReport.length === 0 ? (
            <CardBody>
              <p className="text-center text-sm text-ink-400">Sin datos de asistencia.</p>
            </CardBody>
          ) : (
            <div className="divide-y divide-ink-100">
              {attendanceReport.map((a) => (
                <div key={a.categoryId} className="flex items-center justify-between p-4">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-ink-900">{a.categoryName}</span>
                      <Badge tone="neutral">
                        {a.categoryGender === "male" ? "Masc" : "Fem"}
                      </Badge>
                    </div>
                    <p className="text-xs text-ink-500">{a.totalTrainings} sesiones registradas</p>
                  </div>
                  <div className="w-36 space-y-1 text-right">
                    <span className="text-sm font-bold text-ink-900">
                      {a.avgAttendancePct}%
                    </span>
                    <ProgressBar value={a.avgAttendancePct} max={100} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>

        {/* Familias con mayor deuda */}
        <Card>
          <CardHeader
            title="Morosidad por Familia"
            description="Familias con cuotas vencidas e importes acumulados."
            action={
              <a
                href="/api/reportes/deudas"
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-brand-700 hover:underline"
                download
              >
                <Icon name="download" size={13} /> Exportar CSV
              </a>
            }
          />
          {debtReport.length === 0 ? (
            <CardBody>
              <div className="py-8 text-center">
                <Icon name="check" size={24} className="mx-auto text-emerald-600 mb-2" />
                <p className="text-sm font-medium text-ink-800">
                  ¡Excelente! No hay familias con deuda pendiente.
                </p>
              </div>
            </CardBody>
          ) : (
            <div className="divide-y divide-ink-100">
              {debtReport.map((f) => (
                <div key={f.familyId} className="flex items-center justify-between p-4">
                  <div>
                    <Link
                      href={`/app/familias/${f.familyId}`}
                      className="font-semibold text-ink-900 hover:text-brand-700 hover:underline"
                    >
                      {f.familyName}
                    </Link>
                    <p className="text-xs text-ink-500">
                      {f.playerCount} deportista(s) · {f.unpaidChargesCount} cuota(s) impagas
                    </p>
                  </div>
                  <div className="text-right">
                    <span className="block font-bold text-red-600">
                      {formatMoney(f.totalDebtCents)}
                    </span>
                    <Badge tone="danger">Deudor</Badge>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
