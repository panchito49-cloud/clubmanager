import { notFound } from "next/navigation";
import { and, eq } from "drizzle-orm";
import { db } from "@/db/client";
import { feePlans } from "@/db/schema";
import { PageHeader, NoAccess } from "@/components/ui/page";
import { Card, CardBody } from "@/components/ui/card";
import { ActionForm } from "@/components/ui/action-form";
import { Field, Input, Select, InlineFields, Checkbox } from "@/components/ui/form";
import { centsToInput } from "@/lib/format";
import { updateFeePlanAction } from "@/app/actions/finance";
import { can, getTenant } from "@/server/tenant";
import { listCategories } from "@/server/data/people";

export const metadata = { title: "Editar plan de cuota" };

export default async function EditFeePlanPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const ctx = await getTenant();
  if (!can(ctx, "fees.manage")) return <NoAccess />;

  const { id } = await params;
  const [plan, categories] = await Promise.all([
    db
      .select()
      .from(feePlans)
      .where(and(eq(feePlans.id, id), eq(feePlans.clubId, ctx.club.id)))
      .limit(1)
      .then((rows) => rows[0]),
    listCategories(ctx),
  ]);

  if (!plan) notFound();

  return (
    <div className="mx-auto max-w-2xl">
      <PageHeader
        title={`Editar ${plan.name}`}
        description="Los cambios se aplican a las próximas liquidaciones, no a cuotas ya generadas."
        backHref="/app/cuotas/planes"
        backLabel="Planes de cuota"
      />
      <Card>
        <CardBody>
          <ActionForm
            action={updateFeePlanAction.bind(null, plan.id)}
            submitLabel="Guardar cambios"
            cancelHref="/app/cuotas/planes"
          >
            <Field label="Nombre" htmlFor="name" required>
              <Input id="name" name="name" defaultValue={plan.name} required />
            </Field>
            <Field label="Concepto" htmlFor="concept" required>
              <Input id="concept" name="concept" defaultValue={plan.concept} required />
            </Field>
            <Field label="Importe" htmlFor="amount" required>
              <Input
                id="amount"
                name="amount"
                inputMode="decimal"
                defaultValue={centsToInput(plan.amountCents)}
                required
              />
            </Field>
            <InlineFields>
              <Field label="Categoría" htmlFor="categoryId">
                <Select id="categoryId" name="categoryId" defaultValue={plan.categoryId ?? ""}>
                  <option value="">General</option>
                  {categories.map((category) => (
                    <option key={category.id} value={category.id}>
                      {category.name}
                    </option>
                  ))}
                </Select>
              </Field>
              <Field label="Día de vencimiento" htmlFor="dueDay" required>
                <Input
                  id="dueDay"
                  name="dueDay"
                  type="number"
                  min={1}
                  max={31}
                  defaultValue={plan.dueDay}
                  required
                />
              </Field>
            </InlineFields>
            <Checkbox
              name="isActive"
              label="Plan activo (se usa al liquidar cuotas)"
              defaultChecked={plan.isActive}
            />
          </ActionForm>
        </CardBody>
      </Card>
    </div>
  );
}
