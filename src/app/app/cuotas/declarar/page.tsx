import { PageHeader, NoAccess, Alert } from "@/components/ui/page";
import { Card, CardHeader, CardBody } from "@/components/ui/card";
import { ActionForm } from "@/components/ui/action-form";
import { Field, Input, Select, Textarea, InlineFields } from "@/components/ui/form";
import { Table, THead, TBody, TR, TH, TD } from "@/components/ui/table";
import { formatDate, formatMoney } from "@/lib/format";
import { declarePaymentAction } from "@/app/actions/finance";
import { can, getTenant } from "@/server/tenant";
import { familiesForDeclaration, pendingChargesFor } from "@/server/data/finance";

export const metadata = { title: "Declarar pago" };

export default async function DeclarePaymentPage({
  searchParams,
}: {
  searchParams: Promise<{ familia?: string }>;
}) {
  const ctx = await getTenant();
  if (!can(ctx, "payments.declare")) return <NoAccess />;

  const params = await searchParams;
  const families = await familiesForDeclaration(ctx);
  const selectedFamilyId =
    ctx.role === "guardian"
      ? (ctx.familyIds[0] ?? "")
      : (params.familia ?? families[0]?.id ?? "");

  const pending = selectedFamilyId
    ? await pendingChargesFor(ctx, selectedFamilyId)
    : [];
  const totalPending = pending.reduce((sum, charge) => sum + charge.balanceCents, 0);

  if (families.length === 0) {
    return (
      <div className="mx-auto max-w-2xl">
        <PageHeader title="Declarar pago" backHref="/app/cuotas" backLabel="Cuotas" />
        <Alert tone="warning" title="No hay una familia asociada">
          Tu usuario no está vinculado a una familia del club. Pedile al
          administrador que asocie tu cuenta a la ficha familiar.
        </Alert>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl">
      <PageHeader
        title="Declarar un pago"
        description="Informá una transferencia o pago realizado. El club lo revisa antes de imputarlo."
        backHref="/app/cuotas"
        backLabel="Cuotas"
      />

      <div className="space-y-4">
        <Card>
          <CardBody>
            <ActionForm
              action={declarePaymentAction}
              submitLabel="Declarar pago"
              cancelHref="/app/cuotas"
            >
              {ctx.role === "guardian" ? (
                <input type="hidden" name="familyId" value={selectedFamilyId} />
              ) : null}

              <InlineFields>
                {ctx.role !== "guardian" ? (
                  <Field label="Familia" htmlFor="familyId" required>
                    <Select id="familyId" name="familyId" defaultValue={selectedFamilyId} required>
                      {families.map((family) => (
                        <option key={family.id} value={family.id}>
                          {family.name}
                        </option>
                      ))}
                    </Select>
                  </Field>
                ) : null}

                <Field label="Importe transferido" htmlFor="amount" required hint="En pesos. Ej: 35.000,00">
                  <Input
                    id="amount"
                    name="amount"
                    inputMode="decimal"
                    placeholder="35.000,00"
                    required
                  />
                </Field>

                <Field label="Medio de pago" htmlFor="method" required>
                  <Select id="method" name="method" defaultValue="transfer">
                    <option value="transfer">Transferencia</option>
                    <option value="cash">Efectivo</option>
                    <option value="mercadopago">Mercado Pago</option>
                    <option value="other">Otro</option>
                  </Select>
                </Field>

                <Field
                  label="Número de operación"
                  htmlFor="reference"
                  hint="Ayuda a evitar pagos duplicados. Copialo del comprobante."
                >
                  <Input id="reference" name="reference" maxLength={80} />
                </Field>

                <Field label="Nombre del pagador" htmlFor="payerName">
                  <Input id="payerName" name="payerName" maxLength={120} />
                </Field>
              </InlineFields>

              <Field label="Notas" htmlFor="notes">
                <Textarea
                  id="notes"
                  name="notes"
                  rows={2}
                  maxLength={500}
                  placeholder="Ej: pago de cuotas de octubre y noviembre"
                />
              </Field>

              <Alert tone="info" title="Qué pasa después">
                El pago queda en estado <strong>declarado</strong>. La deuda no
                se cancela: el club lo revisa y, al aprobarlo, se imputa
                automáticamente a las cuotas más antiguas.
              </Alert>
            </ActionForm>
          </CardBody>
        </Card>

        <Card className="overflow-hidden">
          <CardHeader
            title="Cuotas pendientes"
            description={
              totalPending > 0
                ? `Saldo pendiente de la familia: ${formatMoney(totalPending)}`
                : "Sin cuotas pendientes."
            }
          />
          {pending.length === 0 ? (
            <p className="px-5 py-8 text-center text-sm text-ink-400">
              No hay cuotas pendientes para esta familia.
            </p>
          ) : (
            <Table minWidth="min-w-[560px]">
              <THead>
                <TR>
                  <TH>Jugador</TH>
                  <TH>Concepto</TH>
                  <TH>Vencimiento</TH>
                  <TH align="right">Saldo</TH>
                </TR>
              </THead>
              <TBody>
                {pending.map((charge) => (
                  <TR key={charge.id}>
                    <TD className="text-sm">{charge.playerName}</TD>
                    <TD className="text-xs">
                      {charge.concept}
                      <span className="block text-ink-400">{charge.period}</span>
                    </TD>
                    <TD className="text-xs">{formatDate(charge.dueDate)}</TD>
                    <TD align="right" className="money text-xs font-medium">
                      {formatMoney(charge.balanceCents)}
                    </TD>
                  </TR>
                ))}
              </TBody>
            </Table>
          )}
        </Card>

        {ctx.role !== "guardian" && families.length > 1 ? (
          <form method="get" className="flex items-end gap-2">
            <Field label="Ver cuotas de otra familia" htmlFor="familia" className="flex-1">
              <Select id="familia" name="familia" defaultValue={selectedFamilyId}>
                {families.map((family) => (
                  <option key={family.id} value={family.id}>
                    {family.name}
                  </option>
                ))}
              </Select>
            </Field>
            <button
              type="submit"
              className="h-9 rounded-lg bg-ink-900 px-3 text-sm font-medium text-white hover:bg-ink-800"
            >
              Ver
            </button>
          </form>
        ) : null}
      </div>
    </div>
  );
}
