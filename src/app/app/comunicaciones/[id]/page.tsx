import { notFound } from "next/navigation";
import { PageHeader, NoAccess, Flash, Alert } from "@/components/ui/page";
import { Card, CardBody, CardHeader, DefinitionList } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Icon } from "@/components/ui/icon";
import { formatDateTime } from "@/lib/format";
import { can, getTenant } from "@/server/tenant";
import { getAnnouncementRecipients } from "@/server/data/comms";
import { WhatsAppBroadcaster } from "@/components/comms/whatsapp-broadcaster";

export const metadata = { title: "Detalle de Comunicación y Difusión" };

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

  let commsData;
  try {
    commsData = await getAnnouncementRecipients(ctx, id);
  } catch {
    notFound();
  }

  const { announcement, recipients, shareGroupWaUrl, fullMessageText } = commsData;
  if (!announcement) notFound();

  const isDraft = announcement.status === "draft";
  const canSend = can(ctx, "comms.send");

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <PageHeader
        title={announcement.title}
        description="Ficha del comunicado institucional y consola de difusión por WhatsApp."
        backHref="/app/comunicaciones"
        backLabel="Comunicaciones"
        actions={
          <div className="flex items-center gap-2">
            <Badge tone={announcement.channel === "whatsapp" ? "success" : "info"}>
              {announcement.channel === "whatsapp" ? "WhatsApp Oficial" : "In-App"}
            </Badge>
            <Badge tone={isDraft ? "warning" : "success"}>
              {isDraft ? "Borrador pendiente" : "Emitido"}
            </Badge>
          </div>
        }
      />

      <Flash ok={ok} error={error} />

      {isDraft ? (
        <Alert tone="info">
          Este comunicado está listo como <strong>borrador institucional</strong>. Podés compartirlo en el grupo de WhatsApp de la categoría o enviarlo 1-a-1 a cada familia desde el panel de abajo.
        </Alert>
      ) : (
        <Alert tone="success">
          Comunicado emitido formalmente el <strong>{formatDateTime(announcement.sentAt)}</strong> a{" "}
          <strong>{announcement.recipientCount}</strong> destinatario(s).
        </Alert>
      )}

      {/* Panel de Difusión de WhatsApp con vista previa y bandeja de destinatarios */}
      <WhatsAppBroadcaster
        announcementId={announcement.id}
        title={announcement.title}
        body={announcement.body}
        fullMessageText={fullMessageText}
        shareGroupWaUrl={shareGroupWaUrl}
        isDraft={isDraft}
        canSend={canSend}
        recipients={recipients}
      />

      {/* Ficha técnica del comunicado */}
      <Card>
        <CardHeader
          title="Ficha Técnica del Comunicado"
          description={`Emitido por ${announcement.authorName || "Secretaría del Club"} · Creado el ${formatDateTime(announcement.createdAt)}`}
        />
        <CardBody>
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
                    <Icon name="phone" size={14} /> WhatsApp Institucional + Notificación
                  </span>
                ),
              },
              {
                label: "Estado",
                value: (
                  <Badge tone={isDraft ? "warning" : "success"}>
                    {isDraft ? "Borrador listo" : "Emitido"}
                  </Badge>
                ),
              },
              {
                label: "Familias alcanzadas",
                value: (
                  <span className="font-semibold text-ink-900">
                    {recipients.length} destinatarios
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
        </CardBody>
      </Card>
    </div>
  );
}
