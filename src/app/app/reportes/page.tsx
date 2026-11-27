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
  getMedicalCertificateReport,
  getBasketballSeasonReport,
} from "@/server/data/reports";

export const metadata = { title: "Reportes y Estadísticas Ejecutivas" };

export default async function ReportsPage({
  searchParams,
}: {
  searchParams: Promise<{ periodo?: string }>;
}) {
  const ctx = await getTenant();
  if (!can(ctx, "reports.view")) return <NoAccess />;

  const params = await searchParams;
  const selectedPeriod = params.periodo || currentPeriod();

  const [
    playersReport,
    collectionSummary,
    attendanceReport,
    debtReport,
    medicalReport,
    seasonReport,
  ] = await Promise.all([
    getPlayersByCategoryReport(ctx),
    getCollectionSummaryReport(ctx, selectedPeriod),
    getAttendanceByCategoryReport(ctx),
    getDebtByFamilyReport(ctx),
    getMedicalCertificateReport(ctx),
    getBasketballSeasonReport(ctx),
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
      {/* HEADER EJECUTIVO CON ACCIONES */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-ink-100 pb-5">
        <div>
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1 rounded-full bg-brand-50 px-2.5 py-0.5 text-xs font-semibold text-brand-700">
              🏛️ Comisión Directiva
            </span>
            <span className="text-xs text-ink-400 font-medium">Club Atlético Estudiantes</span>
          </div>
          <h1 className="mt-1 text-2xl font-bold tracking-tight text-ink-900">
            Tablero de Control & Reportes Ejecutivos
          </h1>
          <p className="text-sm text-ink-500">
            Métricas deportivas, cobranzas mensuales, aptitud física y rendimiento del básquetbol.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Link
            href="/app/comunicaciones/nueva"
            className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-emerald-300 bg-emerald-50 px-3 text-xs font-semibold text-emerald-800 hover:bg-emerald-100 transition-colors shadow-xs"
          >
            💬 Enviar WhatsApp a Deudores
          </Link>
          <button
            type="button"
            className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-ink-200 bg-white px-3 text-xs font-semibold text-ink-700 shadow-xs hover:bg-ink-50 print:hidden"
            onClick={undefined}
          >
            🖨️ Imprimir Resumen CD
          </button>
        </div>
      </div>

      {/* BLOQUE DE KPIs RÁPIDOS SUPERIORES */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        <div className="rounded-xl border border-ink-100 bg-white p-3.5 shadow-xs">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-ink-400">
            🏀 Jugadores Activos
          </span>
          <div className="mt-1 flex items-baseline gap-1.5">
            <span className="text-2xl font-bold text-ink-900">{totalActivePlayers}</span>
            <span className="text-xs text-ink-500">/ {totalAllPlayers} total</span>
          </div>
        </div>

        <div className="rounded-xl border border-ink-100 bg-white p-3.5 shadow-xs">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-ink-400">
            💰 Recaudación Mes
          </span>
          <div className="mt-1 flex items-baseline gap-1.5">
            <span className="text-xl font-bold text-emerald-600">
              {formatMoney(collectionSummary.totalPaidCents)}
            </span>
          </div>
        </div>

        <div className="rounded-xl border border-ink-100 bg-white p-3.5 shadow-xs">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-ink-400">
            📊 Cobranza ({monthLabel(selectedPeriod)})
          </span>
          <div className="mt-1 flex items-baseline gap-1.5">
            <span className="text-2xl font-bold text-ink-900">
              {collectionSummary.collectionRatePct}%
            </span>
            <span className="text-xs text-ink-500">efectividad</span>
          </div>
        </div>

        <div className="rounded-xl border border-ink-100 bg-white p-3.5 shadow-xs">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-ink-400">
            🏥 Apto Médico EMDAP
          </span>
          <div className="mt-1 flex items-baseline gap-1.5">
            <span className="text-2xl font-bold text-ink-900">{medicalReport.compliancePct}%</span>
            <span className="text-xs text-amber-600 font-medium">
              ({medicalReport.expiredCount + medicalReport.missingCount} vencidos)
            </span>
          </div>
        </div>

        <div className="rounded-xl border border-ink-100 bg-white p-3.5 shadow-xs">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-ink-400">
            🏆 Récord Básquetbol
          </span>
          <div className="mt-1 flex items-baseline gap-1.5">
            <span className="text-2xl font-bold text-ink-900">
              {seasonReport.wonMatches} - {seasonReport.lostMatches}
            </span>
            <span className="text-xs text-emerald-600 font-semibold">
              ({seasonReport.winRatePct}% vict.)
            </span>
          </div>
        </div>

        <div className="rounded-xl border border-ink-100 bg-white p-3.5 shadow-xs">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-ink-400">
            ⚠️ Deuda Acumulada
          </span>
          <div className="mt-1 flex items-baseline gap-1.5">
            <span className="text-xl font-bold text-red-600">
              {formatMoney(debtReport.reduce((acc, d) => acc + d.totalDebtCents, 0))}
            </span>
          </div>
        </div>
      </div>

      {/* SECCIÓN 1: RESUMEN DE COBRANZAS Y GESTIÓN FINANCIERA */}
      <div className="space-y-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-lg font-bold text-ink-900">1. Cobranzas y Cuotas Sociales</h2>
            <p className="text-xs text-ink-500">
              Evolución de facturación, recaudación y saldo pendiente del período seleccionado.
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

      {/* SECCIÓN 2: RÉCORD DEPORTIVO DE BÁSQUETBOL Y TEMPORADA */}
      <Card>
        <CardHeader
          title="2. Récord Deportivo de Básquetbol (Temporada 2026)"
          description="Partidos disputados, balance de victorias y anotación por categoría competitiva."
          action={
            <a
              href="/api/reportes/temporada"
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-brand-700 hover:underline"
              download
            >
              <Icon name="download" size={13} /> Exportar CSV
            </a>
          }
        />
        <div className="p-4 bg-ink-50/50 border-b border-ink-100 grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
          <div>
            <span className="text-xs text-ink-500 font-medium">Partidos Jugados</span>
            <p className="text-xl font-bold text-ink-900">{seasonReport.playedMatches}</p>
          </div>
          <div>
            <span className="text-xs text-ink-500 font-medium">Balance Victorias / Derrotas</span>
            <p className="text-xl font-bold text-emerald-700">
              {seasonReport.wonMatches}G - {seasonReport.lostMatches}P ({seasonReport.winRatePct}%)
            </p>
          </div>
          <div>
            <span className="text-xs text-ink-500 font-medium">Puntos a Favor / En Contra</span>
            <p className="text-xl font-bold text-ink-900">
              {seasonReport.pointsFor} - {seasonReport.pointsAgainst}
            </p>
          </div>
          <div>
            <span className="text-xs text-ink-500 font-medium">Diferencia de Puntos</span>
            <p
              className={`text-xl font-bold ${
                seasonReport.pointDiff >= 0 ? "text-emerald-700" : "text-red-600"
              }`}
            >
              {seasonReport.pointDiff >= 0 ? `+${seasonReport.pointDiff}` : seasonReport.pointDiff}
            </p>
          </div>
        </div>

        {seasonReport.categoryStats.length === 0 ? (
          <CardBody>
            <p className="text-center text-sm text-ink-400 py-4">
              Aún no se han computado resultados finales de partidos oficiales en el fixture.
            </p>
          </CardBody>
        ) : (
          <Table minWidth="min-w-[650px]">
            <THead>
              <TR>
                <TH>Categoría</TH>
                <TH>Rama</TH>
                <TH align="center">Partidos</TH>
                <TH align="center">Ganados</TH>
                <TH align="center">Perdidos</TH>
                <TH align="center">Eficacia</TH>
                <TH align="right">Pts (+) / Pts (-)</TH>
                <TH align="right">Dif</TH>
              </TR>
            </THead>
            <TBody>
              {seasonReport.categoryStats.map((c) => {
                const catPct = c.total > 0 ? Math.round((c.won / c.total) * 100) : 0;
                const diff = c.pointsFor - c.pointsAgainst;
                return (
                  <TR key={c.categoryId}>
                    <TD className="font-semibold text-ink-900">{c.categoryName}</TD>
                    <TD>
                      <Badge tone="info">
                        {c.categoryGender === "male"
                          ? "Masculino"
                          : c.categoryGender === "female"
                            ? "Femenino"
                            : "Mixto"}
                      </Badge>
                    </TD>
                    <TD align="center" className="font-semibold text-ink-900">
                      {c.total}
                    </TD>
                    <TD align="center" className="font-bold text-emerald-700">
                      {c.won}
                    </TD>
                    <TD align="center" className="text-red-600">
                      {c.lost}
                    </TD>
                    <TD align="center">
                      <span className="inline-flex items-center rounded-md bg-emerald-50 px-2 py-0.5 text-xs font-semibold text-emerald-700">
                        {catPct}%
                      </span>
                    </TD>
                    <TD align="right" className="text-ink-600 font-mono text-xs">
                      {c.pointsFor} - {c.pointsAgainst}
                    </TD>
                    <TD
                      align="right"
                      className={`font-bold font-mono ${
                        diff >= 0 ? "text-emerald-700" : "text-red-600"
                      }`}
                    >
                      {diff >= 0 ? `+${diff}` : diff}
                    </TD>
                  </TR>
                );
              })}
            </TBody>
          </Table>
        )}
      </Card>

      {/* SECCIÓN 3: CONTROL DE APTITUD FÍSICA Y SALUD (EMDAP) */}
      <Card>
        <CardHeader
          title="3. Control Sanitario & Aptos Médicos (EMDAP)"
          description="Seguimiento de certificados de salud obligatorios de los deportistas activos del club."
          action={
            <div className="flex items-center gap-3">
              <a
                href="/api/reportes/medico"
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-brand-700 hover:underline"
                download
              >
                <Icon name="download" size={13} /> Exportar CSV
              </a>
              <Link
                href="/app/comunicaciones/nueva"
                className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-700 hover:underline"
              >
                💬 Notificar por WhatsApp
              </Link>
            </div>
          }
        />
        <div className="p-4 bg-ink-50/50 border-b border-ink-100 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="w-full sm:w-1/2 space-y-1">
            <div className="flex items-center justify-between text-xs font-medium text-ink-700">
              <span>Cumplimiento Sanitario Global</span>
              <span className="font-bold">{medicalReport.compliancePct}% al día</span>
            </div>
            <ProgressBar value={medicalReport.compliancePct} max={100} />
          </div>
          <div className="flex items-center gap-4 text-xs">
            <div className="flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-full bg-emerald-500"></span>
              <span className="font-semibold text-ink-800">{medicalReport.validCount}</span>
              <span className="text-ink-500">Al día</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-full bg-red-500"></span>
              <span className="font-semibold text-red-700">{medicalReport.expiredCount}</span>
              <span className="text-ink-500">Vencidos</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-full bg-amber-500"></span>
              <span className="font-semibold text-amber-700">{medicalReport.missingCount}</span>
              <span className="text-ink-500">Sin certificado</span>
            </div>
          </div>
        </div>

        {medicalReport.expiredPlayers.length === 0 ? (
          <CardBody>
            <div className="py-6 text-center">
              <Icon name="check" size={28} className="mx-auto text-emerald-600 mb-2" />
              <p className="text-sm font-semibold text-ink-800">
                ¡Excelente! El 100% del plantel activo cuenta con certificado médico EMDAP vigente.
              </p>
            </div>
          </CardBody>
        ) : (
          <Table minWidth="min-w-[650px]">
            <THead>
              <TR>
                <TH>Deportista</TH>
                <TH>Categoría</TH>
                <TH>Familia / Tutor</TH>
                <TH align="center">Estado del Certificado</TH>
                <TH align="right">Acción</TH>
              </TR>
            </THead>
            <TBody>
              {medicalReport.expiredPlayers.slice(0, 10).map((p) => (
                <TR key={p.id}>
                  <TD className="font-semibold text-ink-900">{p.fullName}</TD>
                  <TD className="text-xs text-ink-600">{p.categoryName}</TD>
                  <TD className="text-xs text-ink-600">{p.familyName || "Sin familia vinculada"}</TD>
                  <TD align="center">
                    {p.expiresAt ? (
                      <Badge tone="danger">
                        Venció el {p.expiresAt} ({p.daysExpired} días)
                      </Badge>
                    ) : (
                      <Badge tone="warning">No presentado</Badge>
                    )}
                  </TD>
                  <TD align="right">
                    <Link
                      href="/app/comunicaciones/nueva"
                      className="text-xs font-semibold text-emerald-700 hover:underline"
                    >
                      Avisar por WhatsApp
                    </Link>
                  </TD>
                </TR>
              ))}
            </TBody>
          </Table>
        )}
      </Card>

      {/* SECCIÓN 4: ASISTENCIA Y MOROSIDAD */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Asistencia promedio */}
        <Card>
          <CardHeader
            title="4. Presentismo en Entrenamientos"
            description="Promedio de asistencia en entrenamientos por categoría."
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
            title="5. Ranking de Morosidad por Familia"
            description="Familias con cuotas vencidas e importes acumulados para gestión de cobranza."
            action={
              <div className="flex items-center gap-3">
                <a
                  href="/api/reportes/deudas"
                  className="inline-flex items-center gap-1.5 text-xs font-semibold text-brand-700 hover:underline"
                  download
                >
                  <Icon name="download" size={13} /> Exportar CSV
                </a>
              </div>
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
                    <Link
                      href="/app/comunicaciones/nueva"
                      className="text-[11px] font-semibold text-emerald-700 hover:underline inline-block mt-0.5"
                    >
                      Reclamar WhatsApp →
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>

      {/* SECCIÓN 5: DISTRIBUCIÓN DE PLANTELES POR CATEGORÍA */}
      <Card>
        <CardHeader
          title="6. Padrón de Deportistas por Categoría"
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
    </div>
  );
}
