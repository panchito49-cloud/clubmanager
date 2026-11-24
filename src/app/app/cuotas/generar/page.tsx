import Link from "next/link";
import { PageHeader, NoAccess, Alert } from "@/components/ui/page";
import { Card, CardHeader, CardBody } from "@/components/ui/card";
import { ActionForm } from "@/components/ui/action-form";
import { Field, Input } from "@/components/ui/form";
import { Table, THead, TBody, TR, TH, TD } from "@/components/ui/table";
import { ButtonLink } from "@/components/ui/button";
import { formatMoney, monthLabel } from "@/lib/format";
import { generateChargesAction } from "@/app/actions/finance";
import { can, getTenant } from "@/server/tenant";
import { listFeePlans } from "@/server/data/finance";
import { defaultPeriod } from "@/server/data/finance";

export const metadata = { title: "Liquidar mes" };

export default async function GenerateChargesPage() {
  const ctx = await getTenant();
  if (!can(ctx, "fees.manage")) return <NoAccess />;

  const plans = await listFeePlans(ctx);
  const activePlans = plans.filter((plan) => plan.isActive);
  const period = defaultPeriod();

  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader
        title="Liquidar cuotas del mes"
        description="Genera una cuota por jugador activo según el plan de su categoría."
        backHref="/app/cuotas"
        backLabel="Cuotas"
      />

      {activePlans.length === 0 ? (
        <div className="space-y-4">
          <Alert tone="warning" title="No hay planes de cuota activos">
            Antes de liquidar necesitás al menos un plan de cuota activo.
          </Alert>
          <ButtonLink href="/app/cuotas/planes">Crear plan de cuota</ButtonLink>
        </div>
      ) : (
        <div className="space-y-4">
          <Card>
            <CardHeader title="Período a liquidar" />
            <CardBody>
              <ActionForm
                action={generateChargesAction}
                submitLabel="Generar cuotas"
                cancelHref="/app/cuotas"
                footerClassName="border-none pt-1"
              >
                <Field
                  label="Mes y año"
                  htmlFor="period"
                  hint={`Período sugerido: ${monthLabel(period)}`}
                  required
                >
                  <Input
                    id="period"
                    name="period"
                    type="month"
                    defaultValue={period}
                    required
                  />
                </Field>
                <div className="rounded-lg bg-ink-50 p-3 text-xs leading-relaxed text-ink-600">
                  <p className="font-medium text-ink-700">Cómo se calcula</p>
                  <ul className="mt-1 list-disc space-y-1 pl-4">
                    <li>Se toma un plan por categoría; si no hay, el plan general.</li>
                    <li>Se aplican becas y descuentos individuales vigentes.</li>
                    <li>
                      Descuento por hermano:{" "}
                      <span className="font-medium">
                        {ctx.club.settings?.siblingDiscountPct ?? 0}%
                      </span>{" "}
                      desde el segundo hermano (el mayor paga cuota completa).
                    </li>
                    <li>
                      Si una cuota ya existe para ese jugador y período, no se
                      duplica.
                    </li>
                  </ul>
                </div>
              </ActionForm>
            </CardBody>
          </Card>

          <Card className="overflow-hidden">
            <CardHeader
              title="Planes que se van a aplicar"
              action={
                <Link href="/app/cuotas/planes" className="text-xs font-medium text-brand-700 hover:underline">
                  Administrar planes
                </Link>
              }
            />
            <Table minWidth="min-w-[480px]">
              <THead>
                <TR>
                  <TH>Plan</TH>
                  <TH>Categoría</TH>
                  <TH align="right">Importe</TH>
                  <TH align="center">Vence</TH>
                </TR>
              </THead>
              <TBody>
                {activePlans.map((plan) => (
                  <TR key={plan.id}>
                    <TD className="text-sm">
                      {plan.name}
                      <span className="block text-xs text-ink-400">{plan.concept}</span>
                    </TD>
                    <TD className="text-xs">
                      {plan.categoryName ?? (
                        <span className="text-ink-500">General (todas)</span>
                      )}
                    </TD>
                    <TD align="right" className="money text-xs">
                      {formatMoney(plan.amountCents)}
                    </TD>
                    <TD align="center" className="text-xs">
                      Día {plan.dueDay}
                    </TD>
                  </TR>
                ))}
              </TBody>
            </Table>
          </Card>

          <Alert tone="info" title="Liquidación idempotente">
            Podés generar el mismo período más de una vez: las cuotas ya creadas
            no se duplican y el sistema informa cuántas se generaron y cuántas ya
            existían.
          </Alert>
        </div>
      )}
    </div>
  );
}
