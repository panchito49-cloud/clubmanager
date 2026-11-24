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
import { listAnnouncements } from "@/server/data/comms";

export const metadata = { title: "Comunicaciones" };

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
  const announcements = await listAnnouncements(ctx, { status: params.estado });

  return (
    <div className="space-y-6">
      <PageHeader
        title="Centro de Comunicaciones"
        description="Emisión de comunicados institucionales, avisos a familias y notificaciones internas."
        actions={
          can(ctx, "comms.send") ? (
            <ButtonLink href="/app/comunicaciones/nueva" size="sm">
              <Icon name="plus" size={15} /> Nueva comunicación
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
              name="estado"
              defaultValue={params.estado ?? ""}
              aria-label="Filtrar por estado"
              className="w-full sm:w-56"
            >
              <option value="">Todos los estados</option>
              <option value="draft">Borradores</option>
              <option value="sent">Enviados</option>
            </Select>
            <button
              type="submit"
              className="inline-flex h-9 items-center rounded-lg bg-ink-100 px-3 text-xs font-semibold text-ink-700 hover:bg-ink-200"
            >
              Filtrar
            </button>
          </div>
        </form>

        {announcements.length === 0 ? (
          <p className="px-5 py-12 text-center text-sm text-ink-400">
            No hay comunicaciones registradas todavía.
          </p>
        ) : (
          <Table minWidth="min-w-[650px]">
            <THead>
              <TR>
                <TH>Fecha</TH>
                <TH>Título</TH>
                <TH>Audiencia</TH>
                <TH>Canal</TH>
                <TH>Estado</TH>
                <TH align="center">Destinatarios</TH>
                <TH />
              </TR>
            </THead>
            <TBody>
              {announcements.map((a) => (
                <TR key={a.id}>
                  <TD className="whitespace-nowrap font-medium text-ink-900">
                    {formatDateTime(a.sentAt || a.createdAt)}
                  </TD>
                  <TD>
                    <span className="font-semibold text-ink-900">{a.title}</span>
                    <p className="line-clamp-1 max-w-xs text-xs text-ink-500">{a.body}</p>
                  </TD>
                  <TD>
                    <Badge tone="info">
                      {audienceLabel(a.audience, a.categoryName, a.categoryGender)}
                    </Badge>
                  </TD>
                  <TD>
                    <span className="inline-flex items-center gap-1 text-xs text-ink-700">
                      {a.channel === "whatsapp" ? (
                        <>
                          <Icon name="phone" size={13} /> WhatsApp
                        </>
                      ) : (
                        <>
                          <Icon name="bell" size={13} /> Bandeja interna
                        </>
                      )}
                    </span>
                  </TD>
                  <TD>
                    <Badge tone={a.status === "sent" ? "success" : "warning"}>
                      {a.status === "sent" ? "Enviado" : "Borrador"}
                    </Badge>
                  </TD>
                  <TD align="center">
                    <span className="inline-flex items-center gap-1 text-xs font-semibold text-ink-700">
                      <Icon name="users" size={13} /> {a.recipientCount}
                    </span>
                  </TD>
                  <TD align="right">
                    <Link
                      href={`/app/comunicaciones/${a.id}`}
                      className="inline-flex items-center gap-1 text-xs font-semibold text-brand-700 hover:underline"
                    >
                      Ver detalle →
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
