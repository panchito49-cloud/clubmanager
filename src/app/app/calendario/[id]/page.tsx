import { notFound } from "next/navigation";
import { PageHeader, NoAccess, Flash } from "@/components/ui/page";
import { Card, CardHeader, CardBody } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Icon } from "@/components/ui/icon";
import { formatDateTime } from "@/lib/format";
import { can, getTenant } from "@/server/tenant";
import { getTraining } from "@/server/data/sports";
import { markAllAttendanceAction, recordAttendanceAction } from "@/app/actions/sports";

export const metadata = { title: "Toma de Asistencia" };

export default async function TrainingDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ ok?: string; error?: string }>;
}) {
  const ctx = await getTenant();
  if (!can(ctx, "trainings.view")) return <NoAccess />;

  const { id } = await params;
  const { ok, error } = await searchParams;

  const data = await getTraining(ctx, id);
  if (!data) notFound();

  const { training, roster } = data;
  const canRecord = can(ctx, "attendance.record");

  const presentCount = roster.filter(
    (p) => p.attendanceStatus === "present" || p.attendanceStatus === "late",
  ).length;
  const totalCount = roster.length;
  const pct = totalCount > 0 ? Math.round((presentCount / totalCount) * 100) : 0;

  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <PageHeader
        title={training.title}
        description={`${training.categoryName} (${
          training.categoryGender === "male" ? "Masc" : "Fem"
        }) · ${formatDateTime(training.startsAt)} · ${training.location ?? "Cancha del club"}`}
        backHref="/app/calendario"
        backLabel="Calendario"
        actions={
          <Badge tone={training.status === "completed" ? "success" : "info"}>
            {training.status === "completed" ? "Realizado" : "Programado"}
          </Badge>
        }
      />

      <Flash ok={ok} error={error} />

      {/* Panel de métricas rápidas de presentismo */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="rounded-xl border border-ink-200 bg-white p-3 shadow-sm">
          <p className="text-xs text-ink-500">Plantel</p>
          <p className="mt-1 text-xl font-bold text-ink-900">{totalCount}</p>
        </div>
        <div className="rounded-xl border border-emerald-200 bg-emerald-50/50 p-3 shadow-sm">
          <p className="text-xs text-emerald-700">Presentes</p>
          <p className="mt-1 text-xl font-bold text-emerald-800">{presentCount}</p>
        </div>
        <div className="rounded-xl border border-rose-200 bg-rose-50/50 p-3 shadow-sm">
          <p className="text-xs text-rose-700">Ausentes</p>
          <p className="mt-1 text-xl font-bold text-rose-800">
            {roster.filter((p) => p.attendanceStatus === "absent").length}
          </p>
        </div>
        <div className="rounded-xl border border-ink-200 bg-white p-3 shadow-sm">
          <p className="text-xs text-ink-500">% Presentismo</p>
          <p className="mt-1 text-xl font-bold text-brand-700">{pct}%</p>
        </div>
      </div>

      {canRecord && roster.length > 0 ? (
        <Card className="bg-brand-50/40 p-3 sm:p-4">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h4 className="text-xs font-bold uppercase tracking-wider text-brand-900">
                Acción rápida para el DT
              </h4>
              <p className="text-xs text-brand-700">
                Marcá todo el equipo presente en un solo click si no faltó nadie.
              </p>
            </div>
            <form action={markAllAttendanceAction}>
              <input type="hidden" name="trainingId" value={training.id} />
              <input type="hidden" name="status" value="present" />
              {roster.map((p) => (
                <input key={p.id} type="hidden" name="playerIds" value={p.id} />
              ))}
              <button
                type="submit"
                className="inline-flex items-center gap-1.5 rounded-lg bg-brand-600 px-3.5 py-2 text-xs font-semibold text-white shadow-sm hover:bg-brand-700"
              >
                <Icon name="check" size={14} /> Marcar todo el plantel presente
              </button>
            </form>
          </div>
        </Card>
      ) : null}

      {/* Lista interactiva de jugadores para toma de asistencia */}
      <Card>
        <CardHeader
          title="Planilla de asistencia"
          description="Tocá el estado correspondiente para cada jugador."
        />
        <div className="divide-y divide-ink-100">
          {roster.length === 0 ? (
            <p className="px-5 py-8 text-center text-xs text-ink-500">
              No hay jugadores activos asignados a esta categoría todavía.
            </p>
          ) : (
            roster.map((player) => (
              <div
                key={player.id}
                className="flex flex-col gap-2 p-3 sm:flex-row sm:items-center sm:justify-between sm:p-4"
              >
                <div className="flex items-center gap-3">
                  <span className="flex h-8 w-8 items-center justify-center rounded-full bg-ink-100 text-xs font-bold text-ink-700">
                    {player.jerseyNumber ? `#${player.jerseyNumber}` : "•"}
                  </span>
                  <div>
                    <p className="text-sm font-semibold text-ink-900">
                      {player.lastName}, {player.firstName}
                    </p>
                    <p className="text-xs text-ink-500">
                      Estado:{" "}
                      {player.attendanceStatus === "present"
                        ? "Presente"
                        : player.attendanceStatus === "late"
                          ? "Llegó tarde"
                          : player.attendanceStatus === "absent"
                            ? "Ausente"
                            : player.attendanceStatus === "justified"
                              ? "Falta justificada"
                              : "Sin registrar"}
                    </p>
                  </div>
                </div>

                {canRecord ? (
                  <div className="flex flex-wrap items-center gap-1.5">
                    {/* Botón Presente */}
                    <form action={recordAttendanceAction}>
                      <input type="hidden" name="trainingId" value={training.id} />
                      <input type="hidden" name="playerId" value={player.id} />
                      <input type="hidden" name="status" value="present" />
                      <button
                        type="submit"
                        className={`rounded-lg px-2.5 py-1.5 text-xs font-medium transition ${
                          player.attendanceStatus === "present"
                            ? "bg-emerald-600 text-white shadow-sm ring-2 ring-emerald-600"
                            : "border border-ink-200 bg-white text-ink-700 hover:bg-emerald-50 hover:text-emerald-700"
                        }`}
                      >
                        Presente
                      </button>
                    </form>

                    {/* Botón Tarde */}
                    <form action={recordAttendanceAction}>
                      <input type="hidden" name="trainingId" value={training.id} />
                      <input type="hidden" name="playerId" value={player.id} />
                      <input type="hidden" name="status" value="late" />
                      <button
                        type="submit"
                        className={`rounded-lg px-2.5 py-1.5 text-xs font-medium transition ${
                          player.attendanceStatus === "late"
                            ? "bg-amber-500 text-white shadow-sm ring-2 ring-amber-500"
                            : "border border-ink-200 bg-white text-ink-700 hover:bg-amber-50 hover:text-amber-700"
                        }`}
                      >
                        Tarde
                      </button>
                    </form>

                    {/* Botón Ausente */}
                    <form action={recordAttendanceAction}>
                      <input type="hidden" name="trainingId" value={training.id} />
                      <input type="hidden" name="playerId" value={player.id} />
                      <input type="hidden" name="status" value="absent" />
                      <button
                        type="submit"
                        className={`rounded-lg px-2.5 py-1.5 text-xs font-medium transition ${
                          player.attendanceStatus === "absent"
                            ? "bg-rose-600 text-white shadow-sm ring-2 ring-rose-600"
                            : "border border-ink-200 bg-white text-ink-700 hover:bg-rose-50 hover:text-rose-700"
                        }`}
                      >
                        Ausente
                      </button>
                    </form>

                    {/* Botón Justificado */}
                    <form action={recordAttendanceAction}>
                      <input type="hidden" name="trainingId" value={training.id} />
                      <input type="hidden" name="playerId" value={player.id} />
                      <input type="hidden" name="status" value="justified" />
                      <button
                        type="submit"
                        className={`rounded-lg px-2.5 py-1.5 text-xs font-medium transition ${
                          player.attendanceStatus === "justified"
                            ? "bg-sky-600 text-white shadow-sm ring-2 ring-sky-600"
                            : "border border-ink-200 bg-white text-ink-700 hover:bg-sky-50 hover:text-sky-700"
                        }`}
                      >
                        Justificado
                      </button>
                    </form>
                  </div>
                ) : (
                  <Badge
                    tone={
                      player.attendanceStatus === "present"
                        ? "success"
                        : player.attendanceStatus === "late"
                          ? "warning"
                          : player.attendanceStatus === "absent"
                            ? "danger"
                            : "neutral"
                    }
                  >
                    {player.attendanceStatus ?? "Sin registrar"}
                  </Badge>
                )}
              </div>
            ))
          )}
        </div>
      </Card>
    </div>
  );
}
