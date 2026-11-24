import Link from "next/link";
import { notFound } from "next/navigation";
import { PageHeader, NoAccess, Flash } from "@/components/ui/page";
import { Card, CardHeader, CardBody, DefinitionList } from "@/components/ui/card";
import { StatusBadge } from "@/components/ui/badge";
import { Table, THead, TBody, TR, TH, TD } from "@/components/ui/table";
import { ButtonLink } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { formatDate, formatMoney } from "@/lib/format";
import { chargeStatusMeta, playerStatusMeta } from "@/lib/status";
import { can, getTenant } from "@/server/tenant";
import { getFamily } from "@/server/data/people";

export default async function FamilyDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ ok?: string }>;
}) {
  const ctx = await getTenant();
  if (!can(ctx, "families.view")) return <NoAccess />;

  const { id } = await params;
  const { ok } = await searchParams;
  const data = await getFamily(ctx, id);
  if (!data) notFound();

  const { family } = data;
  const outstanding = data.charges.reduce(
    (sum, charge) => sum + Math.max(0, charge.totalCents - charge.paidCents),
    0,
  );

  return (
    <div>
      <PageHeader
        title={family.name}
        description={`Contacto: ${family.contactName} · ${family.contactPhone}`}
        backHref="/app/familias"
        backLabel="Familias"
        actions={
          can(ctx, "families.manage") ? (
            <ButtonLink
              href={`/app/familias/${family.id}/editar`}
              variant="secondary"
              size="sm"
            >
              <Icon name="edit" size={14} /> Editar
            </ButtonLink>
          ) : null
        }
      />

      <Flash ok={ok} />

      <div className="grid gap-3 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader
            title="Integrantes del club"
            action={
              can(ctx, "players.manage") ? (
                <Link
                  href={`/app/jugadores/nuevo?familia=${family.id}`}
                  className="text-xs font-medium text-brand-700 hover:underline"
                >
                  + Agregar jugador
                </Link>
              ) : null
            }
          />
          {data.players.length === 0 ? (
            <p className="px-5 py-8 text-center text-sm text-ink-400">
              La familia todavía no tiene jugadores asignados.
            </p>
          ) : (
            <ul className="divide-y divide-ink-100">
              {data.players.map((player) => (
                <li key={player.id}>
                  <Link
                    href={`/app/jugadores/${player.id}`}
                    className="flex items-center justify-between gap-3 px-4 py-3 hover:bg-ink-50 sm:px-5"
                  >
                    <span>
                      <span className="block text-sm font-medium text-ink-900">
                        {player.lastName}, {player.firstName}
                      </span>
                      <span className="block text-xs text-ink-500">
                        {player.categoryName ?? "Sin categoría"}
                        {player.birthDate ? ` · ${formatDate(player.birthDate)}` : ""}
                      </span>
                    </span>
                    <StatusBadge meta={playerStatusMeta[player.status]} />
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <div className="space-y-3">
          <Card>
            <CardHeader title="Contacto" />
            <CardBody>
              <DefinitionList
                columns={1}
                items={[
                  { label: "Contacto principal", value: family.contactName },
                  { label: "Teléfono", value: family.contactPhone },
                  { label: "Email", value: family.contactEmail },
                  { label: "Notas", value: family.notes },
                ]}
              />
            </CardBody>
          </Card>

          <Card>
            <CardHeader title="Saldo" />
            <CardBody>
              <p className="text-xs text-ink-500">Deuda pendiente</p>
              <p
                className={`money mt-1 text-2xl font-semibold ${
                  outstanding > 0 ? "text-rose-600" : "text-emerald-600"
                }`}
              >
                {formatMoney(outstanding)}
              </p>
              <p className="mt-1 text-xs text-ink-500">
                {outstanding > 0 ? "Incluye cuotas vencidas y del mes." : "Sin saldo pendiente."}
              </p>
            </CardBody>
          </Card>
        </div>
      </div>

      {data.members.length > 0 ? (
        <Card className="mt-3">
          <CardHeader title="Tutores y miembros de la familia" />
          <CardBody>
            <ul className="space-y-2">
              {data.members.map((member) => (
                <li
                  key={member.id}
                  className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-ink-50 px-3 py-2"
                >
                  <span className="text-sm text-ink-800">
                    {member.fullName}
                    <span className="ml-1.5 text-xs text-ink-500">
                      {member.relationship === "tutor" ? "Tutor" : member.relationship}
                    </span>
                  </span>
                  <span className="text-xs text-ink-500">{member.phone ?? "Sin teléfono"}</span>
                </li>
              ))}
            </ul>
          </CardBody>
        </Card>
      ) : null}

      <Card className="mt-3 overflow-hidden">
        <CardHeader title="Cuotas de la familia" />
        {data.charges.length === 0 ? (
          <p className="px-5 py-8 text-center text-sm text-ink-400">
            Sin cuotas generadas.
          </p>
        ) : (
          <Table minWidth="min-w-[640px]">
            <THead>
              <TR>
                <TH>Jugador</TH>
                <TH>Concepto</TH>
                <TH>Vencimiento</TH>
                <TH align="right">Total</TH>
                <TH align="right">Pagado</TH>
                <TH>Estado</TH>
              </TR>
            </THead>
            <TBody>
              {data.charges.map((charge) => (
                <TR key={charge.id}>
                  <TD className="text-sm">{charge.playerName}</TD>
                  <TD className="text-xs">
                    {charge.concept}
                    <span className="block text-ink-400">{charge.period}</span>
                  </TD>
                  <TD className="whitespace-nowrap text-xs">{formatDate(charge.dueDate)}</TD>
                  <TD align="right" className="money text-xs">
                    {formatMoney(charge.totalCents)}
                  </TD>
                  <TD align="right" className="money text-xs">
                    {formatMoney(charge.paidCents)}
                  </TD>
                  <TD>
                    <StatusBadge meta={chargeStatusMeta[charge.status]} />
                  </TD>
                </TR>
              ))}
            </TBody>
          </Table>
        )}
      </Card>
    </div>
  );
}
