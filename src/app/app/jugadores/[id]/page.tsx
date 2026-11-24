import Link from "next/link";
import { notFound } from "next/navigation";
import { PageHeader, NoAccess, Flash, Alert } from "@/components/ui/page";
import { Card, CardHeader, CardBody, DefinitionList, StatCard } from "@/components/ui/card";
import { Badge, StatusBadge } from "@/components/ui/badge";
import { Table, THead, TBody, TR, TH, TD } from "@/components/ui/table";
import { ButtonLink } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { FormSubmitButton } from "@/components/ui/submit";
import { formatDate, formatDateTime, formatMoney, ageFrom } from "@/lib/format";
import { attendanceStatusMeta, callupStatusMeta, chargeStatusMeta, playerStatusMeta } from "@/lib/status";
import { togglePlayerStatusAction } from "@/app/actions/people";
import { can, getTenant } from "@/server/tenant";
import { getPlayer } from "@/server/data/people";

export default async function PlayerDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ ok?: string }>;
}) {
  const ctx = await getTenant();
  if (!can(ctx, "players.view")) return <NoAccess />;

  const { id } = await params;
  const { ok } = await searchParams;
  const data = await getPlayer(ctx, id);
  if (!data) notFound();

  const { player } = data;
  const debt = data.charges.reduce(
    (sum, charge) => sum + Math.max(0, charge.totalCents - charge.paidCents),
    0,
  );

  return (
    <div>
      <PageHeader
        title={`${player.lastName}, ${player.firstName}`}
        description={`${player.categoryName ?? "Sin categoría"}${
          player.dni ? ` · DNI ${player.dni}` : ""
        }${player.birthDate ? ` · ${ageFrom(player.birthDate)} años` : ""}`}
        backHref="/app/jugadores"
        backLabel="Jugadores"
        actions={
          <>
            <StatusBadge meta={playerStatusMeta[player.status]} />
            {can(ctx, "players.manage") ? (
              <>
                <ButtonLink
                  href={`/app/jugadores/${player.id}/editar`}
                  variant="secondary"
                  size="sm"
                >
                  <Icon name="edit" size={14} /> Editar
                </ButtonLink>
                <form action={togglePlayerStatusAction}>
                  <input type="hidden" name="playerId" value={player.id} />
                  <input
                    type="hidden"
                    name="status"
                    value={player.status === "active" ? "inactive" : "active"}
                  />
                  <FormSubmitButton
                    variant={player.status === "active" ? "ghost" : "primary"}
                    size="sm"
                    confirmMessage={
                      player.status === "active"
                        ? "¿Marcar al jugador como inactivo? No se borran sus datos ni su deuda."
                        : "¿Reactivar al jugador?"
                    }
                  >
                    {player.status === "active" ? "Marcar inactivo" : "Reactivar"}
                  </FormSubmitButton>
                </form>
              </>
            ) : null}
          </>
        }
      />

      <Flash ok={ok} />

      <div className="grid gap-3 sm:grid-cols-3">
        <StatCard
          label="Deuda pendiente"
          value={formatMoney(debt)}
          hint={`${data.charges.filter((c) => c.paidCents < c.totalCents).length} cuota(s) con saldo`}
          accent={debt > 0 ? "danger" : "success"}
          href="/app/cuotas"
        />
        <StatCard
          label="Asistencia reciente"
          value={data.attendanceRate !== null ? `${data.attendanceRate}%` : "—"}
          hint={`${data.attendance.length} registro(s)`}
          accent="brand"
        />
        <StatCard
          label="Convocatorias"
          value={data.callups.length}
          hint="Últimos partidos"
        />
      </div>

      <div className="mt-3 grid gap-3 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader title="Datos del jugador" />
          <CardBody>
            <DefinitionList
              columns={2}
              items={[
                { label: "Nombre completo", value: `${player.firstName} ${player.lastName}` },
                { label: "DNI", value: player.dni },
                { label: "Fecha de nacimiento", value: formatDate(player.birthDate) },
                {
                  label: "Género",
                  value:
                    player.gender === "male"
                      ? "Masculino"
                      : player.gender === "female"
                        ? "Femenino"
                        : player.gender === "other"
                          ? "Otro"
                          : null,
                },
                { label: "Categoría", value: player.categoryName },
                { label: "Dorsal", value: player.jerseyNumber },
                { label: "Posición", value: player.position },
                { label: "Colegio", value: player.school },
                { label: "Dirección", value: player.address },
                { label: "Localidad", value: player.city },
                { label: "Alta en el club", value: formatDate(player.joinedAt) },
                { label: "Contacto de emergencia", value: player.emergencyContactName },
                { label: "Teléfono de emergencia", value: player.emergencyContactPhone },
              ]}
            />
          </CardBody>
        </Card>

        <div className="space-y-3">
          <Card>
            <CardHeader title="Familia" />
            <CardBody className="space-y-2">
              {player.familyId ? (
                <>
                  <Link
                    href={`/app/familias/${player.familyId}`}
                    className="text-sm font-medium text-brand-700 hover:underline"
                  >
                    {player.familyName}
                  </Link>
                  <p className="text-xs text-ink-500">
                    {player.familyPhone ?? "Sin teléfono"}
                  </p>
                  {player.familyEmail ? (
                    <p className="text-xs text-ink-500">{player.familyEmail}</p>
                  ) : null}
                </>
              ) : (
                <p className="text-sm text-ink-500">Sin familia asignada.</p>
              )}
            </CardBody>
          </Card>

          <Card>
            <CardHeader title="Cobertura médica" />
            <CardBody>
              {data.hasMedicalAccess ? (
                <DefinitionList
                  columns={1}
                  items={[
                    { label: "Obra social", value: player.insuranceProvider },
                    { label: "N° de afiliado", value: player.insuranceNumber },
                    { label: "Grupo sanguíneo", value: player.bloodType },
                  ]}
                />
              ) : (
                <p className="text-xs text-ink-500">
                  La información médica solo está disponible para el staff del club.
                </p>
              )}
            </CardBody>
          </Card>
        </div>
      </div>

      {data.hasMedicalAccess && player.medicalNotes ? (
        <div className="mt-3">
          <Alert tone="warning" title="Notas médicas">
            {player.medicalNotes}
          </Alert>
        </div>
      ) : null}

      {data.discounts.length > 0 ? (
        <Card className="mt-3">
          <CardHeader
            title="Becas y descuentos"
            description="Se aplican al generar las cuotas."
          />
          <CardBody>
            <ul className="space-y-2">
              {data.discounts.map((discount) => (
                <li
                  key={discount.id}
                  className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-ink-50 px-3 py-2 text-sm"
                >
                  <span className="text-ink-700">
                    {discount.type === "percentage"
                      ? `${discount.value}% de descuento`
                      : `${formatMoney(discount.value)} de descuento`}
                    {discount.reason ? ` · ${discount.reason}` : ""}
                  </span>
                  <span className="text-xs text-ink-500">
                    Desde {formatDate(discount.startsOn)}
                    {discount.endsOn ? ` hasta ${formatDate(discount.endsOn)}` : ""}
                    {discount.isActive ? "" : " · inactivo"}
                  </span>
                </li>
              ))}
            </ul>
          </CardBody>
        </Card>
      ) : null}

      <div className="mt-3 grid gap-3 lg:grid-cols-2">
        <Card className="overflow-hidden">
          <CardHeader title="Últimas cuotas" action={<Link href="/app/cuotas" className="text-xs font-medium text-brand-700 hover:underline">Ver todas</Link>} />
          {data.charges.length === 0 ? (
            <p className="px-5 py-8 text-center text-sm text-ink-400">
              Todavía no hay cuotas generadas.
            </p>
          ) : (
            <Table minWidth="min-w-[520px]">
              <THead>
                <TR>
                  <TH>Concepto</TH>
                  <TH>Vencimiento</TH>
                  <TH align="right">Total</TH>
                  <TH>Estado</TH>
                </TR>
              </THead>
              <TBody>
                {data.charges.slice(0, 8).map((charge) => (
                  <TR key={charge.id}>
                    <TD className="text-xs">
                      {charge.concept}
                      <span className="block text-ink-400">{charge.period}</span>
                    </TD>
                    <TD className="whitespace-nowrap text-xs">{formatDate(charge.dueDate)}</TD>
                    <TD align="right" className="money text-xs">
                      {formatMoney(charge.totalCents)}
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

        <Card className="overflow-hidden">
          <CardHeader title="Asistencia a entrenamientos" />
          {data.attendance.length === 0 ? (
            <p className="px-5 py-8 text-center text-sm text-ink-400">
              Sin registros de asistencia.
            </p>
          ) : (
            <ul className="divide-y divide-ink-100">
              {data.attendance.slice(0, 8).map((row) => (
                <li key={row.id} className="flex items-center justify-between gap-2 px-4 py-2.5 sm:px-5">
                  <div className="min-w-0">
                    <p className="truncate text-sm text-ink-800">{row.title}</p>
                    <p className="text-xs text-ink-500">{formatDateTime(row.startsAt)}</p>
                  </div>
                  <StatusBadge meta={attendanceStatusMeta[row.status]} />
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>

      <Card className="mt-3 overflow-hidden">
        <CardHeader title="Convocatorias a partidos" />
        {data.callups.length === 0 ? (
          <p className="px-5 py-8 text-center text-sm text-ink-400">
            Sin convocatorias registradas.
          </p>
        ) : (
          <Table minWidth="min-w-[520px]">
            <THead>
              <TR>
                <TH>Partido</TH>
                <TH>Fecha</TH>
                <TH>Respuesta</TH>
              </TR>
            </THead>
            <TBody>
              {data.callups.map((callup) => (
                <TR key={callup.id}>
                  <TD className="text-sm">
                    {callup.isHome ? "vs" : "@"} {callup.rival}
                  </TD>
                  <TD className="text-xs">{formatDateTime(callup.startsAt)}</TD>
                  <TD>
                    <StatusBadge meta={callupStatusMeta[callup.status]} />
                  </TD>
                </TR>
              ))}
            </TBody>
          </Table>
        )}
      </Card>

      {!data.hasMedicalAccess ? null : (
        <p className="mt-4 flex items-center gap-1.5 text-xs text-ink-400">
          <Icon name="shield" size={13} />
          La información médica y de contacto está protegida y solo la ve el
          staff autorizado.
        </p>
      )}
    </div>
  );
}
