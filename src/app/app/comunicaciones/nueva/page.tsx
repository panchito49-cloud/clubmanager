import { PageHeader, NoAccess } from "@/components/ui/page";
import { Card, CardBody } from "@/components/ui/card";
import { can, getTenant } from "@/server/tenant";
import { listCategories } from "@/server/data/people";
import { AnnouncementComposer } from "@/components/comms/announcement-composer";

export const metadata = { title: "Nueva Comunicación" };

export default async function NewAnnouncementPage() {
  const ctx = await getTenant();
  if (!can(ctx, "comms.send")) return <NoAccess />;

  const categories = await listCategories(ctx);

  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <PageHeader
        title="Redactar Comunicado Institucional"
        description="Seleccioná una plantilla rápida, segmentá por categoría y prepará el envío por WhatsApp."
        backHref="/app/comunicaciones"
        backLabel="Comunicaciones"
      />

      <Card>
        <CardBody>
          <AnnouncementComposer categories={categories} />
        </CardBody>
      </Card>
    </div>
  );
}
