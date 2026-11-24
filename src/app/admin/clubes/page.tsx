import { PageHeader, Flash } from "@/components/ui/page";
import { Card } from "@/components/ui/card";
import { Table, THead, TBody, TR, TH, TD } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { ButtonLink } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { formatDateTime, formatMoney } from "@/lib/format";
import { listAllClubs } from "@/server/data/admin";
import { updateClubStatusAction } from "@/app/actions/admin";

export const metadata = { title: "Superadmin - Gestión de Clubes" };

export default async function AdminClubsPage({
  searchParams,
}: {
  searchParams: Promise<{ ok?: string; error?: string }>;
}) {
  const { ok, error } = await searchParams;
  const clubs = await listAllClubs();

  return (
    <div className="space-y-6">
      <PageHeader
        title="Gestión de Clubes"
        description="Instituciones adheridas al SaaS, asignación de planes y estado de servicios."
        actions={
          <ButtonLink href="/admin/clubes/nuevo" size="sm">
            <Icon name="plus" size={15} /> Dar de alta nuevo club
          </ButtonLink>
        }
      />

      <Flash ok={ok} error={error} />

      <Card className="overflow-hidden">
        <Table minWidth="min-w-[800px]">
          <THead>
            <TR>
              <TH>Club</TH>
              <TH>Ubicación</TH>
              <TH>Plan Asignado</TH>
              <TH align="center">Jugadores</TH>
              <TH align="center">Admins</TH>
              <TH>Estado</TH>
              <TH>Fecha de alta</TH>
              <TH align="right">Acciones</TH>
            </TR>
          </THead>
          <TBody>
            {clubs.map((c) => (
              <TR key={c.id}>
                <TD>
                  <div className="font-semibold text-ink-900">{c.name}</div>
                  <div className="text-xs text-ink-400 font-mono">slug: {c.slug}</div>
                </TD>
                <TD className="text-xs text-ink-600">
                  {c.city ? `${c.city}, ${c.province || ""}` : "Argentina"}
                </TD>
                <TD>
                  <span className="font-semibold text-ink-900">{c.planName || "Personalizado"}</span>
                  <div className="text-xs text-ink-500">
                    {c.planPriceCents ? formatMoney(c.planPriceCents) : "$ 0,00"} / mes
                  </div>
                </TD>
                <TD align="center" className="font-bold text-ink-800">
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
                <TD align="right">
                  <form action={updateClubStatusAction}>
                    <input type="hidden" name="clubId" value={c.id} />
                    <input
                      type="hidden"
                      name="targetStatus"
                      value={c.status === "active" ? "suspended" : "active"}
                    />
                    <button
                      type="submit"
                      className={`text-xs font-semibold ${
                        c.status === "active"
                          ? "text-red-600 hover:text-red-800"
                          : "text-emerald-600 hover:text-emerald-800"
                      } hover:underline`}
                    >
                      {c.status === "active" ? "Suspender acceso" : "Activar club"}
                    </button>
                  </form>
                </TD>
              </TR>
            ))}
          </TBody>
        </Table>
      </Card>
    </div>
  );
}
