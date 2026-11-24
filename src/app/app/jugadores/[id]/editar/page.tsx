import { notFound } from "next/navigation";
import { PageHeader, NoAccess } from "@/components/ui/page";
import { Card, CardBody } from "@/components/ui/card";
import { ActionForm } from "@/components/ui/action-form";
import { PlayerFormFields } from "@/components/app/player-form";
import { updatePlayerAction } from "@/app/actions/people";
import { can, getTenant } from "@/server/tenant";
import { familyOptions, listCategories } from "@/server/data/people";
import { db } from "@/db/client";
import { players } from "@/db/schema";
import { and, eq } from "drizzle-orm";

export const metadata = { title: "Editar jugador" };

export default async function EditPlayerPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const ctx = await getTenant();
  if (!can(ctx, "players.manage")) return <NoAccess />;

  const { id } = await params;

  const [categories, families, [player]] = await Promise.all([
    listCategories(ctx),
    familyOptions(ctx),
    db
      .select()
      .from(players)
      .where(and(eq(players.id, id), eq(players.clubId, ctx.club.id)))
      .limit(1),
  ]);

  if (!player) notFound();

  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader
        title={`Editar ${player.firstName} ${player.lastName}`}
        backHref={`/app/jugadores/${player.id}`}
        backLabel="Ficha del jugador"
      />

      <Card>
        <CardBody>
          <ActionForm
            action={updatePlayerAction.bind(null, player.id)}
            submitLabel="Guardar cambios"
            cancelHref={`/app/jugadores/${player.id}`}
          >
            <PlayerFormFields
              categories={categories}
              families={families}
              defaults={player}
              showMedical
            />
          </ActionForm>
        </CardBody>
      </Card>
    </div>
  );
}
