import Link from "next/link";
import { PageHeader, Pagination, NoAccess, Flash, Tabs } from "@/components/ui/page";
import { Card, StatCard } from "@/components/ui/card";
import { Table, THead, TBody, TR, TH, TD } from "@/components/ui/table";
import { StatusBadge } from "@/components/ui/badge";
import { ButtonLink } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { Input } from "@/components/ui/form";
import { formatDate, formatMoney } from "@/lib/format";
import { paymentMethodLabel, paymentStatusMeta } from "@/lib/status";
import { can, getTenant } from "@/server/tenant";
import { listPayments } from "@/server/data/finance";

export const metadata = { title: "Pagos" };

export default async function PaymentsPage({
  searchParams,
}: {
  searchParams: Promise<{ estado?: string; q?: string; page?: string; ok?: string }>;
}) {
  const ctx = await getTenant();
  if (!can(ctx, "fees.view")) return <NoAccess />;

  const params = await searchParams;
  const canReview = can(ctx, "payments.review");
  const canDeclare = can(ctx, "payments.declare");

  const result = await listPayments(ctx, {
    status: params.estado,
    q: params.q,
    page: Number(params.page ?? 1) || 1,
  });

  return (
    <div>
      <PageHeader
        title="Pagos"
        description="Pagos declarados por las familias y pagos revisados por el club."
        actions={
          canDeclare ? (
            <ButtonLink href="/app/cuotas/declarar" variant="secondary" size="sm">
              Declarar pago
            </ButtonLink>
          ) : null
        }
      />

      <Flash ok={params.ok} />

      <div className="grid gap-3 sm:grid-cols-3">
        <StatCard
          label="Pendientes de revisión"
          value={result.sums.countDeclared}
          hint={formatMoney(result.sums.declared)}
          accent={result.sums.countDeclared > 0 ? "warning" : "neutral"}
          icon={<Icon name="clock" />}
        />
        <StatCard
          label="Aprobados (acumulado)"
          value={formatMoney(result.sums.approved)}
          hint="Pagos imputados a cuotas"
          accent="success"
          icon={<Icon name="check" />}
        />
        <StatCard
          label="Pagos registrados"
          value={result.total}
          hint="Incluye todos los estados"
          icon={<Icon name="receipt" />}
        />
      </div>

      <div className="mt-6">
        <Tabs
          items={[
            {
              href: "/app/pagos?estado=declared",
              label: "Por revisar",
              active: params.estado === "declared" || params.estado === "under_review",
            },
            {
              href: "/app/pagos?estado=approved",
              label: "Aprobados",
              active: params.estado === "approved",
            },
            {
              href: "/app/pagos?estado=rejected",
              label: "Rechazados",
              active: params.estado === "rejected",
            },
            {
              href: "/app/pagos",
              label: "Todos",
              active: !params.estado,
            },
          ]}
        />
      </div>

      <Card className="overflow-hidden">
        <form method="get" className="flex gap-2 border-b border-ink-100 p-3 sm:p-4">
          <input type="hidden" name="estado" value={params.estado ?? ""} />
          <div className="relative flex-1">
            <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-400">
              <Icon name="search" size={16} />
            </span>
            <Input
              name="q"
              defaultValue={params.q ?? ""}
              placeholder="Buscar por familia, pagador o número de operación"
              className="pl-9"
              aria-label="Buscar pagos"
            />
          </div>
          <button
            type="submit"
            className="h-9 shrink-0 rounded-lg bg-ink-900 px-3 text-sm font-medium text-white hover:bg-ink-800"
          >
            Buscar
          </button>
        </form>

        {result.rows.length === 0 ? (
          <div className="px-6 py-14 text-center">
            <p className="text-sm font-semibold text-ink-800">No hay pagos</p>
            <p className="mt-1 text-sm text-ink-500">
              {params.estado === "declared"
                ? "No hay pagos esperando revisión."
                : "Los pagos declarados por las familias van a aparecer acá."}
            </p>
          </div>
        ) : (
          <>
            <Table minWidth="min-w-[880px]">
              <THead>
                <TR>
                  <TH>Fecha</TH>
                  <TH>Familia</TH>
                  <TH>Declaró</TH>
                  <TH>Medio</TH>
                  <TH>Operación</TH>
                  <TH align="right">Importe</TH>
                  <TH>Estado</TH>
                  <TH />
                </TR>
              </THead>
              <TBody>
                {result.rows.map((payment) => (
                  <TR key={payment.id}>
                    <TD className="whitespace-nowrap text-xs">
                      {formatDate(payment.createdAt)}
                    </TD>
                    <TD>
                      {payment.familyId ? (
                        <Link
                          href={`/app/familias/${payment.familyId}`}
                          className="font-medium text-ink-900 hover:text-brand-700"
                        >
                          {payment.familyName}
                        </Link>
                      ) : (
                        <span className="text-sm text-ink-500">—</span>
                      )}
                      {payment.payerName ? (
                        <span className="block text-xs text-ink-500">
                          Pagó: {payment.payerName}
                        </span>
                      ) : null}
                    </TD>
                    <TD className="text-xs text-ink-600">{payment.declaredBy ?? "—"}</TD>
                    <TD className="text-xs">{paymentMethodLabel[payment.method]}</TD>
                    <TD className="max-w-[160px] truncate text-xs">
                      {payment.reference ?? "—"}
                    </TD>
                    <TD align="right" className="money text-xs font-medium">
                      {formatMoney(payment.amountCents)}
                      {payment.creditCents > 0 ? (
                        <span className="block text-[10px] text-amber-600">
                          A favor: {formatMoney(payment.creditCents)}
                        </span>
                      ) : null}
                    </TD>
                    <TD>
                      <StatusBadge meta={paymentStatusMeta[payment.status]} />
                    </TD>
                    <TD align="right">
                      <Link
                        href={`/app/pagos/${payment.id}`}
                        className="text-xs font-medium text-brand-700 hover:underline"
                      >
                        {canReview &&
                        (payment.status === "declared" || payment.status === "under_review")
                          ? "Revisar →"
                          : "Ver →"}
                      </Link>
                    </TD>
                  </TR>
                ))}
              </TBody>
            </Table>
            <Pagination
              basePath="/app/pagos"
              params={{ estado: params.estado, q: params.q }}
              page={result.page}
              totalPages={result.totalPages}
              totalItems={result.total}
              pageSize={result.pageSize}
            />
          </>
        )}
      </Card>

      <p className="mt-3 text-xs text-ink-500">
        Aprobar un pago lo imputa a las cuotas impagas más antiguas de la
        familia. Rechazarlo no modifica la deuda.
      </p>
    </div>
  );
}
