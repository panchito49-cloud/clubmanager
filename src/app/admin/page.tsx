import Link from "next/link";
import { PageHeader } from "@/components/ui/page";
import { Card, CardHeader, StatCard } from "@/components/ui/card";
import { Table, THead, TBody, TR, TH, TD } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { ButtonLink } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { formatDateTime, formatMoney } from "@/lib/format";
import { getPlatformMetrics, listAllClubs } from "@/server/data/admin";

export const metadata = { title: "Superadmin - Resumen de Plataforma" };

export default async function AdminDashboardPage() {
  const [metrics, clubsList] = await Promise.all([
    getPlatformMetrics(),
    listAllClubs(),
  ]);

  return (
    <div className="space-y-8">
      <PageHeader
        title="Plataforma Nuestro Club"
        description="Panel de control maestro para supervisión de clubes, planes comerciales y métricas globales."
        actions={
          <ButtonLink href="/admin/clubes/nuevo" size="sm">
            <Icon name="plus" size={15} /> Alta de nuevo club
          </ButtonLink>
        }
      />

      {/* MÉTRICAS GLOBALES */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Clubes activos"
          value={metrics.activeClubs}
          hint={`${metrics.totalClubs} instituciones registradas`}
          icon={<Icon name="building" />}
        />
        <StatCard
          label="MRR de suscripciones"
          value={formatMoney(metrics.mrrCents)}
          hint="Ingreso mensual recurrente activo"
          icon={<Icon name="wallet" />}
        />
        <StatCard
          label="Usuarios en la plataforma"
          value={metrics.totalUsers}
          hint="Admins, entrenadores y familias"
          icon={<Icon name="users" />}
        />
        <StatCard
          label="Deportistas gestionados"
          value={metrics.activePlayers}
          hint={`${metrics.totalPlayers} jugadores totales`}
          icon={<Icon name="trophy" />}
        />
      </div>

      {/* LISTADO DE CLUBES REGISTRADOS */}
      <Card>
        <CardHeader
          title="Clubes en la Plataforma"
          description="Instituciones activas y en período de prueba."
          action={
            <ButtonLink href="/admin/clubes" variant="ghost" size="sm">
              Ver todos ({clubsList.length}) →
            </ButtonLink>
          }
        />
        <Table minWidth="min-w-[750px]">
          <THead>
            <TR>
              <TH>Club e Identificador</TH>
              <TH>Ubicación</TH>
              <TH>Plan SaaS</TH>
              <TH align="center">Jugadores</TH>
              <TH align="center">Admins</TH>
              <TH>Estado</TH>
              <TH>Alta</TH>
            </TR>
          </THead>
          <TBody>
            {clubsList.map((c) => (
              <TR key={c.id}>
                <TD>
                  <div className="font-semibold text-ink-900">{c.name}</div>
                  <div className="text-xs text-ink-400 font-mono">slug: {c.slug}</div>
                </TD>
                <TD className="text-xs text-ink-600">
                  {c.city ? `${c.city}, ${c.province || ""}` : "Argentina"}
                </TD>
                <TD>
                  <span className="font-medium text-ink-900">{c.planName || "Personalizado"}</span>
                  <div className="text-xs text-ink-500">
                    {c.planPriceCents ? formatMoney(c.planPriceCents) : "$ 0,00"} / mes
                  </div>
                </TD>
                <TD align="center" className="font-semibold text-ink-800">
                  {c.playerCount}
                </TD>
                <TD align="center" className="text-ink-600">
                  {c.adminCount}
                </TD>
                <TD>
                  <Badge
                    tone={
                      c.status === "active"
                        ? "success"
                        : c.status === "trial"
                          ? "warning"
                          : "danger"
                    }
                  >
                    {c.status === "active"
                      ? "Activo"
                      : c.status === "trial"
                        ? "En prueba"
                        : "Suspendido"}
                  </Badge>
                </TD>
                <TD className="text-xs text-ink-500">
                  {formatDateTime(c.createdAt, { withTime: false })}
                </TD>
              </TR>
            ))}
          </TBody>
        </Table>
      </Card>
    </div>
  );
}
