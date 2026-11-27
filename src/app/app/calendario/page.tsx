import Link from "next/link";
import { PageHeader, NoAccess, Flash } from "@/components/ui/page";
import { Card, CardHeader, CardBody } from "@/components/ui/card";
import { Table, THead, TBody, TR, TH, TD } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { ButtonLink } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { Select } from "@/components/ui/form";
import { formatDate, formatDateTime } from "@/lib/format";
import { can, getTenant } from "@/server/tenant";
import { listCategories } from "@/server/data/people";
import { listTrainings } from "@/server/data/sports";
import { VenueMapCard } from "@/components/sports/venue-map-card";

export const metadata = { title: "Calendario y Entrenamientos" };

export default async function CalendarPage({
  searchParams,
}: {
  searchParams: Promise<{ categoria?: string; ok?: string; error?: string }>;
}) {
  const ctx = await getTenant();
  if (!can(ctx, "trainings.view")) return <NoAccess />;

  const params = await searchParams;
  const [categories, trainings] = await Promise.all([
    listCategories(ctx),
    listTrainings(ctx, { categoryId: params.categoria }),
  ]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Calendario Deportivo"
        description="Programación de entrenamientos, horarios por categoría y registro de asistencia en cancha."
        actions={
          can(ctx, "trainings.manage") ? (
            <ButtonLink href="/app/calendario/nuevo" size="sm">
              <Icon name="plus" size={15} /> Nuevo entrenamiento
            </ButtonLink>
          ) : null
        }
      />

      <Flash ok={params.ok} error={params.error} />

      <Card className="overflow-hidden">
        <form
          method="get"
          className="flex flex-col gap-2 border-b border-ink-100 p-3 sm:flex-row sm:items-center sm:p-4"
        >
          <div className="flex flex-1 items-center gap-2">
            <Select
              name="categoria"
              defaultValue={params.categoria ?? ""}
              aria-label="Filtrar por categoría"
              className="w-full sm:w-64"
            >
              <option value="">Todas las categorías</option>
              {categories.map((c) => {
                const suffix =
                  c.gender === "male"
                    ? " (Masc.)"
                    : c.gender === "female"
                      ? " (Fem.)"
                      : "";
                return (
                  <option key={c.id} value={c.id}>
                    {c.name}
                    {suffix}
                  </option>
                );
              })}
            </Select>
            <button
              type="submit"
              className="inline-flex h-9 items-center rounded-lg bg-ink-100 px-3 text-xs font-semibold text-ink-700 hover:bg-ink-200"
            >
              Filtrar
            </button>
          </div>
        </form>

        {trainings.length === 0 ? (
          <p className="px-5 py-12 text-center text-sm text-ink-400">
            No hay entrenamientos programados para el filtro seleccionado.
          </p>
        ) : (
          <Table minWidth="min-w-[650px]">
            <THead>
              <TR>
                <TH>Fecha y Horario</TH>
                <TH>Categoría</TH>
                <TH>Título / Objetivo</TH>
                <TH>Lugar</TH>
                <TH align="center">Asistencia</TH>
                <TH />
              </TR>
            </THead>
            <TBody>
              {trainings.map((t) => {
                const pct =
                  t.totalPlayers > 0
                    ? Math.round((t.presentCount / t.totalPlayers) * 100)
                    : 0;
                return (
                  <TR key={t.id}>
                    <TD className="whitespace-nowrap font-medium text-ink-900">
                      {formatDateTime(t.startsAt)}
                    </TD>
                    <TD>
                      <Badge tone="info">
                        {t.categoryName} ({t.categoryGender === "male" ? "Masc" : "Fem"})
                      </Badge>
                    </TD>
                    <TD>
                      <span className="font-medium text-ink-900">{t.title}</span>
                      {t.coachName ? (
                        <p className="text-xs text-ink-500">DT: {t.coachName}</p>
                      ) : null}
                    </TD>
                    <TD>
                      <VenueMapCard
                        isHome={true}
                        location={t.location || "Estadio Centenario - Calle 33 N° 334, Mercedes"}
                        compact={true}
                      />
                    </TD>
                    <TD align="center">
                      <div className="flex flex-col items-center">
                        <span className="text-xs font-semibold text-ink-800">
                          {t.presentCount} / {t.totalPlayers} ({pct}%)
                        </span>
                        <div className="mt-1 h-1.5 w-16 overflow-hidden rounded-full bg-ink-100">
                          <div
                            className={`h-full ${
                              pct >= 75
                                ? "bg-emerald-500"
                                : pct >= 50
                                  ? "bg-amber-500"
                                  : "bg-rose-500"
                            }`}
                            style={{ width: `${Math.min(100, pct)}%` }}
                          />
                        </div>
                      </div>
                    </TD>
                    <TD align="right">
                      <Link
                        href={`/app/calendario/${t.id}`}
                        className="inline-flex items-center gap-1 text-xs font-semibold text-brand-700 hover:underline"
                      >
                        {can(ctx, "attendance.record") ? "Tomar asistencia →" : "Ver detalle →"}
                      </Link>
                    </TD>
                  </TR>
                );
              })}
            </TBody>
          </Table>
        )}
      </Card>
    </div>
  );
}
