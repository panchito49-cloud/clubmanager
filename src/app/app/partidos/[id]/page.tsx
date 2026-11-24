import { notFound } from "next/navigation";
import { PageHeader, NoAccess, Flash } from "@/components/ui/page";
import { Card, CardHeader, CardBody } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Icon } from "@/components/ui/icon";
import { formatDateTime } from "@/lib/format";
import { can, getTenant } from "@/server/tenant";
import { getMatch } from "@/server/data/sports";
import { toggleCallupAction, updateMatchScoreAction } from "@/app/actions/sports";

export const metadata = { title: "Detalle del Partido y Convocatoria" };

export default async function MatchDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ ok?: string; error?: string }>;
}) {
  const ctx = await getTenant();
  if (!can(ctx, "matches.view")) return <NoAccess />;

  const { id } = await params;
  const { ok, error } = await searchParams;

  const data = await getMatch(ctx, id);
  if (!data) notFound();

  const { match, players } = data;
  const canManage = can(ctx, "matches.manage");

  const calledUpPlayers = players.filter((p) => p.callupStatus !== null);
  const confirmedCount = calledUpPlayers.filter((p) => p.callupStatus === "confirmed").length;

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <PageHeader
        title={`vs ${match.rival}`}
        description={`${match.categoryName} (${
          match.categoryGender === "male" ? "Masc" : "Fem"
        }) · ${formatDateTime(match.startsAt)} · ${match.isHome ? "Local" : "Visitante"}`}
        backHref="/app/partidos"
        backLabel="Partidos"
        actions={
          <Badge tone={match.status === "played" ? "success" : "warning"}>
            {match.status === "played" ? "Finalizado" : "Programado"}
          </Badge>
        }
      />

      <Flash ok={ok} error={error} />

      {/* Panel de resultado / Tanteador */}
      <Card>
        <CardHeader
          title="Tanteador y Resultado"
          description="Cargá o actualizá los puntos del partido cuando se dispute."
        />
        <CardBody>
          {canManage ? (
            <form action={updateMatchScoreAction} className="space-y-4">
              <input type="hidden" name="matchId" value={match.id} />
              <input type="hidden" name="status" value="played" />

              <div className="flex items-center justify-center gap-4 py-2">
                <div className="text-center">
                  <label htmlFor="ourScore" className="block text-xs font-semibold uppercase tracking-wider text-ink-500">
                    Nuestro Club
                  </label>
                  <input
                    id="ourScore"
                    name="ourScore"
                    type="number"
                    min="0"
                    defaultValue={match.ourScore ?? ""}
                    placeholder="0"
                    className="mt-1 h-16 w-24 rounded-xl border border-ink-300 text-center text-3xl font-extrabold text-ink-900 shadow-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500"
                  />
                </div>

                <span className="text-2xl font-bold text-ink-400">—</span>

                <div className="text-center">
                  <label htmlFor="rivalScore" className="block text-xs font-semibold uppercase tracking-wider text-ink-500">
                    {match.rival}
                  </label>
                  <input
                    id="rivalScore"
                    name="rivalScore"
                    type="number"
                    min="0"
                    defaultValue={match.rivalScore ?? ""}
                    placeholder="0"
                    className="mt-1 h-16 w-24 rounded-xl border border-ink-300 text-center text-3xl font-extrabold text-ink-900 shadow-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500"
                  />
                </div>
              </div>

              <div className="flex justify-end pt-2">
                <button
                  type="submit"
                  className="rounded-lg bg-brand-600 px-4 py-2 text-xs font-semibold text-white shadow-sm hover:bg-brand-700"
                >
                  Guardar resultado
                </button>
              </div>
            </form>
          ) : (
            <div className="flex items-center justify-center py-4 text-center">
              <p className="text-2xl font-bold text-ink-900">
                {match.ourScore !== null && match.rivalScore !== null
                  ? `${match.ourScore} - ${match.rivalScore}`
                  : "Partido sin disputar aún"}
              </p>
            </div>
          )}
        </CardBody>
      </Card>

      {/* Lista de convocatorias */}
      <Card>
        <CardHeader
          title="Convocatoria del plantel"
          description={`${calledUpPlayers.length} jugador(es) citados · ${confirmedCount} confirmados`}
        />
        <div className="divide-y divide-ink-100">
          {players.length === 0 ? (
            <p className="px-5 py-8 text-center text-xs text-ink-500">
              No hay jugadores activos en esta categoría.
            </p>
          ) : (
            players.map((p) => {
              const isCalledUp = p.callupStatus !== null;
              return (
                <div
                  key={p.id}
                  className="flex flex-col gap-2 p-3 sm:flex-row sm:items-center sm:justify-between sm:p-4"
                >
                  <div className="flex items-center gap-3">
                    <span className="flex h-8 w-8 items-center justify-center rounded-full bg-ink-100 text-xs font-bold text-ink-700">
                      {p.jerseyNumber ? `#${p.jerseyNumber}` : "•"}
                    </span>
                    <div>
                      <p className="text-sm font-semibold text-ink-900">
                        {p.lastName}, {p.firstName}
                      </p>
                      <p className="text-xs text-ink-500">
                        {isCalledUp
                          ? p.callupStatus === "confirmed"
                            ? "Asistencia confirmada por la familia"
                            : p.callupStatus === "declined"
                              ? "Avisó que no asiste"
                              : "Citado (pendiente confirmación)"
                          : "No citado para este cotejo"}
                      </p>
                    </div>
                  </div>

                  {canManage ? (
                    <div className="flex items-center gap-2">
                      {isCalledUp ? (
                        <>
                          <form action={toggleCallupAction}>
                            <input type="hidden" name="matchId" value={match.id} />
                            <input type="hidden" name="playerId" value={p.id} />
                            <input
                              type="hidden"
                              name="status"
                              value={p.callupStatus === "confirmed" ? "invited" : "confirmed"}
                            />
                            <button
                              type="submit"
                              className={`rounded-lg px-2.5 py-1.5 text-xs font-medium transition ${
                                p.callupStatus === "confirmed"
                                  ? "bg-emerald-600 text-white shadow-sm"
                                  : "border border-ink-200 bg-white text-ink-700 hover:bg-emerald-50"
                              }`}
                            >
                              {p.callupStatus === "confirmed" ? "Confirmado ✓" : "Marcar confirmado"}
                            </button>
                          </form>

                          <form action={toggleCallupAction}>
                            <input type="hidden" name="matchId" value={match.id} />
                            <input type="hidden" name="playerId" value={p.id} />
                            <input type="hidden" name="actionType" value="remove" />
                            <button
                              type="submit"
                              className="rounded-lg border border-rose-200 px-2 py-1.5 text-xs font-medium text-rose-700 hover:bg-rose-50"
                            >
                              Desconvocar
                            </button>
                          </form>
                        </>
                      ) : (
                        <form action={toggleCallupAction}>
                          <input type="hidden" name="matchId" value={match.id} />
                          <input type="hidden" name="playerId" value={p.id} />
                          <input type="hidden" name="status" value="invited" />
                          <button
                            type="submit"
                            className="inline-flex items-center gap-1 rounded-lg border border-ink-300 bg-white px-3 py-1.5 text-xs font-semibold text-ink-800 shadow-sm hover:bg-ink-50"
                          >
                            <Icon name="plus" size={13} /> Convocar al partido
                          </button>
                        </form>
                      )}
                    </div>
                  ) : (
                    <Badge
                      tone={
                        p.callupStatus === "confirmed"
                          ? "success"
                          : p.callupStatus === "invited"
                            ? "warning"
                            : "neutral"
                      }
                    >
                      {p.callupStatus ? p.callupStatus : "No citado"}
                    </Badge>
                  )}
                </div>
              );
            })
          )}
        </div>
      </Card>
    </div>
  );
}
