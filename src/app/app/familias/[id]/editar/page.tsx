import { notFound } from "next/navigation";
import { and, eq } from "drizzle-orm";
import { db } from "@/db/client";
import { families } from "@/db/schema";
import { PageHeader, NoAccess } from "@/components/ui/page";
import { Card, CardBody } from "@/components/ui/card";
import { ActionForm } from "@/components/ui/action-form";
import { FamilyFormFields } from "@/components/app/family-form";
import { updateFamilyAction } from "@/app/actions/people";
import { can, getTenant } from "@/server/tenant";

export const metadata = { title: "Editar familia" };

export default async function EditFamilyPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const ctx = await getTenant();
  if (!can(ctx, "families.manage")) return <NoAccess />;

  const { id } = await params;
  const [family] = await db
    .select()
    .from(families)
    .where(and(eq(families.id, id), eq(families.clubId, ctx.club.id)))
    .limit(1);

  if (!family) notFound();

  return (
    <div className="mx-auto max-w-2xl">
      <PageHeader
        title={`Editar ${family.name}`}
        backHref={`/app/familias/${family.id}`}
        backLabel="Familia"
      />
      <Card>
        <CardBody>
          <ActionForm
            action={updateFamilyAction.bind(null, family.id)}
            submitLabel="Guardar cambios"
            cancelHref={`/app/familias/${family.id}`}
          >
            <FamilyFormFields defaults={family} />
          </ActionForm>
        </CardBody>
      </Card>
    </div>
  );
}
