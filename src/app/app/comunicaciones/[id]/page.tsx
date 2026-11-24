import { notFound } from "next/navigation";
import { PageHeader, NoAccess, Flash, Alert } from "@/components/ui/page";
import { Card, CardBody, CardHeader, DefinitionList } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { SubmitButton } from "@/components/ui/submit";
import { Icon } from "@/components/ui/icon";
import { formatDateTime } from "@/lib/format";
import { can, getTenant } from "@/server/tenant";
import { getAnnouncement } from "@/server/data/comms";
import { sendAnnouncementAction } from "@/app/actions/comms";

export const metadata = { title: "Detalle de comunicación" };

function audienceLabel(audience: string, categoryName?: string | null, gender?: string | null): string {
  switch (audience) {
    case "all":
      return "Toda la comunidad del club";
    case "coaches":
      return "Solo entrenadores";
    case "families":
      return "Solo familias / tutores";
    case "players":
      return "Solo jugadores";
    case "category":
      return categoryName
        ? `Categoría ${categoryName} (${gender === "male" ? "Masculino" : "Femenino"})`
        : "Categoría específica";
    default:
      return audience;
  }
}

export default async function AnnouncementDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ ok?: string; error?: string }>;
}) {
  const ctx = await getTenant();
  if (!can(ctx, "comms.view")) return <NoAccess />;

  const { id } = await params;
  const { ok, error } = await searchParams;

  const announcement = await getAnnouncement(ctx, id);
  if (!announcement) notFound();

  const isDraft = announcement.status === "draft";
  const canSend = can(ctx, "comms.send");

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <PageHeader
        title={announcement.title}
        description="Ficha del comunicado institucional y estado de entrega."
        backHref="/app/comunicaciones"
        backLabel="Comunicaciones"
        actions={
          <Badge tone={isDraft ? "warning" : "success"}>
            {isDraft ? "Borrador pendiente de envío" : "Enviado"}
          </Badge>
        }
      />

      <Flash ok={ok} error={error} />

      {isDraft ? (
        <Alert tone="info">
          Este comunicado está guardado como <strong>borrador</strong>. No ha sido entregado a los destinatarios todavía. Podés enviarlo cuando estés listo.
        </Alert>
      ) : (
        <Alert tone="success">
          Comunicado emitido el <strong>{formatDateTime(announcement.sentAt)}</strong> a{" "}
          <strong>{announcement.recipientCount}</strong> destinatario(s).
        </Alert>
      )}

      <Card>
        <CardHeader
          title="Contenido del mensaje"
          description={`Creado por ${announcement.authorName || "Staff"} · ${formatDateTime(announcement.createdAt)}`}
        />
        <CardBody className="space-y-6">
          <div className="rounded-xl border border-ink-100 bg-ink-50/50 p-5">
            <h3 className="mb-2 text-base font-bold text-ink-900">{announcement.title}</h3>
            <p className="whitespace-pre-wrap text-sm leading-relaxed text-ink-800">
              {announcement.body}
            </p>
          </div>

          <DefinitionList
            items={[
              {
                label: "Audiencia",
                value: audienceLabel(
                  announcement.audience,
                  announcement.categoryName,
                  announcement.categoryGender,
                ),
              },
              {
                label: "Canal",
                value: (
                  <span className="inline-flex items-center gap-1.5 font-medium text-ink-800">
                    {announcement.channel === "whatsapp" ? (
                      <>
                        <Icon name="phone" size={14} /> WhatsApp
                      </>
                    ) : (
                      <>
                        <Icon name="bell" size={14} /> Bandeja interna (In-App)
                      </>
                    )}
                  </span>
                ),
              },
              {
                label: "Estado",
                value: (
                  <Badge tone={isDraft ? "warning" : "success"}>
                    {isDraft ? "Borrador" : "Enviado"}
                  </Badge>
                ),
              },
              {
                label: "Destinatarios notificados",
                value: (
                  <span className="font-semibold text-ink-900">
                    {announcement.recipientCount} usuarios
                  </span>
                ),
              },
              {
                label: "Fecha de creación",
                value: formatDateTime(announcement.createdAt),
              },
              ...(announcement.sentAt
                ? [
                    {
                      label: "Fecha de emisión",
                      value: formatDateTime(announcement.sentAt),
                    },
                  ]
                : []),
            ]}
          />

          {isDraft && canSend ? (
            <div className="border-t border-ink-100 pt-5">
              <form action={sendAnnouncementAction} className="flex items-center justify-between">
                <input type="hidden" name="announcementId" value={announcement.id} />
                <p className="text-xs text-ink-500">
                  Al enviar, se generará una notificación interna en la bandeja de cada miembro de la audiencia seleccionada.
                </p>
                <SubmitButton variant="primary">
                  <Icon name="megaphone" size={15} /> Enviar ahora
                </SubmitButton>
              </form>
            </div>
          ) : null}
        </CardBody>
      </Card>
    </div>
  );
}
