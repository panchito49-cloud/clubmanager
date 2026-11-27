import Link from "next/link";
import { PageHeader, NoAccess, Flash } from "@/components/ui/page";
import { Card } from "@/components/ui/card";
import { Table, THead, TBody, TR, TH, TD } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { ButtonLink } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { Select } from "@/components/ui/form";
import { formatDateTime } from "@/lib/format";
import { can, getTenant } from "@/server/tenant";
import { getCommsHubData } from "@/server/data/comms";

export const metadata = { title: "Centro de Comunicaciones" };

function audienceLabel(audience: string, categoryName?: string | null, gender?: string | null): string {
  switch (audience) {
    case "all":
      return "Toda la comunidad";
    case "coaches":
      return "Entrenadores";
    case "families":
      return "Familias / Tutores";
    case "players":
      return "Jugadores";
    case "category":
      return categoryName
        ? `${categoryName} (${gender === "male" ? "Masc" : "Fem"})`
        : "Categoría";
    default:
      return audience;
  }
}

export default async function CommsPage({
  searchParams,
}: {
  searchParams: Promise<{ estado?: string; ok?: string; error?: string }>;
}) {
  const ctx = await getTenant();
  if (!can(ctx, "comms.view")) return <NoAccess />;

  const params = await searchParams;
  const { announcements, stats } = await getCommsHubData(ctx, { status: params.estado });
  const canSend = can(ctx, "comms.send");

  return (
    <div className="space-y-6">
      <PageHeader
        title="Centro de Comunicados por WhatsApp"
        description="Emisión de convocatorias oficiales, recordatorios de apto médico y avisos institucionales masivos a familias."
        actions={
          canSend ? (
            <ButtonLink href="/app/comunicaciones/nueva" size="sm">
              <Icon name="plus" size={15} /> Redactar comunicado
            </ButtonLink>
          ) : null
        }
      />

      <Flash ok={params.ok} error={params.error} />

      {/* Métricas Globales de Comunicaciones */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="rounded-2xl border border-ink-200 bg-white p-4 shadow-sm">
          <p className="text-xs font-medium text-ink-500">Total Comunicados</p>
          <p className="mt-1 text-2xl font-black text-ink-900">{stats.totalCount}</p>
          <p className="mt-0.5 text-[11px] text-ink-400">Mensajes registrados</p>
        </div>

        <div className="rounded-2xl border border-emerald-200 bg-emerald-50/50 p-4 shadow-sm">
          <p className="text-xs font-medium text-emerald-800">Familias alcanzadas</p>
          <p className="mt-1 text-2xl font-black text-emerald-900">{stats.totalRecipientsReached}</p>
          <p className="mt-0.5 text-[11px] text-emerald-700">Notificaciones emitidas</p>
        </div>

        <div className="rounded-2xl border border-ink-200 bg-white p-4 shadow-sm">
          <p className="text-xs font-medium text-ink-500">Emitidos formalmente</p>
          <p className="mt-1 text-2xl font-black text-ink-900">{stats.sentCount}</p>
          <p className="mt-0.5 text-[11px] text-ink-400">Comunicaciones enviadas</p>
        </div>

        <div className="rounded-2xl border border-amber-200 bg-amber-50/50 p-4 shadow-sm">
          <p className="text-xs font-medium text-amber-800">Borradores en curso</p>
          <p className="mt-1 text-2xl font-black text-amber-900">{stats.draftCount}</p>
          <p className="mt-0.5 text-[11px] text-amber-700">Pendientes de difusión</p>
        </div>
      </div>

      {/* Atajos a Plantillas Rápidas */}
      {canSend && (
        <Card className="border-brand-200 bg-gradient-to-r from-brand-50/60 via-white to-brand-50/30 p-4 sm:p-5">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h3 className="text-sm font-bold text-brand-950 uppercase tracking-wide">
                Plantillas Oficiales de WhatsApp
              </h3>
              <p className="text-xs text-brand-800 mt-0.5">
                Redactá y enviá avisos en 15 segundos con los textos reglamentarios del club.
              </p>
            </div>

            <div className="flex flex-wrap gap-1.5">
              <Link
                href="/app/comunicaciones/nueva"
                className="inline-flex items-center gap-1 rounded-xl bg-white px-3 py-1.5 text-xs font-bold text-ink-800 border border-brand-200 shadow-2xs hover:bg-brand-50 transition"
              >
                🏀 Convocatoria Partido
              </Link>
              <Link
                href="/app/comunicaciones/nueva"
                className="inline-flex items-center gap-1 rounded-xl bg-white px-3 py-1.5 text-xs font-bold text-ink-800 border border-brand-200 shadow-2xs hover:bg-brand-50 transition"
              >
                🌧️ Suspensión por Lluvia
              </Link>
              <Link
                href="/app/comunicaciones/nueva"
                className="inline-flex items-center gap-1 rounded-xl bg-white px-3 py-1.5 text-xs font-bold text-ink-800 border border-brand-200 shadow-2xs hover:bg-brand-50 transition"
              >
                ⚠️ Apto Médico EMDAP
              </Link>
            </div>
          </div>
        </Card>
      )}

      {/* Lista de Comunicados */}
      <Card className="overflow-hidden">
        <form
          method="get"
          className="flex flex-col gap-2 border-b border-ink-100 p-3 sm:flex-row sm:items-center sm:p-4"
        >
          <div className="flex flex-1 items-center gap-2">
            <Select
              name="estado"
              defaultValue={params.estado ?? ""}
              aria-label="Filtrar por estado"
              className="w-full sm:w-56 text-xs"
            >
              <option value="">Todos los comunicados</option>
              <option value="draft">Borradores pendientes</option>
              <option value="sent">Emitidos formalmente</option>
            </Select>
            <button
              type="submit"
              className="inline-flex h-9 items-center rounded-xl bg-ink-900 px-3.5 text-xs font-semibold text-white hover:bg-ink-800"
            >
              Filtrar
            </button>
          </div>
        </form>

        {announcements.length === 0 ? (
          <p className="px-5 py-12 text-center text-xs text-ink-400">
            No hay comunicaciones registradas todavía. Hacé click en &quot;Redactar comunicado&quot; para crear la primera.
          </p>
        ) : (
          <Table minWidth="min-w-[650px]">
            <THead>
              <TR>
                <TH>Fecha</TH>
                <TH>Título del Comunicado</TH>
                <TH>Audiencia / Categoría</TH>
                <TH>Canal</TH>
                <TH>Estado</TH>
                <TH align="center">Alcance</TH>
                <TH />
              </TR>
            </THead>
            <TBody>
              {announcements.map((a) => (
                <TR key={a.id}>
                  <TD className="whitespace-nowrap font-medium text-ink-900 text-xs">
                    {formatDateTime(a.createdAt)}
                  </TD>
                  <TD>
                    <span className="font-bold text-ink-900 text-sm block">{a.title}</span>
                    <span className="text-xs text-ink-500 line-clamp-1 truncate max-w-sm">
                      {a.body}
                    </span>
                  </TD>
                  <TD>
                    <Badge tone="neutral">
                      {audienceLabel(a.audience, a.categoryName, a.categoryGender)}
                    </Badge>
                  </TD>
                  <TD>
                    <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-800">
                      <Icon name="phone" size={13} /> WhatsApp
                    </span>
                  </TD>
                  <TD>
                    <Badge tone={a.status === "sent" ? "success" : "warning"}>
                      {a.status === "sent" ? "Emitido" : "Borrador"}
                    </Badge>
                  </TD>
                  <TD align="center">
                    <span className="text-xs font-bold text-ink-800">
                      {a.recipientCount > 0 ? `${a.recipientCount} familias` : "Por emitir"}
                    </span>
                  </TD>
                  <TD align="right">
                    <Link
                      href={`/app/comunicaciones/${a.id}`}
                      className="inline-flex items-center gap-1 rounded-xl bg-ink-900 px-3 py-1.5 text-xs font-bold text-white shadow-2xs hover:bg-ink-800 transition"
                    >
                      📲 Ver y Difundir →
                    </Link>
                  </TD>
                </TR>
              ))}
            </TBody>
          </Table>
        )}
      </Card>
    </div>
  );
}
