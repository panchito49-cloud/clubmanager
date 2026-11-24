import { notFound } from "next/navigation";
import { PageHeader, NoAccess, Flash } from "@/components/ui/page";
import { Card, CardHeader, CardBody } from "@/components/ui/card";
import { Table, THead, TBody, TR, TH, TD } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Icon } from "@/components/ui/icon";
import { formatDateTime, formatMoney } from "@/lib/format";
import { can, getTenant } from "@/server/tenant";
import { listPlayers } from "@/server/data/people";
import { getTrip } from "@/server/data/sports";
import { addTripPassengerAction, updatePassengerStatusAction } from "@/app/actions/sports";

export const metadata = { title: "Delegación del Viaje" };

export default async function TripDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ ok?: string; error?: string }>;
}) {
  const ctx = await getTenant();
  if (!can(ctx, "trips.view")) return <NoAccess />;

  const { id } = await params;
  const { ok, error } = await searchParams;

  const [data, availablePlayers] = await Promise.all([
    getTrip(ctx, id),
    listPlayers(ctx, { status: "active" }),
  ]);

  if (!data) notFound();

  const { trip, passengers } = data;
  const canManage = can(ctx, "trips.manage");

  const passengerPlayerIds = new Set(passengers.map((p) => p.playerId));
  const candidatePlayers = availablePlayers.rows.filter((p) => !passengerPlayerIds.has(p.id));

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <PageHeader
        title={trip.title}
        description={`Destino: ${trip.destination} · Salida: ${formatDateTime(trip.departureAt)}${
          trip.transport ? ` · ${trip.transport}` : ""
        }`}
        backHref="/app/viajes"
        backLabel="Viajes"
        actions={
          <Badge tone={trip.status === "open" ? "success" : "neutral"}>
            {trip.status === "open" ? "Inscripción abierta" : trip.status}
          </Badge>
        }
      />

      <Flash ok={ok} error={error} />

      {/* Tarjetas resumen */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="rounded-xl border border-ink-200 bg-white p-3 shadow-sm">
          <p className="text-xs text-ink-500">Pasajeros</p>
          <p className="mt-1 text-xl font-bold text-ink-900">
            {passengers.length}
            {trip.seats ? ` / ${trip.seats}` : ""}
          </p>
        </div>
        <div className="rounded-xl border border-ink-200 bg-white p-3 shadow-sm">
          <p className="text-xs text-ink-500">Costo p/jugador</p>
          <p className="mt-1 text-xl font-bold text-ink-900">{formatMoney(trip.costCents)}</p>
        </div>
        <div className="rounded-xl border border-emerald-200 bg-emerald-50/50 p-3 shadow-sm">
          <p className="text-xs text-emerald-700">Autorizados</p>
          <p className="mt-1 text-xl font-bold text-emerald-800">
            {passengers.filter((p) => p.authorizationStatus === "granted").length}
          </p>
        </div>
        <div className="rounded-xl border border-sky-200 bg-sky-50/50 p-3 shadow-sm">
          <p className="text-xs text-sky-700">Pagos al día</p>
          <p className="mt-1 text-xl font-bold text-sky-800">
            {passengers.filter((p) => p.paymentStatus === "paid").length}
          </p>
        </div>
      </div>

      {/* Agregar pasajero a la delegación */}
      {canManage && candidatePlayers.length > 0 ? (
        <Card className="p-3 sm:p-4">
          <form action={addTripPassengerAction} className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <input type="hidden" name="tripId" value={trip.id} />
            <div className="flex-1">
              <label htmlFor="playerId" className="block text-xs font-semibold text-ink-700">
                Sumar jugador a la delegación
              </label>
              <select
                id="playerId"
                name="playerId"
                required
                className="mt-1 block w-full rounded-lg border border-ink-300 bg-white px-3 py-2 text-xs text-ink-900 shadow-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
              >
                <option value="">Seleccionar jugador...</option>
                {candidatePlayers.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.lastName}, {p.firstName} {p.categoryName ? `(${p.categoryName})` : ""}
                  </option>
                ))}
              </select>
            </div>
            <div className="sm:pt-5">
              <button
                type="submit"
                className="inline-flex w-full items-center justify-center gap-1.5 rounded-lg bg-brand-600 px-4 py-2 text-xs font-semibold text-white shadow-sm hover:bg-brand-700 sm:w-auto"
              >
                <Icon name="plus" size={14} /> Agregar pasajero
              </button>
            </div>
          </form>
        </Card>
      ) : null}

      {/* Listado de la delegación */}
      <Card className="overflow-hidden">
        <CardHeader
          title="Lista de Pasajeros y Estado de Permisos"
          description="Control de autorizaciones de viaje por parte de tutores y cancelación de pasajes."
        />
        {passengers.length === 0 ? (
          <p className="px-5 py-10 text-center text-xs text-ink-400">
            Todavía no hay pasajeros agregados a este viaje.
          </p>
        ) : (
          <Table minWidth="min-w-[650px]">
            <THead>
              <TR>
                <TH>Jugador</TH>
                <TH>Autorización Parental</TH>
                <TH>Pago del Pasaje</TH>
                <TH />
              </TR>
            </THead>
            <TBody>
              {passengers.map((p) => (
                <TR key={p.id}>
                  <TD>
                    <span className="font-semibold text-ink-900">
                      {p.lastName}, {p.firstName}
                    </span>
                    {p.jerseyNumber ? (
                      <span className="ml-2 text-xs text-ink-500">#{p.jerseyNumber}</span>
                    ) : null}
                  </TD>
                  <TD>
                    <div className="flex items-center gap-2">
                      <Badge
                        tone={
                          p.authorizationStatus === "granted"
                            ? "success"
                            : p.authorizationStatus === "rejected"
                              ? "danger"
                              : "warning"
                        }
                      >
                        {p.authorizationStatus === "granted"
                          ? "Autorizado"
                          : p.authorizationStatus === "rejected"
                            ? "Rechazado"
                            : "Pendiente"}
                      </Badge>
                      {canManage && p.authorizationStatus !== "granted" ? (
                        <form action={updatePassengerStatusAction}>
                          <input type="hidden" name="tripId" value={trip.id} />
                          <input type="hidden" name="passengerId" value={p.id} />
                          <input type="hidden" name="authorizationStatus" value="granted" />
                          <button
                            type="submit"
                            className="text-xs font-medium text-emerald-700 hover:underline"
                          >
                            Validar permiso ✓
                          </button>
                        </form>
                      ) : null}
                    </div>
                  </TD>
                  <TD>
                    <div className="flex items-center gap-2">
                      <Badge tone={p.paymentStatus === "paid" ? "success" : "neutral"}>
                        {p.paymentStatus === "paid" ? "Pagado" : "Pendiente"}
                      </Badge>
                      {canManage && p.paymentStatus !== "paid" ? (
                        <form action={updatePassengerStatusAction}>
                          <input type="hidden" name="tripId" value={trip.id} />
                          <input type="hidden" name="passengerId" value={p.id} />
                          <input type="hidden" name="paymentStatus" value="paid" />
                          <button
                            type="submit"
                            className="text-xs font-medium text-brand-700 hover:underline"
                          >
                            Marcar pagado ✓
                          </button>
                        </form>
                      ) : null}
                    </div>
                  </TD>
                  <TD align="right" className="text-xs text-ink-400">
                    {p.authorizedAt ? "Firmado digitalmente" : "Sin firma"}
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
