import Link from "next/link";
import Image from "next/image";
import { PageHeader, NoAccess, Flash } from "@/components/ui/page";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ButtonLink } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { Select } from "@/components/ui/form";
import { formatDateTime } from "@/lib/format";
import { can, getTenant } from "@/server/tenant";
import { listCategories } from "@/server/data/people";
import { getMatchesHubData } from "@/server/data/sports";
import { VenueMapCard } from "@/components/sports/venue-map-card";
import { getTeamBadge } from "@/lib/venues";

export const metadata = { title: "Partidos y Fixture" };

export default async function MatchesPage({
  searchParams,
}: {
  searchParams: Promise<{ categoria?: string; estado?: string; ok?: string; error?: string }>;
}) {
  const ctx = await getTenant();
  if (!can(ctx, "matches.view")) return <NoAccess />;

  const params = await searchParams;
  const [categories, hubData] = await Promise.all([
    listCategories(ctx),
    getMatchesHubData(ctx, {
      categoryId: params.categoria,
      status: params.estado,
    }),
  ]);

  const { matches, stats } = hubData;
  const canManage = can(ctx, "matches.manage");

  return (
    <div className="space-y-6">
      <PageHeader
        title="Fixture y Partidos"
        description="Calendario de partidos vs rivales, carga de resultado final y planillas de juego."
        actions={
          canManage ? (
            <div className="flex items-center gap-2">
              <ButtonLink href="/app/partidos/importar" size="sm" variant="secondary">
                <Icon name="upload" size={15} /> Importar Excel/CSV
              </ButtonLink>
              <ButtonLink href="/app/partidos/nuevo" size="sm">
                <Icon name="plus" size={15} /> Programar partido
              </ButtonLink>
            </div>
          ) : null
        }
      />

      <Flash ok={params.ok} error={params.error} />

      {/* Métricas de la Temporada */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {/* Record G-P */}
        <div className="rounded-2xl border border-ink-200 bg-white p-4 shadow-sm">
          <p className="text-xs font-medium text-ink-500">Record de temporada</p>
          <div className="mt-1 flex items-baseline gap-2">
            <span className="text-2xl font-black text-ink-900">
              {stats.wonCount}G - {stats.lostCount}P
            </span>
            {stats.tieCount > 0 && (
              <span className="text-xs text-ink-400">({stats.tieCount}E)</span>
            )}
          </div>
          <p className="mt-0.5 text-[11px] font-semibold text-emerald-700">
            {stats.winRatePct}% Eficacia ({stats.playedCount} jugados)
          </p>
        </div>

        {/* Puntos a Favor */}
        <div className="rounded-2xl border border-brand-200 bg-brand-50/40 p-4 shadow-sm">
          <p className="text-xs font-medium text-brand-900">Puntos a Favor (PF)</p>
          <p className="mt-1 text-2xl font-black text-brand-950">{stats.totalPointsFor}</p>
          <p className="mt-0.5 text-[11px] text-brand-700">
            {stats.avgPointsFor} pts / partido
          </p>
        </div>

        {/* Puntos en Contra */}
        <div className="rounded-2xl border border-ink-200 bg-white p-4 shadow-sm">
          <p className="text-xs font-medium text-ink-500">Puntos en Contra (PC)</p>
          <p className="mt-1 text-2xl font-black text-ink-900">{stats.totalPointsAgainst}</p>
          <p className="mt-0.5 text-[11px] text-ink-500">
            {stats.avgPointsAgainst} pts / partido
          </p>
        </div>

        {/* Próximos Partidos */}
        <div className="rounded-2xl border border-ink-200 bg-white p-4 shadow-sm">
          <p className="text-xs font-medium text-ink-500">Fixture pendiente</p>
          <p className="mt-1 text-2xl font-black text-brand-700">{stats.upcomingCount}</p>
          <p className="mt-0.5 text-[11px] text-ink-400">Partidos por disputar</p>
        </div>
      </div>

      {/* Barra de Filtros */}
      <Card className="overflow-hidden">
        <form
          method="get"
          className="flex flex-col gap-2 border-b border-ink-100 p-3 sm:flex-row sm:items-center sm:justify-between sm:p-4"
        >
          <div className="flex flex-1 flex-wrap items-center gap-2">
            <Select
              name="categoria"
              defaultValue={params.categoria ?? ""}
              aria-label="Filtrar por categoría"
              className="w-full sm:w-60 text-xs"
            >
              <option value="">Todas las categorías</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} ({c.gender === "male" ? "Masc" : "Fem"})
                </option>
              ))}
            </Select>

            <Select
              name="estado"
              defaultValue={params.estado ?? ""}
              aria-label="Filtrar por estado"
              className="w-full sm:w-44 text-xs"
            >
              <option value="">Todos los partidos</option>
              <option value="scheduled">Próximos (Fixture)</option>
              <option value="played">Finalizados (Resultados)</option>
              <option value="cancelled">Suspendidos</option>
            </Select>

            <button
              type="submit"
              className="inline-flex h-9 items-center rounded-xl bg-ink-900 px-3.5 text-xs font-semibold text-white hover:bg-ink-800"
            >
              Filtrar
            </button>

            {(params.categoria || params.estado) && (
              <Link
                href="/app/partidos"
                className="text-xs font-semibold text-ink-500 hover:text-ink-900"
              >
                Limpiar
              </Link>
            )}
          </div>
        </form>

        {/* Lista de Partidos */}
        <div className="divide-y divide-ink-100">
          {matches.length === 0 ? (
            <div className="p-12 text-center text-xs text-ink-400">
              No hay partidos que coincidan con los filtros seleccionados.
            </div>
          ) : (
            matches.map((m) => {
              const isPlayed = m.status === "played" && m.ourScore !== null && m.rivalScore !== null;
              const isWin = isPlayed && (m.ourScore ?? 0) > (m.rivalScore ?? 0);
              const isLoss = isPlayed && (m.ourScore ?? 0) < (m.rivalScore ?? 0);
              const diff = Math.abs((m.ourScore ?? 0) - (m.rivalScore ?? 0));

              return (
                <div
                  key={m.id}
                  className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between transition hover:bg-ink-50/50"
                >
                  {/* Datos del partido */}
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="inline-flex items-center rounded-md bg-brand-50 px-2 py-0.5 text-xs font-bold text-brand-700 ring-1 ring-inset ring-brand-700/10">
                        {m.categoryName} ({m.categoryGender === "male" ? "Masc" : "Fem"})
                      </span>
                      <span className="rounded-md bg-ink-100 px-2 py-0.5 text-[11px] font-semibold text-ink-700">
                        {m.isHome ? "Local en Calle 33 N° 334" : "Visitante"}
                      </span>
                      {isPlayed ? (
                        <span
                          className={`rounded-md px-2 py-0.5 text-xs font-extrabold uppercase ${
                            isWin
                              ? "bg-emerald-100 text-emerald-800"
                              : isLoss
                                ? "bg-rose-100 text-rose-800"
                                : "bg-ink-100 text-ink-800"
                          }`}
                        >
                          {isWin ? `Victoria (+${diff})` : isLoss ? `Derrota (-${diff})` : "Empate"}
                        </span>
                      ) : m.status === "cancelled" ? (
                        <Badge tone="danger">⛔ Suspendido</Badge>
                      ) : (
                        <Badge tone="warning">Programado</Badge>
                      )}
                    </div>

                    <div className="flex items-center gap-2.5 flex-wrap">
                      <div className="flex items-center -space-x-1.5 flex-shrink-0">
                        <div className="relative h-7 w-7 rounded-full border-2 border-white bg-white shadow-2xs overflow-hidden z-10">
                          <Image
                            src="/escudos/estudiantes.png"
                            alt="Estudiantes"
                            fill
                            className="object-contain p-0.5"
                          />
                        </div>
                        <div className="relative h-7 w-7 rounded-full border-2 border-white bg-white shadow-2xs overflow-hidden">
                          <Image
                            src={getTeamBadge(m.rival)}
                            alt={m.rival}
                            fill
                            className="object-contain p-0.5"
                          />
                        </div>
                      </div>
                      <h4 className="text-base font-bold text-ink-900">
                        Estudiantes vs {m.rival}
                      </h4>
                      <VenueMapCard
                        isHome={m.isHome}
                        rival={m.rival}
                        location={m.location}
                        compact={true}
                      />
                    </div>

                    <p className="text-xs text-ink-500">
                      📅 {formatDateTime(m.startsAt)}
                      {m.coachName ? ` · DT: ${m.coachName}` : ""}
                      {` · Convocados: ${m.confirmedCount} confirmados de ${m.callupCount}`}
                    </p>

                    {m.notes && (
                      <p className="text-xs italic text-ink-500">
                        &ldquo;{m.notes}&rdquo;
                      </p>
                    )}
                  </div>

                  {/* Tanteador y Acciones */}
                  <div className="flex items-center justify-between sm:justify-end gap-3 pt-2 sm:pt-0">
                    {/* Tanteador si está jugado */}
                    {isPlayed ? (
                      <div className="flex items-center gap-2 rounded-xl border border-ink-200 bg-white px-3 py-1.5 shadow-xs text-center">
                        <div className="text-right">
                          <p className="text-[10px] font-bold text-brand-700 uppercase">Estudiantes</p>
                          <p className="text-lg font-black text-ink-900">{m.ourScore}</p>
                        </div>
                        <span className="text-sm font-bold text-ink-300">—</span>
                        <div className="text-left">
                          <p className="text-[10px] font-bold text-ink-500 uppercase truncate max-w-[70px]">{m.rival}</p>
                          <p className="text-lg font-black text-ink-900">{m.rivalScore}</p>
                        </div>
                      </div>
                    ) : (
                      canManage && (
                        <Link
                          href={`/app/partidos/${m.id}`}
                          className="inline-flex items-center gap-1.5 rounded-xl border border-brand-300 bg-brand-50 px-3 py-2 text-xs font-bold text-brand-800 shadow-xs hover:bg-brand-100 transition"
                        >
                          ⚡ Cargar Resultado
                        </Link>
                      )
                    )}

                    <div className="flex items-center gap-1.5">
                      <a
                        href={`/app/partidos/${m.id}/planilla`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 rounded-xl border border-ink-200 bg-white px-2.5 py-2 text-xs font-semibold text-ink-700 hover:bg-ink-50 shadow-xs"
                        title="Abrir Planilla Oficial de Juego A4"
                      >
                        <Icon name="file" size={13} /> Planilla A4
                      </a>

                      <Link
                        href={`/app/partidos/${m.id}`}
                        className="inline-flex items-center gap-1 rounded-xl bg-ink-900 px-3 py-2 text-xs font-bold text-white shadow-xs hover:bg-ink-800 transition"
                      >
                        Ver detalle →
                      </Link>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </Card>
    </div>
  );
}
