import Link from "next/link";
import { PageHeader, NoAccess, Flash } from "@/components/ui/page";
import { Card, CardHeader, CardBody } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatDateTime } from "@/lib/format";
import { can, getTenant } from "@/server/tenant";
import { getAttendanceHubData } from "@/server/data/sports";
import { startExpressTrainingAction } from "@/app/actions/sports";

export const metadata = { title: "Control de Asistencia" };

export default async function AttendanceHubPage({
  searchParams,
}: {
  searchParams: Promise<{ ok?: string; error?: string }>;
}) {
  const ctx = await getTenant();
  if (!can(ctx, "trainings.view")) return <NoAccess />;

  const { ok, error } = await searchParams;
  const { recentTrainings, accessibleCategories, stats } = await getAttendanceHubData(ctx);
  const canManage = can(ctx, "trainings.manage");

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <PageHeader
        title="Control de Asistencia en Cancha"
        description="Planilla móvil para entrenadores, semáforo de apto médico y métricas de presentismo."
        actions={
          <Link
            href="/app/calendario"
            className="inline-flex items-center gap-1.5 rounded-xl border border-ink-200 bg-white px-3.5 py-2 text-xs font-semibold text-ink-700 shadow-xs hover:bg-ink-50"
          >
            📅 Ver calendario completo
          </Link>
        }
      />

      <Flash ok={ok} error={error} />

      {/* Launcher de Entrenamiento Rápido para el DT */}
      {canManage && (
        <Card className="border-brand-200 bg-gradient-to-r from-brand-50/70 via-white to-brand-50/30 p-4 sm:p-5">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <div className="flex items-center gap-2">
                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-brand-600 text-xs text-white">
                  ⚡
                </span>
                <h3 className="text-sm font-bold text-brand-950 uppercase tracking-wider">
                  Iniciar Entrenamiento Ahora
                </h3>
              </div>
              <p className="mt-1 text-xs text-brand-800">
                Seleccioná la categoría y comenzá a tomar lista en la cancha inmediatamente en tu celular.
              </p>
            </div>

            <form action={startExpressTrainingAction} className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
              <select
                name="categoryId"
                required
                className="rounded-xl border border-brand-300 bg-white px-3 py-2 text-xs font-semibold text-ink-900 shadow-xs focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
              >
                <option value="">-- Seleccionar categoría --</option>
                {accessibleCategories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} ({c.gender === "male" ? "Masc" : "Fem"})
                  </option>
                ))}
              </select>

              <input
                type="hidden"
                name="location"
                value="Estadio Centenario - Cancha 1 (Calle 33 N° 334)"
              />

              <button
                type="submit"
                className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-brand-600 px-4 py-2 text-xs font-bold text-white shadow-sm transition hover:bg-brand-700 active:scale-95"
              >
                Iniciar sesión →
              </button>
            </form>
          </div>
        </Card>
      )}

      {/* Tarjetas de Estadísticas Globales */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="rounded-2xl border border-ink-200 bg-white p-4 shadow-sm">
          <p className="text-xs font-medium text-ink-500">Sesiones recientes</p>
          <p className="mt-1.5 text-2xl font-bold text-ink-900">{stats.totalSessions}</p>
          <p className="mt-0.5 text-[11px] text-ink-400">Entrenamientos registrados</p>
        </div>

        <div className="rounded-2xl border border-emerald-200 bg-emerald-50/50 p-4 shadow-sm">
          <p className="text-xs font-medium text-emerald-700">Presentes totales</p>
          <p className="mt-1.5 text-2xl font-bold text-emerald-800">{stats.totalPresent}</p>
          <p className="mt-0.5 text-[11px] text-emerald-600">Asistencias confirmadas</p>
        </div>

        <div className="rounded-2xl border border-ink-200 bg-white p-4 shadow-sm">
          <p className="text-xs font-medium text-ink-500">Total asistencias tomadas</p>
          <p className="mt-1.5 text-2xl font-bold text-ink-900">{stats.totalRecorded}</p>
          <p className="mt-0.5 text-[11px] text-ink-400">Marcaciones en planilla</p>
        </div>

        <div className="rounded-2xl border border-brand-200 bg-brand-50/50 p-4 shadow-sm">
          <p className="text-xs font-medium text-brand-800">% Asistencia promedio</p>
          <p className="mt-1.5 text-2xl font-bold text-brand-900">{stats.averageAttendancePct}%</p>
          <p className="mt-0.5 text-[11px] text-brand-700">Presentismo general</p>
        </div>
      </div>

      {/* Listado de Entrenamientos Recientes */}
      <Card>
        <CardHeader
          title="Entrenamientos y Planillas de Cancha"
          description="Tocá en cualquier entrenamiento para abrir la planilla táctil en el celular."
        />
        <div className="divide-y divide-ink-100">
          {recentTrainings.length === 0 ? (
            <div className="p-8 text-center text-xs text-ink-500">
              No hay entrenamientos programados ni recientes todavía.
            </div>
          ) : (
            recentTrainings.map((t) => {
              const pct = t.totalPlayers > 0 ? Math.round((t.presentCount / t.totalPlayers) * 100) : 0;
              const isToday =
                new Date(t.startsAt).toDateString() === new Date().toDateString();

              return (
                <div
                  key={t.id}
                  className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between transition hover:bg-ink-50/50"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="inline-flex items-center rounded-md bg-brand-50 px-2 py-0.5 text-xs font-bold text-brand-700 ring-1 ring-inset ring-brand-700/10">
                        {t.categoryName} ({t.categoryGender === "male" ? "Masc" : "Fem"})
                      </span>
                      {isToday && (
                        <span className="rounded-md bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-800">
                          HOY
                        </span>
                      )}
                      <Badge tone={t.status === "completed" ? "success" : "info"}>
                        {t.status === "completed" ? "Realizado" : "Programado"}
                      </Badge>
                    </div>

                    <h4 className="text-sm font-bold text-ink-900">{t.title}</h4>
                    <p className="text-xs text-ink-500">
                      📅 {formatDateTime(t.startsAt)} · 📍 {t.location || "Sede Calle 33 N° 334"}
                      {t.coachName ? ` · DT: ${t.coachName}` : ""}
                    </p>
                  </div>

                  <div className="flex items-center justify-between sm:justify-end gap-3 pt-2 sm:pt-0">
                    {/* Contador de presentismo */}
                    <div className="text-right">
                      <p className="text-xs font-bold text-ink-900">
                        {t.presentCount} / {t.totalPlayers} presentes
                      </p>
                      <p className="text-[11px] font-medium text-brand-700">
                        {pct}% asistencia
                      </p>
                    </div>

                    <Link
                      href={`/app/asistencias/${t.id}`}
                      className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-brand-600 px-3.5 py-2 text-xs font-bold text-white shadow-sm transition hover:bg-brand-700 active:scale-95"
                    >
                      📋 Tomar Lista
                    </Link>
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
