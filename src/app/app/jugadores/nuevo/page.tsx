import { PageHeader, NoAccess } from "@/components/ui/page";
import { Card, CardBody } from "@/components/ui/card";
import { ActionForm } from "@/components/ui/action-form";
import { PlayerFormFields } from "@/components/app/player-form";
import { createPlayerAction } from "@/app/actions/people";
import { can, getTenant } from "@/server/tenant";
import { familyOptions, listCategories } from "@/server/data/people";

export const metadata = { title: "Nuevo jugador" };

export default async function NewPlayerPage({
  searchParams,
}: {
  searchParams: Promise<{ familia?: string }>;
}) {
  const ctx = await getTenant();
  if (!can(ctx, "players.manage")) return <NoAccess />;

  const [categories, families, params] = await Promise.all([
    listCategories(ctx),
    familyOptions(ctx),
    searchParams,
  ]);

  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader
        title="Nuevo jugador"
        description="Cargá la ficha básica. Después podés completar cobertura médica y contactos."
        backHref="/app/jugadores"
        backLabel="Jugadores"
      />

      <Card>
        <CardBody>
          <ActionForm
            action={createPlayerAction}
            submitLabel="Guardar jugador"
            cancelHref="/app/jugadores"
          >
            <PlayerFormFields
              categories={categories}
              families={families}
              defaults={params.familia ? { familyId: params.familia } : undefined}
              showMedical
            />
          </ActionForm>
        </CardBody>
      </Card>
    </div>
  );
}
