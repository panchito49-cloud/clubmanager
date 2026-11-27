import Link from "next/link";
import { PageHeader, Pagination, NoAccess, Flash, Tabs } from "@/components/ui/page";
import { Card, StatCard } from "@/components/ui/card";
import { Table, THead, TBody, TR, TH, TD } from "@/components/ui/table";
import { StatusBadge } from "@/components/ui/badge";
import { ButtonLink } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { Input, Select } from "@/components/ui/form";
import { FormSubmitButton } from "@/components/ui/submit";
import { formatDate, formatMoney, monthLabel, todayISO } from "@/lib/format";
import { chargeStatusMeta } from "@/lib/status";
import { voidChargeAction } from "@/app/actions/finance";
import { can, getTenant } from "@/server/tenant";
import { PayButton } from "@/components/payments/pay-button";
import {
  chargesOverview,
  defaultPeriod,
  listCharges,
  listCriticalOverdueCases,
  listPeriods,
} from "@/server/data/finance";
import { listCategories } from "@/server/data/people";

export const metadata = { title: "Cuotas" };

export default async function ChargesPage({
  searchParams,
}: {
  searchParams: Promise<{
    periodo?: string;
    estado?: string;
    categoria?: string;
    q?: string;
    page?: string;
    ok?: string;
  }>;
}) {
  const ctx = await getTenant();
  if (!can(ctx, "fees.view")) return <NoAccess />;

  const params = await searchParams;
  const period = params.periodo || defaultPeriod();

  const [periods, categories, result, overview, criticalCases] = await Promise.all([
    listPeriods(ctx),
    listCategories(ctx),
    listCharges(ctx, {
      period,
      status: params.estado,
      categoryId: params.categoria,
      q: params.q,
      page: Number(params.page ?? 1) || 1,
    }),
    chargesOverview(ctx, period),
    listCriticalOverdueCases(ctx, 90),
  ]);

  const today = todayISO();
  const canManage = can(ctx, "fees.manage");
  const canDeclare = can(ctx, "payments.declare");

  return (
    <div>
      <PageHeader
        title="Cuotas"
        description={`Obligaciones de pago del club · ${monthLabel(period)}`}
        actions={
          <div className="flex flex-wrap items-center gap-2">
            {canDeclare ? (
              <ButtonLink href="/app/cuotas/declarar" variant="secondary" size="sm">
                Declarar pago
              </ButtonLink>
            ) : null}
            {canManage || can(ctx, "payments.review") ? (
              <ButtonLink href="/app/pagos/nuevo" variant="primary" size="sm">
                <Icon name="plus" size={15} /> Cobrar en caja
              </ButtonLink>
            ) : null}
            {canManage ? (
              <>
                <ButtonLink href="/app/cuotas/planes" variant="secondary" size="sm">
                  Planes de cuota
                </ButtonLink>
                <ButtonLink href="/app/cuotas/generar" variant="secondary" size="sm">
                  Liquidar mes
                </ButtonLink>
              </>
            ) : null}
          </div>
        }
      />

      <Flash ok={params.ok} />

      <div className="grid gap-3 sm:grid-cols-3">
        <StatCard
          label="Facturado del período"
          value={formatMoney(overview.billed)}
          hint={`${overview.count} cuota(s) generadas`}
          accent="brand"
        />
        <StatCard
          label="Cobrado"
          value={formatMoney(overview.paid)}
          hint={
            overview.billed > 0
              ? `${Math.round((overview.paid / overview.billed) * 100)}% de cobranza`
              : "Sin cuotas"
          }
          accent="success"
        />
        <StatCard
          label="Pendiente"
          value={formatMoney(Math.max(0, overview.billed - overview.paid))}
          hint={`${overview.overdueCount} cuota(s) vencidas`}
          accent={overview.overdueCount > 0 ? "danger" : "neutral"}
        />
      </div>

      {criticalCases.length > 0 ? (
        <div className="mt-4 rounded-xl border border-amber-300 bg-amber-50/90 p-4 shadow-xs">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div className="flex items-start gap-3">
              <span className="rounded-full bg-amber-200 p-2 text-amber-900 shrink-0 mt-0.5">
                <Icon name="alert" size={18} />
              </span>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-bold text-amber-950">
                    Detección Inteligente: Casos con Mora Crítica (+90 días)
                  </h3>
                  <span className="rounded bg-amber-200 px-2 py-0.5 text-[11px] font-bold text-amber-900">
                    {criticalCases.length} familia(s)
                  </span>
                </div>
                <p className="text-xs text-amber-900/90 mt-1">
                  Se detectaron deudas de más de 90 días ({criticalCases.map((c) => `${c.familyName} [${c.maxDaysOverdue}d de atraso]`).join(", ")}).
                  Podés formalizar un <strong>Plan de Facilidades de Pago</strong> en cuotas mensuales para asegurar la continuidad deportiva de los jugadores.
                </p>
              </div>
            </div>
            <Link
              href={`/app/cuotas/refinanciar?familia=${criticalCases[0]?.familyId}`}
              className="inline-flex items-center gap-1.5 rounded-lg bg-amber-900 px-3 py-2 text-xs font-bold text-white shadow-xs hover:bg-amber-950 transition shrink-0"
            >
              🤝 Armar Plan de Pagos en Cuotas
            </Link>
          </div>
        </div>
      ) : null}

      <div className="mt-6">
        <Tabs
          items={[
            {
              href: `/app/cuotas?periodo=${period}&estado=pending`,
              label: "Pendientes",
              active: params.estado === "pending",
            },
            {
              href: `/app/cuotas?periodo=${period}&estado=overdue`,
              label: "Vencidas",
              active: params.estado === "overdue",
            },
            {
              href: `/app/cuotas?periodo=${period}&estado=paid`,
              label: "Pagadas",
              active: params.estado === "paid",
            },
            {
              href: `/app/cuotas?periodo=${period}`,
              label: "Todas",
              active: !params.estado,
            },
          ]}
        />
      </div>

      <Card className="overflow-hidden">
        <form
          method="get"
          className="flex flex-col gap-2 border-b border-ink-100 p-3 sm:flex-row sm:items-center sm:p-4"
        >
          <input type="hidden" name="estado" value={params.estado ?? ""} />
          <div className="flex flex-1 gap-2">
            <Select
              name="periodo"
              defaultValue={period}
              aria-label="Período"
              className="w-40"
            >
              {periods.length === 0 ? <option value={period}>{period}</option> : null}
              {!periods.includes(period) ? <option value={period}>{period}</option> : null}
              {periods.map((item) => (
                <option key={item} value={item}>
                  {monthLabel(item)}
                </option>
              ))}
            </Select>
            <Select
              name="categoria"
              defaultValue={params.categoria ?? ""}
              aria-label="Categoría"
              className="w-40"
            >
              <option value="">Todas las categorías</option>
              {categories.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.name}
                </option>
              ))}
            </Select>
            <div className="relative flex-1">
              <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-400">
                <Icon name="search" size={16} />
              </span>
              <Input
                name="q"
                defaultValue={params.q ?? ""}
                placeholder="Buscar jugador o familia"
                className="pl-9"
                aria-label="Buscar"
              />
            </div>
          </div>
          <button
            type="submit"
            className="h-9 shrink-0 rounded-lg bg-ink-900 px-3 text-sm font-medium text-white hover:bg-ink-800"
          >
            Aplicar
          </button>
        </form>

        {result.rows.length === 0 ? (
          <div className="px-6 py-14 text-center">
            <p className="text-sm font-semibold text-ink-800">
              No hay cuotas para este filtro
            </p>
            <p className="mt-1 text-sm text-ink-500">
              {canManage
                ? "Si todavía no liquidaste el mes, generá las cuotas desde “Liquidar mes”."
                : "Cuando el club genere las cuotas del período van a aparecer acá."}
            </p>
            {canManage ? (
              <ButtonLink href="/app/cuotas/generar" className="mt-4" size="sm">
                Liquidar mes
              </ButtonLink>
            ) : null}
          </div>
        ) : (
          <>
            <Table minWidth="min-w-[880px]">
              <THead>
                <TR>
                  <TH>Jugador</TH>
                  <TH>Concepto</TH>
                  <TH>Vencimiento</TH>
                  <TH align="right">Total</TH>
                  <TH align="right">Pagado</TH>
                  <TH align="right">Saldo</TH>
                  <TH>Estado</TH>
                  <TH align="right">Acciones</TH>
                </TR>
              </THead>
              <TBody>
                {result.rows.map((charge) => {
                  const balance = Math.max(0, charge.totalCents - charge.paidCents);
                  const overdue =
                    charge.dueDate < today &&
                    (charge.status === "pending" || charge.status === "partial");
                  const daysOverdue = overdue
                    ? Math.max(
                        0,
                        Math.floor(
                          (new Date(today).getTime() - new Date(charge.dueDate).getTime()) /
                            (1000 * 60 * 60 * 24),
                        ),
                      )
                    : 0;
                  const isCritical = daysOverdue >= 90;

                  return (
                    <TR key={charge.id}>
                      <TD>
                        {charge.playerId ? (
                          <Link
                            href={`/app/jugadores/${charge.playerId}`}
                            className="font-medium text-ink-900 hover:text-brand-700"
                          >
                            {charge.playerName}
                          </Link>
                        ) : (
                          <span className="text-sm text-ink-500">—</span>
                        )}
                        {charge.familyId ? (
                          <Link
                            href={`/app/familias/${charge.familyId}`}
                            className="block text-xs text-ink-500 hover:text-brand-700"
                          >
                            {charge.familyName}
                          </Link>
                        ) : null}
                      </TD>
                      <TD className="text-xs">
                        {charge.concept}
                        <span className="block text-ink-400">{charge.period}</span>
                      </TD>
                      <TD className={`whitespace-nowrap text-xs ${overdue ? "font-medium text-rose-600" : ""}`}>
                        {formatDate(charge.dueDate)}
                        {isCritical ? (
                          <span className="block text-[10px] font-bold text-rose-800">
                            mora {daysOverdue}d (+90d)
                          </span>
                        ) : overdue ? (
                          <span className="block text-[10px]">vencida</span>
                        ) : null}
                      </TD>
                      <TD align="right" className="money text-xs">
                        {formatMoney(charge.totalCents)}
                        {charge.discountCents > 0 ? (
                          <span className="block text-[10px] text-emerald-600">
                            -{formatMoney(charge.discountCents)}
                          </span>
                        ) : null}
                      </TD>
                      <TD align="right" className="money text-xs">
                        {formatMoney(charge.paidCents)}
                      </TD>
                      <TD align="right" className="money text-xs font-medium">
                        {formatMoney(balance)}
                      </TD>
                      <TD>
                        {overdue ? (
                          <StatusBadge meta={chargeStatusMeta.overdue} />
                        ) : (
                          <StatusBadge meta={chargeStatusMeta[charge.status]} />
                        )}
                      </TD>
                      <TD align="right" className="space-x-1 whitespace-nowrap">
                        {isCritical && canManage && charge.familyId && balance > 0 ? (
                          <Link
                            href={`/app/cuotas/refinanciar?familia=${charge.familyId}`}
                            className="inline-flex items-center gap-1 rounded-lg bg-amber-700 px-2 py-1 text-xs font-semibold text-white hover:bg-amber-800 transition shadow-2xs"
                            title="Armar plan de pago en cuotas"
                          >
                            🤝 Refinanciar
                          </Link>
                        ) : null}
                        {balance > 0 && charge.status !== "void" && (canManage || can(ctx, "payments.review")) ? (
                          <Link
                            href={`/app/pagos/nuevo?familia=${charge.familyId ?? ""}&monto=${balance}`}
                            className="inline-flex items-center gap-1 rounded-lg bg-emerald-600 px-2 py-1 text-xs font-medium text-white hover:bg-emerald-700 transition"
                            title="Cobrar en caja (efectivo/transferencia)"
                          >
                            <Icon name="check" size={12} /> Cobrar
                          </Link>
                        ) : null}
                        {balance > 0 && charge.status !== "void" ? (
                          <PayButton
                            clubId={ctx.club.id}
                            chargeId={charge.id}
                            amountCents={balance}
                            description={`${charge.concept} - ${charge.period}`}
                          />
                        ) : null}
                        {canManage && charge.paidCents === 0 && charge.status !== "void" ? (
                          <form action={voidChargeAction} className="inline-block">
                            <input type="hidden" name="chargeId" value={charge.id} />
                            <input type="hidden" name="reason" value="Anulada por administración" />
                            <FormSubmitButton
                              variant="ghost"
                              size="sm"
                              confirmMessage="¿Anular esta cuota? Dejará de contar como deuda."
                            >
                              Anular
                            </FormSubmitButton>
                          </form>
                        ) : null}
                      </TD>
                    </TR>
                  );
                })}
              </TBody>
            </Table>
            <Pagination
              basePath="/app/cuotas"
              params={{
                periodo: period,
                estado: params.estado,
                categoria: params.categoria,
                q: params.q,
              }}
              page={result.page}
              totalPages={result.totalPages}
              totalItems={result.total}
              pageSize={result.pageSize}
            />
          </>
        )}
      </Card>

      <p className="mt-3 text-xs text-ink-500">
        El estado “vencida” se calcula con la fecha de vencimiento y el saldo. Un
        pago declarado no cancela la deuda hasta que la administración lo aprueba.
      </p>
    </div>
  );
}
