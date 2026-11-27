import Link from "next/link";
import { notFound } from "next/navigation";
import { PageHeader, NoAccess, Flash } from "@/components/ui/page";
import { Card, CardHeader, CardBody } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Icon } from "@/components/ui/icon";
import { formatDateTime } from "@/lib/format";
import { getMedicalCertificateInfo } from "@/lib/medical";
import { formatWhatsAppUrl } from "@/lib/whatsapp-link";
import { can, getTenant } from "@/server/tenant";
import { getMatch } from "@/server/data/sports";
import { setMatchStatusAction, toggleCallupAction } from "@/app/actions/sports";
import { MatchScoreboard } from "@/components/sports/match-scoreboard";
import { VenueMapCard } from "@/components/sports/venue-map-card";

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
        }) · ${formatDateTime(match.startsAt)} · ${match.isHome ? "Local en Calle 33 N° 334" : "Visitante"}`}
        backHref="/app/partidos"
        backLabel="Partidos"
        actions={
          <div className="flex items-center gap-2">
            <a
              href={`/app/partidos/${match.id}/planilla`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 rounded-xl border border-red-200 bg-red-50 px-3.5 py-2 text-xs font-bold text-red-700 shadow-xs transition hover:bg-red-100"
              title="Abrir Planilla Oficial de Juego A4 para imprimir"
            >
              <Icon name="file" size={14} /> Planilla de Juego A4
            </a>
            <Badge
              tone={
                match.status === "played"
                  ? "success"
                  : match.status === "cancelled"
                    ? "danger"
                    : "warning"
              }
            >
              {match.status === "played"
                ? "Finalizado"
                : match.status === "cancelled"
                  ? "Suspendido"
                  : "Programado"}
            </Badge>

            {canManage && (
              <form action={setMatchStatusAction} className="inline-flex items-center">
                <input type="hidden" name="matchId" value={match.id} />
                {match.status === "cancelled" ? (
                  <button
                    type="submit"
                    name="status"
                    value="scheduled"
                    className="inline-flex items-center gap-1 rounded-xl border border-ink-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-ink-700 shadow-xs hover:bg-ink-50 transition"
                    title="Reanudar o reprogramar partido"
                  >
                    🔄 Reactivar
                  </button>
                ) : (
                  <button
                    type="submit"
                    name="status"
                    value="cancelled"
                    className="inline-flex items-center gap-1 rounded-xl border border-red-200 bg-red-50 px-2.5 py-1.5 text-xs font-semibold text-red-700 shadow-xs hover:bg-red-100 transition"
                    title="Suspender este partido (por lluvia, falta de jueces, etc.)"
                  >
                    ⛔ Suspender
                  </button>
                )}
              </form>
            )}
          </div>
        }
      />

      <Flash ok={ok} error={error} />

      {/* Tablero de Tanteador Final (Scoreboard de Básquetbol) */}
      <MatchScoreboard match={match} canManage={canManage} />

      {/* Ubicación de la Cancha y Navegación GPS en Google Maps */}
      <VenueMapCard
        isHome={match.isHome}
        rival={match.rival}
        location={match.location}
        startsAt={match.startsAt}
      />

      {/* Lista de Convocatorias y Buena Fe */}
      <Card>
        <CardHeader
          title="Convocatoria del Plantel (Lista de Buena Fe)"
          description={`${calledUpPlayers.length} jugador(es) citados · ${confirmedCount} confirmados`}
        />
        <div className="divide-y divide-ink-100">
          {players.length === 0 ? (
            <div className="p-8 text-center text-xs text-ink-500">
              No hay jugadores activos en esta categoría.
            </div>
          ) : (
            players.map((p) => {
              const isCalledUp = p.callupStatus !== null;
              const med = getMedicalCertificateInfo(p.medicalCertificateExpiresAt);
              const isMedicalAlert = med.status === "expired" || med.status === "missing";

              // Enlace de WhatsApp prearmado con mensaje formal del club
              const waMessage = `🏀 *Club Atlético Estudiantes de Mercedes - Convocatoria Oficial*\n\nHola! Se cita al jugador *${p.lastName}, ${p.firstName}* (#${p.jerseyNumber ?? "s/d"}) para el partido de categoría *${match.categoryName}* vs *${match.rival}*.\n\n📅 *Fecha y Hora:* ${formatDateTime(match.startsAt)}\n📍 *Lugar:* ${match.location || "Sede Calle 33 N° 334"}\n👕 *Condición:* ${match.isHome ? "Local (Indumentaria Roja)" : "Visitante"}\n\nPor favor confirmar asistencia respondiendo a este mensaje. Muchas gracias!`;
              const waUrl = formatWhatsAppUrl({
                phone: p.emergencyContactPhone,
                message: waMessage,
              });

              return (
                <div
                  key={p.id}
                  className={`flex flex-col gap-3 p-3.5 sm:flex-row sm:items-center sm:justify-between sm:p-4 transition ${
                    isMedicalAlert ? "bg-rose-50/20" : ""
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-brand-600 text-xs font-bold text-white shadow-xs">
                      {p.jerseyNumber ? `#${p.jerseyNumber}` : "•"}
                    </span>
                    <div>
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <p className="text-sm font-bold text-ink-900">
                          {p.lastName}, {p.firstName}
                        </p>
                        {p.position && (
                          <span className="rounded bg-ink-100 px-1.5 py-0.5 text-[10px] font-semibold text-ink-600">
                            {p.position}
                          </span>
                        )}
                        {/* Semáforo médico EMDAP */}
                        <span
                          className={`inline-flex items-center gap-0.5 rounded px-1.5 py-0.5 text-[10px] font-medium border ${med.badgeClass}`}
                        >
                          {med.status === "valid" ? "🟢" : med.status === "warning" ? "🟡" : "🔴"} {med.label}
                        </span>
                      </div>

                      <p className="text-xs text-ink-500 mt-0.5">
                        Estado:{" "}
                        {isCalledUp ? (
                          <span className="font-semibold text-ink-700">
                            {p.callupStatus === "confirmed"
                              ? "Asistencia confirmada ✓"
                              : p.callupStatus === "declined"
                                ? "Avisó que no asiste"
                                : "Citado (pendiente confirmación)"}
                          </span>
                        ) : (
                          "No citado para este cotejo"
                        )}
                      </p>
                    </div>
                  </div>

                  {/* Acciones para el DT y Botón de WhatsApp */}
                  <div className="flex flex-wrap items-center gap-2 pt-1 sm:pt-0">
                    {/* Botón WhatsApp de Convocatoria */}
                    {waUrl && (
                      <a
                        href={waUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 rounded-lg border border-emerald-300 bg-emerald-50 px-2.5 py-1.5 text-xs font-semibold text-emerald-800 shadow-xs hover:bg-emerald-100"
                        title="Enviar citación oficial por WhatsApp"
                      >
                        💬 WhatsApp
                      </a>
                    )}

                    {canManage ? (
                      <div className="flex items-center gap-1.5">
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
                                className={`rounded-lg px-2.5 py-1.5 text-xs font-bold transition ${
                                  p.callupStatus === "confirmed"
                                    ? "bg-emerald-600 text-white shadow-xs"
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
                              className="inline-flex items-center gap-1 rounded-lg border border-ink-300 bg-white px-3 py-1.5 text-xs font-semibold text-ink-800 shadow-xs hover:bg-ink-50"
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
                </div>
              );
            })
          )}
        </div>
      </Card>
    </div>
  );
}
