import { notFound } from "next/navigation";
import { and, eq, sql } from "drizzle-orm";
import { db } from "@/db/client";
import { categories, players } from "@/db/schema";
import { PageHeader, NoAccess, Alert } from "@/components/ui/page";
import { Card, CardBody } from "@/components/ui/card";
import { ActionForm } from "@/components/ui/action-form";
import { Field, Input, Select, InlineFields, Checkbox } from "@/components/ui/form";
import { FormSubmitButton } from "@/components/ui/submit";
import { updateCategoryAction, deleteCategoryAction } from "@/app/actions/people";
import { can, getTenant } from "@/server/tenant";

export const metadata = { title: "Editar categoría" };

export default async function EditCategoryPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const ctx = await getTenant();
  if (!can(ctx, "categories.manage")) return <NoAccess />;

  const { id } = await params;
  const [category] = await db
    .select()
    .from(categories)
    .where(and(eq(categories.id, id), eq(categories.clubId, ctx.club.id)))
    .limit(1);

  if (!category) notFound();

  const [usage] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(players)
    .where(and(eq(players.clubId, ctx.club.id), eq(players.categoryId, id)));

  const playerCount = Number(usage?.count ?? 0);

  return (
    <div className="mx-auto max-w-2xl">
      <PageHeader
        title={`Editar ${category.name}`}
        description={`${playerCount} jugador(es) asignados.`}
        backHref="/app/categorias"
        backLabel="Categorías"
      />

      <Card>
        <CardBody>
          <ActionForm
            action={updateCategoryAction.bind(null, category.id)}
            submitLabel="Guardar cambios"
            cancelHref="/app/categorias"
            footerClassName="justify-between"
          >
            <Field label="Nombre" htmlFor="name" required>
              <Input id="name" name="name" defaultValue={category.name} required />
            </Field>
            <InlineFields>
              <Field label="Año desde" htmlFor="birthYearFrom">
                <Input
                  id="birthYearFrom"
                  name="birthYearFrom"
                  type="number"
                  defaultValue={category.birthYearFrom ?? ""}
                />
              </Field>
              <Field label="Año hasta" htmlFor="birthYearTo">
                <Input
                  id="birthYearTo"
                  name="birthYearTo"
                  type="number"
                  defaultValue={category.birthYearTo ?? ""}
                />
              </Field>
              <Field label="Rama" htmlFor="gender">
                <Select id="gender" name="gender" defaultValue={category.gender}>
                  <option value="mixed">Mixto</option>
                  <option value="male">Masculino</option>
                  <option value="female">Femenino</option>
                </Select>
              </Field>
              <Field label="Orden" htmlFor="sortOrder">
                <Input
                  id="sortOrder"
                  name="sortOrder"
                  type="number"
                  defaultValue={category.sortOrder}
                />
              </Field>
            </InlineFields>
            <Checkbox
              name="isActive"
              label="Categoría activa (aparece en formularios y filtros)"
              defaultChecked={category.isActive}
            />
          </ActionForm>
        </CardBody>
      </Card>

      <div className="mt-4">
        <Alert tone="warning" title="Eliminar categoría">
          <div className="space-y-2">
            <p>
              Solo es posible eliminar categorías sin jugadores asignados. Si
              tiene jugadores, desactivala para conservar el historial.
            </p>
            <form action={deleteCategoryAction}>
              <input type="hidden" name="categoryId" value={category.id} />
              <FormSubmitButton
                variant="danger"
                size="sm"
                confirmMessage={`¿Eliminar la categoría "${category.name}"? Esta acción no se puede deshacer.`}
              >
                Eliminar categoría
              </FormSubmitButton>
            </form>
          </div>
        </Alert>
      </div>
    </div>
  );
}
