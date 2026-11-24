import Link from "next/link";
import { PageHeader, Alert } from "@/components/ui/page";
import { Card, CardHeader, CardBody, StatCard, EmptyState } from "@/components/ui/card";
import { AreaChart, ProgressBar } from "@/components/ui/charts";
import { Badge } from "@/components/ui/badge";
import { Icon } from "@/components/ui/icon";
import { ButtonLink } from "@/components/ui/button";
import { formatMoney, formatDateTime, monthLabel } from "@/lib/format";
import { roleLabel } from "@/lib/permissions";
import { getTenant, can } from "@/server/tenant";
import {
  getCollectionTrend,
  getCounts,
  getFinanceSummary,
  getRecentAnnouncements,
  getTopDebtors,
  getUnreadNotifications,
  getUpcomingEvents,
} from "@/server/data/dashboard";

export const metadata = { title: "Panel" };

export default async function DashboardPage() {
  const ctx = await getTenant();
  const isStaff = ctx.role === "club_admin" || ctx.role === "coach";

  const [finance, counts, events, announcements, unread] = await Promise.all([
    getFinanceSummary(ctx),
    getCounts(ctx),
    getUpcomingEvents(ctx),
    getRecentAnnouncements(ctx),
    getUnreadNotifications(ctx),
  ]);

  const trend =
    ctx.role === "club_admin" ? await getCollectionTrend(ctx, 6) : [];
  const debtors =
    ctx.role === "club_admin" ? await getTopDebtors(ctx, 5) : [];

  const collectionRate =
    finance.billedCents > 0
      ? Math.round((finance.collectedCents / finance.billedCents) * 100)
      : 0;

  const hour = Number(
    new Intl.DateTimeFormat("en-US", {
      hour: "2-digit",
      hour12: false,
      timeZone: "America/Argentina/Buenos_Aires",
    }).format(new Date()),
  );
  const greeting = hour < 12 ? "Buen día" : hour < 20 ? "Buenas tardes" : "Buenas noches";
  const firstName = ctx.auth.user.fullName.split(" ")[0];

  return (
    <div>
      <PageHeader
        title={`${greeting}, ${firstName}`}
        description={`${ctx.club.name} · ${roleLabel(ctx.role)} · ${monthLabel(finance.period)}`}
        actions={
          can(ctx, "fees.manage") ? (
            <>
              <ButtonLink href="/app/cuotas/generar" variant="secondary" size="sm">
                Generar cuotas
              </ButtonLink>
              <ButtonLink href="/app/pagos" size="sm">
                Ver pagos
              </ButtonLink>
            </>
          ) : can(ctx, "payments.declare") ? (
            <ButtonLink href="/app/cuotas" size="sm">
              Ver mis cuotas
            </ButtonLink>
          ) : null
        }
      />

      {ctx.role === "club_admin" && finance.declaredCount > 0 ? (
        <div className="mb-5">
          <Alert tone="warning" title="Pagos esperando revisión">
            Hay {finance.declaredCount} pago(s) declarados por{" "}
            {formatMoney(finance.declaredCents)} pendientes de aprobación.{" "}
            <Link href="/app/pagos?estado=declared" className="font-medium underline underline-offset-2">
              Revisar ahora
            </Link>
          </Alert>
        </div>
      ) : null}

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {isStaff ? (
          <>
            <StatCard
              label="Jugadores activos"
              value={counts.activePlayers}
              hint={`${counts.players} fichas en total · ${counts.families} familias`}
              href="/app/jugadores"
              icon={<Icon name="users" />}
            />
            <StatCard
              label={`Cuotas de ${monthLabel(finance.period)}`}
              value={formatMoney(finance.billedCents)}
              hint={`Cobrado: ${formatMoney(finance.collectedCents)}`}
              href="/app/cuotas"
              accent="brand"
              icon={<Icon name="wallet" />}
            />
            <StatCard
              label="Deuda vencida"
              value={formatMoney(finance.overdueCents)}
              hint={`${finance.overdueCount} cuota(s) vencidas`}
              href="/app/cuotas?estado=overdue"
              accent={finance.overdueCents > 0 ? "danger" : "success"}
              icon={<Icon name="alert" />}
            />
            <StatCard
              label="Pagos por revisar"
              value={finance.declaredCount}
              hint={formatMoney(finance.declaredCents)}
              href="/app/pagos?estado=declared"
              accent={finance.declaredCount > 0 ? "warning" : "neutral"}
              icon={<Icon name="receipt" />}
            />
          </>
        ) : (
          <>
            <StatCard
              label={`Cuotas de ${monthLabel(finance.period)}`}
              value={formatMoney(finance.billedCents)}
              hint={`Pagado: ${formatMoney(finance.collectedCents)}`}
              href="/app/cuotas"
              accent="brand"
              icon={<Icon name="wallet" />}
            />
            <StatCard
              label="Saldo del mes"
              value={formatMoney(finance.outstandingCents)}
              hint={finance.outstandingCents === 0 ? "Sin saldo pendiente" : "Pendiente de pago"}
              href="/app/cuotas"
              accent={finance.outstandingCents > 0 ? "warning" : "success"}
              icon={<Icon name="receipt" />}
            />
            <StatCard
              label="Deuda vencida"
              value={formatMoney(finance.overdueCents)}
              hint={`${finance.overdueCount} cuota(s)`}
              href="/app/cuotas?estado=overdue"
              accent={finance.overdueCents > 0 ? "danger" : "success"}
              icon={<Icon name="alert" />}
            />
            <StatCard
              label="Pagos declarados"
              value={finance.declaredCount}
              hint="Esperando validación del club"
              accent={finance.declaredCount > 0 ? "warning" : "neutral"}
              icon={<Icon name="clock" />}
            />
          </>
        )}
      </div>

      {isStaff ? (
        <div className="mt-3 grid gap-3 lg:grid-cols-3">
          <Card className="lg:col-span-2">
            <CardHeader
              title="Cobranza de los últimos meses"
              description="Importe facturado contra importe cobrado por período."
              action={
                <span className="text-xs font-medium text-ink-500">
                  {collectionRate}% de cobranza este mes
                </span>
              }
            />
            <CardBody>
              <AreaChart
                points={trend.map((point) => ({
                  label: monthLabel(point.period).split(" ")[0].slice(0, 3),
                  value: point.collected,
                }))}
                formatValue={(value) => formatMoney(value)}
              />
              <div className="mt-4">
                <ProgressBar
                  value={finance.collectedCents}
                  max={finance.billedCents}
                  label="Avance de cobranza del mes"
                  tone={collectionRate >= 70 ? "success" : collectionRate >= 40 ? "warning" : "danger"}
                />
              </div>
            </CardBody>
          </Card>

          <Card>
            <CardHeader
              title="Familias con deuda"
              description="Cuotas vencidas acumuladas."
              action={
                <Link href="/app/cuotas?estado=overdue" className="text-xs font-medium text-brand-700 hover:underline">
                  Ver todas
                </Link>
              }
            />
            {debtors.length === 0 ? (
              <EmptyState
                title="Sin deudas vencidas"
                description="Todas las cuotas están al día."
                icon={<Icon name="check" />}
              />
            ) : (
              <ul className="divide-y divide-ink-100">
                {debtors.map((debtor) => (
                  <li key={debtor.familyId}>
                    <Link
                      href={`/app/familias/${debtor.familyId}`}
                      className="flex items-center justify-between gap-3 px-4 py-2.5 hover:bg-ink-50 sm:px-5"
                    >
                      <span className="min-w-0">
                        <span className="block truncate text-sm font-medium text-ink-800">
                          {debtor.familyName}
                        </span>
                        <span className="block text-xs text-ink-500">
                          {debtor.chargeCount} cuota(s) vencida(s)
                        </span>
                      </span>
                      <span className="money shrink-0 text-sm font-semibold text-rose-600">
                        {formatMoney(debtor.amountCents)}
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </div>
      ) : null}

      <div className="mt-3 grid gap-3 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader
            title="Próximos eventos"
            description="Entrenamientos y partidos programados."
            action={
              <Link href="/app/calendario" className="text-xs font-medium text-brand-700 hover:underline">
                Ver calendario
              </Link>
            }
          />
          {events.length === 0 ? (
            <EmptyState
              title="No hay eventos programados"
              description="Cuando se carguen entrenamientos o partidos van a aparecer acá."
              icon={<Icon name="calendar" />}
            />
          ) : (
            <ul className="divide-y divide-ink-100">
              {events.map((event) => (
                <li key={event.id} className="flex items-center gap-3 px-4 py-3 sm:px-5">
                  <span
                    className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${
                      event.kind === "match"
                        ? "bg-amber-50 text-amber-700"
                        : "bg-brand-50 text-brand-700"
                    }`}
                  >
                    <Icon name={event.kind === "match" ? "trophy" : "calendar"} size={17} />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-ink-800">{event.title}</p>
                    <p className="truncate text-xs text-ink-500">
                      {event.categoryName} · {formatDateTime(event.startsAt)}
                      {event.location ? ` · ${event.location}` : ""}
                    </p>
                  </div>
                  <Badge tone={event.kind === "match" ? "warning" : "info"}>
                    {event.kind === "match" ? "Partido" : "Entreno"}
                  </Badge>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card>
          <CardHeader
            title="Novedades"
            action={
              <Link href="/app/notificaciones" className="text-xs font-medium text-brand-700 hover:underline">
                Notificaciones
              </Link>
            }
          />
          {announcements.length === 0 && unread.length === 0 ? (
            <EmptyState
              title="Sin novedades"
              description="Las comunicaciones del club van a aparecer acá."
              icon={<Icon name="megaphone" />}
            />
          ) : (
            <ul className="divide-y divide-ink-100">
              {unread.map((item) => (
                <li key={item.id} className="px-4 py-3 sm:px-5">
                  <p className="text-sm font-medium text-ink-800">{item.title}</p>
                  {item.body ? (
                    <p className="mt-0.5 line-clamp-2 text-xs text-ink-500">{item.body}</p>
                  ) : null}
                </li>
              ))}
              {announcements.map((item) => (
                <li key={item.id} className="px-4 py-3 sm:px-5">
                  <p className="text-sm font-medium text-ink-800">{item.title}</p>
                  <p className="mt-0.5 line-clamp-2 text-xs text-ink-500">{item.body}</p>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    </div>
  );
}
