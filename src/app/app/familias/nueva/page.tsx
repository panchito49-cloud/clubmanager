import { PageHeader, NoAccess } from "@/components/ui/page";
import { Card, CardBody } from "@/components/ui/card";
import { ActionForm } from "@/components/ui/action-form";
import { FamilyFormFields } from "@/components/app/family-form";
import { createFamilyAction } from "@/app/actions/people";
import { can, getTenant } from "@/server/tenant";

export const metadata = { title: "Nueva familia" };

export default async function NewFamilyPage() {
  const ctx = await getTenant();
  if (!can(ctx, "families.manage")) return <NoAccess />;

  return (
    <div className="mx-auto max-w-2xl">
      <PageHeader
        title="Nueva familia"
        description="Agrupá a los hermanos y definí el contacto principal."
        backHref="/app/familias"
        backLabel="Familias"
      />
      <Card>
        <CardBody>
          <ActionForm
            action={createFamilyAction}
            submitLabel="Crear familia"
            cancelHref="/app/familias"
          >
            <FamilyFormFields />
          </ActionForm>
        </CardBody>
      </Card>
    </div>
  );
}
