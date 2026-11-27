import Link from "next/link";
import { PageHeader, NoAccess } from "@/components/ui/page";
import { Card, CardHeader, CardBody } from "@/components/ui/card";
import { ActionForm } from "@/components/ui/action-form";
import { Field, Input, Select, Textarea } from "@/components/ui/form";
import { FamilyPaymentSelector } from "@/components/app/family-payment-selector";
import { Icon } from "@/components/ui/icon";
import { formatDate, formatMoney } from "@/lib/format";
import { recordDirectPaymentAction } from "@/app/actions/finance";
import { can, getTenant } from "@/server/tenant";
import { familyOptions } from "@/server/data/people";
import { pendingChargesFor } from "@/server/data/finance";

export const metadata = { title: "Registrar Cobro en Caja" };

export default async function NewDirectPaymentPage({
  searchParams,
}: {
  searchParams: Promise<{ familia?: string; monto?: string }>;
}) {
  const ctx = await getTenant();
  if (!can(ctx, "payments.review")) return <NoAccess />;

  const params = await searchParams;
  const families = await familyOptions(ctx);

  const selectedFamilyId = params.familia || (families[0]?.id ?? "");
  const pendingCharges = selectedFamilyId
    ? await pendingChargesFor(ctx, selectedFamilyId)
    : [];

  const totalOutstanding = pendingCharges.reduce(
    (sum, ch) => sum + Math.max(0, ch.totalCents - ch.paidCents),
    0,
  );

  const defaultAmount = params.monto
    ? (Number(params.monto) / 100).toFixed(2)
    : totalOutstanding > 0
      ? (totalOutstanding / 100).toFixed(2)
      : "";

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <PageHeader
        title="Registrar Cobro en Caja"
        description="Ingresá los cobros recibidos en secretaría (efectivo, transferencia o posnet) para imputar automáticamente y emitir el recibo oficial."
        backHref="/app/pagos"
        backLabel="Pagos"
      />

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Formulario de Cobro Directo */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader
              title="Datos del Cobro"
              description="El cobro quedará aprobado e imputado a las obligaciones más antiguas de la familia."
            />
            <CardBody>
              <ActionForm
                action={recordDirectPaymentAction}
                submitLabel="Registrar cobro y emitir recibo"
                cancelHref="/app/pagos"
              >
                <div className="space-y-4">
                  {/* Selector de Familia */}
                  <Field label="Familia socia" htmlFor="familyId" required hint="Elegí la familia que abona">
                    <FamilyPaymentSelector
                      families={families}
                      selectedId={selectedFamilyId}
                    />
                  </Field>

                  <div className="grid gap-4 sm:grid-cols-2">
                    {/* Importe */}
                    <Field
                      label="Importe cobrado ($ ARS)"
                      htmlFor="amount"
                      required
                      hint={totalOutstanding > 0 ? `Deuda sugerida: ${formatMoney(totalOutstanding)}` : undefined}
                    >
                      <Input
                        id="amount"
                        name="amount"
                        type="text"
                        placeholder="Ej: 45000"
                        defaultValue={defaultAmount}
                        required
                        className="font-mono text-base font-medium"
                      />
                    </Field>

                    {/* Medio de Pago */}
                    <Field label="Medio de cobro" htmlFor="method" required>
                      <Select id="method" name="method" defaultValue="cash">
                        <option value="cash">Efectivo en caja / sede</option>
                        <option value="transfer">Transferencia bancaria directa (CBU / Alias)</option>
                        <option value="mercadopago">Mercado Pago / Tarjeta</option>
                        <option value="other">Otro medio</option>
                      </Select>
                    </Field>
                  </div>

                  <div className="grid gap-4 sm:grid-cols-2">
                    {/* Pagador */}
                    <Field label="Nombre de quien abona" htmlFor="payerName" hint="Tutor, padre o jugador">
                      <Input
                        id="payerName"
                        name="payerName"
                        placeholder="Ej: Marcelo García"
                      />
                    </Field>

                    {/* Referencia */}
                    <Field label="N° de Operación o Comprobante" htmlFor="reference" hint="Opcional (para transferencias)">
                      <Input
                        id="reference"
                        name="reference"
                        placeholder="Ej: 84920491"
                      />
                    </Field>
                  </div>

                  {/* Notas */}
                  <Field label="Observaciones internas" htmlFor="notes">
                    <Textarea
                      id="notes"
                      name="notes"
                      rows={2}
                      placeholder="Ej: Cobrado en secretaría cancha 1 por turno vespertino."
                    />
                  </Field>
                </div>
              </ActionForm>
            </CardBody>
          </Card>
        </div>

        {/* Resumen de cuotas de la familia seleccionada */}
        <div>
          <Card>
            <CardHeader
              title="Estado de Cuenta"
              description={`${pendingCharges.length} cuota(s) pendiente(s)`}
            />
            <CardBody className="space-y-4">
              <div className="rounded-lg bg-ink-50 p-3">
                <span className="block text-xs text-ink-500 font-medium">Total Adeudado</span>
                <span className="block text-2xl font-black text-brand-900 mt-0.5">
                  {formatMoney(totalOutstanding)}
                </span>
              </div>

              {pendingCharges.length === 0 ? (
                <div className="rounded border border-dashed border-ink-200 p-4 text-center text-xs text-ink-500">
                  La familia seleccionada no registra cuotas pendientes. Si ingresás un pago, quedará como saldo a favor para el próximo período.
                </div>
              ) : (
                <ul className="divide-y divide-ink-100 text-xs">
                  {pendingCharges.map((ch) => {
                    const balance = Math.max(0, ch.totalCents - ch.paidCents);
                    return (
                      <li key={ch.id} className="py-2.5 flex justify-between items-start gap-2">
                        <div>
                          <span className="font-semibold text-ink-900 block">{ch.concept}</span>
                          <span className="text-ink-500 block text-[11px]">
                            {ch.playerName} · {ch.period}
                          </span>
                          <span className="text-ink-400 block text-[10px]">
                            Vence: {formatDate(ch.dueDate)}
                          </span>
                        </div>
                        <div className="text-right shrink-0">
                          <span className="font-mono font-bold text-ink-900 block">
                            {formatMoney(balance)}
                          </span>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              )}

              <div className="rounded-lg bg-emerald-50 border border-emerald-200 p-3 text-[11px] text-emerald-800 space-y-1">
                <div className="flex items-center gap-1 font-semibold text-emerald-900">
                  <Icon name="check" size={13} /> Imputación Automática
                </div>
                <p>
                  El sistema imputa el dinero automáticamente a las cuotas más antiguas de la familia. Al finalizar, genera el Recibo Oficial con membrete de C.A. Estudiantes.
                </p>
              </div>
            </CardBody>
          </Card>
        </div>
      </div>
    </div>
  );
}
