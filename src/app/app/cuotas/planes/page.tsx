import Link from "next/link";
import { PageHeader, NoAccess } from "@/components/ui/page";
import { Card, CardHeader, CardBody } from "@/components/ui/card";
import { Table, THead, TBody, TR, TH, TD } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { ActionForm } from "@/components/ui/action-form";
import { Field, Input, Select, InlineFields } from "@/components/ui/form";
import { formatMoney } from "@/lib/format";
import { createFeePlanAction } from "@/app/actions/finance";
import { can, getTenant } from "@/server/tenant";
import { listFeePlans } from "@/server/data/finance";
import { listCategories } from "@/server/data/people";

export const metadata = { title: "Planes de cuota" };

export default async function FeePlansPage() {
  const ctx = await getTenant();
  if (!can(ctx, "fees.manage")) return <NoAccess />;

  const [plans, categories] = await Promise.all([listFeePlans(ctx), listCategories(ctx)]);

  return (
    <div>
      <PageHeader
        title="Planes de cuota"
        description="Definen el importe mensual por categoría o general, y el día de vencimiento."
        backHref="/app/cuotas"
        backLabel="Cuotas"
      />

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="overflow-hidden lg:col-span-2">
          <CardHeader title="Planes configurados" description={`${plans.length} plan(es)`} />
          {plans.length === 0 ? (
            <p className="px-5 py-10 text-center text-sm text-ink-400">
              Todavía no hay planes. Creá el primero con el formulario.
            </p>
          ) : (
            <Table minWidth="min-w-[560px]">
              <THead>
                <TR>
                  <TH>Plan</TH>
                  <TH>Categoría</TH>
                  <TH align="right">Importe</TH>
                  <TH align="center">Día de vencimiento</TH>
                  <TH>Estado</TH>
                  <TH />
                </TR>
              </THead>
              <TBody>
                {plans.map((plan) => (
                  <TR key={plan.id}>
                    <TD className="text-sm">
                      <span className="font-medium text-ink-900">{plan.name}</span>
                      <span className="block text-xs text-ink-400">{plan.concept}</span>
                    </TD>
                    <TD className="text-xs">
                      {plan.categoryName ?? <span className="text-ink-500">General</span>}
                    </TD>
                    <TD align="right" className="money text-xs font-medium">
                      {formatMoney(plan.amountCents)}
                    </TD>
                    <TD align="center" className="text-xs">
                      Día {plan.dueDay}
                    </TD>
                    <TD>
                      {plan.isActive ? (
                        <Badge tone="success">Activo</Badge>
                      ) : (
                        <Badge tone="neutral">Inactivo</Badge>
                      )}
                    </TD>
                    <TD align="right">
                      <Link
                        href={`/app/cuotas/planes/${plan.id}`}
                        className="text-xs font-medium text-brand-700 hover:underline"
                      >
                        Editar →
                      </Link>
                    </TD>
                  </TR>
                ))}
              </TBody>
            </Table>
          )}
          <div className="border-t border-ink-100 px-5 py-3">
            <Link
              href="/app/cuotas/generar"
              className="text-xs font-medium text-brand-700 hover:underline"
            >
              Ir a liquidar el mes →
            </Link>
          </div>
        </Card>

        <Card>
          <CardHeader title="Nuevo plan" />
          <CardBody>
            <ActionForm
              action={createFeePlanAction}
              submitLabel="Crear plan"
              footerClassName="border-none pt-1"
            >
              <Field label="Nombre" htmlFor="name" required hint="Ej: Cuota U15">
                <Input id="name" name="name" required />
              </Field>
              <Field label="Concepto" htmlFor="concept" required>
                <Input id="concept" name="concept" defaultValue="Cuota mensual" required />
              </Field>
              <Field label="Importe" htmlFor="amount" required hint="En pesos. Ej: 35.000,00">
                <Input id="amount" name="amount" inputMode="decimal" placeholder="35.000,00" required />
              </Field>
              <InlineFields>
                <Field label="Categoría" htmlFor="categoryId" hint="Vacío = todas.">
                  <Select id="categoryId" name="categoryId" defaultValue="">
                    <option value="">General</option>
                    {categories.map((category) => (
                      <option key={category.id} value={category.id}>
                        {category.name}
                      </option>
                    ))}
                  </Select>
                </Field>
                <Field label="Día de vencimiento" htmlFor="dueDay" required>
                  <Input id="dueDay" name="dueDay" type="number" min={1} max={31} defaultValue={10} required />
                </Field>
              </InlineFields>
            </ActionForm>
          </CardBody>
        </Card>
      </div>
    </div>
  );
}
