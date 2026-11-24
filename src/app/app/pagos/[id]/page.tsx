import Link from "next/link";
import { notFound } from "next/navigation";
import { PageHeader, NoAccess, Alert } from "@/components/ui/page";
import { Card, CardHeader, CardBody, DefinitionList } from "@/components/ui/card";
import { StatusBadge } from "@/components/ui/badge";
import { Table, THead, TBody, TR, TH, TD } from "@/components/ui/table";
import { ActionForm } from "@/components/ui/action-form";
import { FormSubmitButton } from "@/components/ui/submit";
import { Field, Textarea } from "@/components/ui/form";
import { formatDate, formatDateTime, formatMoney } from "@/lib/format";
import { paymentMethodLabel, paymentStatusMeta } from "@/lib/status";
import {
  approvePaymentAction,
  markUnderReviewAction,
  rejectPaymentAction,
} from "@/app/actions/finance";
import { can, getTenant } from "@/server/tenant";
import { getPayment } from "@/server/data/finance";

export default async function PaymentDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const ctx = await getTenant();
  if (!can(ctx, "fees.view")) return <NoAccess />;

  const { id } = await params;
  const data = await getPayment(ctx, id);
  if (!data) notFound();

  const { payment, applications } = data;
  const canReview = can(ctx, "payments.review");
  const isPending = payment.status === "declared" || payment.status === "under_review";

  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader
        title="Detalle del pago"
        description={`${payment.familyName ?? "Sin familia"} · ${formatDateTime(payment.createdAt)}`}
        backHref="/app/pagos"
        backLabel="Pagos"
        actions={<StatusBadge meta={paymentStatusMeta[payment.status]} />}
      />

      <div className="grid gap-3 sm:grid-cols-2">
        <Card>
          <CardHeader title="Pago" />
          <CardBody>
            <DefinitionList
              columns={1}
              items={[
                { label: "Importe", value: <span className="money">{formatMoney(payment.amountCents)}</span> },
                { label: "Medio", value: paymentMethodLabel[payment.method] },
                { label: "Número de operación", value: payment.reference },
                { label: "Pagador", value: payment.payerName },
                {
                  label: "Familia",
                  value: payment.familyId ? (
                    <Link
                      href={`/app/familias/${payment.familyId}`}
                      className="text-brand-700 hover:underline"
                    >
                      {payment.familyName}
                    </Link>
                  ) : null,
                },
                { label: "Declarado por", value: payment.declaredByName },
                { label: "Notas", value: payment.notes },
                ...(payment.creditCents > 0
                  ? [
                      {
                        label: "Saldo a favor",
                        value: (
                          <span className="money text-amber-700">
                            {formatMoney(payment.creditCents)}
                          </span>
                        ),
                      },
                    ]
                  : []),
              ]}
            />
          </CardBody>
        </Card>

        <Card>
          <CardHeader title="Revisión" />
          <CardBody>
            <DefinitionList
              columns={1}
              items={[
                {
                  label: "Estado",
                  value: <StatusBadge meta={paymentStatusMeta[payment.status]} />,
                },
                { label: "Revisado por", value: payment.reviewedByName },
                {
                  label: "Fecha de revisión",
                  value: payment.reviewedAt ? formatDateTime(payment.reviewedAt) : null,
                },
                { label: "Motivo de rechazo", value: payment.rejectionReason },
              ]}
            />
          </CardBody>
        </Card>
      </div>

      {payment.status === "approved" ? (
        <Card className="mt-3 overflow-hidden">
          <CardHeader
            title="Imputación"
            description={`${applications.length} cuota(s) afectadas · Total imputado ${formatMoney(
              applications.reduce((sum, application) => sum + application.amountCents, 0),
            )}`}
          />
          {applications.length === 0 ? (
            <p className="px-5 py-8 text-center text-sm text-ink-400">
              Este pago no tiene imputaciones registradas.
            </p>
          ) : (
            <Table minWidth="min-w-[520px]">
              <THead>
                <TR>
                  <TH>Cuota</TH>
                  <TH>Período</TH>
                  <TH>Vencimiento</TH>
                  <TH align="right">Imputado</TH>
                </TR>
              </THead>
              <TBody>
                {applications.map((application) => (
                  <TR key={application.id}>
                    <TD className="text-sm">{application.concept}</TD>
                    <TD className="text-xs">{application.period}</TD>
                    <TD className="text-xs">{formatDate(application.dueDate)}</TD>
                    <TD align="right" className="money text-xs font-medium">
                      {formatMoney(application.amountCents)}
                    </TD>
                  </TR>
                ))}
              </TBody>
            </Table>
          )}
        </Card>
      ) : null}

      {canReview && isPending ? (
        <div className="mt-3 space-y-3">
          <Card>
            <CardHeader
              title="Aprobar pago"
              description="Se imputa a las cuotas impagas más antiguas de la familia."
            />
            <CardBody>
              <ActionForm
                action={approvePaymentAction.bind(null, payment.id)}
                submitLabel="Aprobar e imputar"
                footerClassName="border-none pt-0"
              >
                <Alert tone="info">
                  Antes de aprobar, verificá que el comprobante coincida con el
                  importe y el número de operación. La deuda se cancela recién al
                  aprobar.
                </Alert>
              </ActionForm>
              {payment.status === "declared" ? (
                <form action={markUnderReviewAction} className="mt-2">
                  <input type="hidden" name="paymentId" value={payment.id} />
                  <FormSubmitButton variant="ghost" size="sm">
                    Marcar en revisión
                  </FormSubmitButton>
                </form>
              ) : null}
            </CardBody>
          </Card>

          <Card>
            <CardHeader
              title="Rechazar pago"
              description="La deuda de la familia no se modifica al rechazar."
            />
            <CardBody>
              <ActionForm
                action={rejectPaymentAction.bind(null, payment.id)}
                submitLabel="Rechazar pago"
                submitVariant="danger"
                footerClassName="border-none pt-0"
              >
                <Field label="Motivo del rechazo" htmlFor="reason" required>
                  <Textarea
                    id="reason"
                    name="reason"
                    rows={2}
                    required
                    placeholder="Ej: el comprobante no coincide con el importe declarado."
                  />
                </Field>
              </ActionForm>
            </CardBody>
          </Card>
        </div>
      ) : null}

      {payment.status === "rejected" ? (
        <div className="mt-3">
          <Alert tone="danger" title="Pago rechazado">
            {payment.rejectionReason ?? "Sin motivo registrado."} La familia debe
            declarar el pago nuevamente si corresponde.
          </Alert>
        </div>
      ) : null}
    </div>
  );
}
