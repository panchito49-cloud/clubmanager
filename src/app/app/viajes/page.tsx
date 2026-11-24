import Link from "next/link";
import { PageHeader, NoAccess, Flash } from "@/components/ui/page";
import { Card } from "@/components/ui/card";
import { Table, THead, TBody, TR, TH, TD } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { ButtonLink } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { formatDateTime, formatMoney } from "@/lib/format";
import { can, getTenant } from "@/server/tenant";
import { listTrips } from "@/server/data/sports";

export const metadata = { title: "Viajes y Logística" };

export default async function TripsPage({
  searchParams,
}: {
  searchParams: Promise<{ ok?: string; error?: string }>;
}) {
  const ctx = await getTenant();
  if (!can(ctx, "trips.view")) return <NoAccess />;

  const params = await searchParams;
  const trips = await listTrips(ctx);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Viajes y Logística"
        description="Organización de traslados a torneos, giras deportivas, costos, plazas y autorizaciones."
        actions={
          can(ctx, "trips.manage") ? (
            <ButtonLink href="/app/viajes/nuevo" size="sm">
              <Icon name="plus" size={15} /> Nuevo viaje
            </ButtonLink>
          ) : null
        }
      />

      <Flash ok={params.ok} error={params.error} />

      <Card className="overflow-hidden">
        {trips.length === 0 ? (
          <p className="px-5 py-12 text-center text-sm text-ink-400">
            No hay viajes registrados. Creá el primero para gestionar la delegación.
          </p>
        ) : (
          <Table minWidth="min-w-[650px]">
            <THead>
              <TR>
                <TH>Viaje y Destino</TH>
                <TH>Categoría</TH>
                <TH>Salida</TH>
                <TH>Costo p/jugador</TH>
                <TH align="center">Plazas / Pasajeros</TH>
                <TH align="center">Autorizados</TH>
                <TH />
              </TR>
            </THead>
            <TBody>
              {trips.map((t) => (
                <TR key={t.id}>
                  <TD>
                    <span className="font-semibold text-ink-900">{t.title}</span>
                    <p className="text-xs text-ink-500">Destino: {t.destination}</p>
                  </TD>
                  <TD>
                    {t.categoryName ? (
                      <Badge tone="info">
                        {t.categoryName} ({t.categoryGender === "male" ? "Masc" : "Fem"})
                      </Badge>
                    ) : (
                      <Badge tone="neutral">Todas las categorías</Badge>
                    )}
                  </TD>
                  <TD className="whitespace-nowrap text-xs text-ink-800">
                    {formatDateTime(t.departureAt)}
                  </TD>
                  <TD className="font-medium text-ink-900">
                    {t.costCents > 0 ? formatMoney(t.costCents) : "Sin costo extra"}
                  </TD>
                  <TD align="center">
                    <span className="inline-flex items-center gap-1 text-xs font-semibold text-ink-700">
                      <Icon name="bus" size={13} /> {t.passengerCount}
                      {t.seats ? ` / ${t.seats}` : ""}
                    </span>
                  </TD>
                  <TD align="center">
                    <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-bold text-emerald-700">
                      {t.authorizedCount} de {t.passengerCount}
                    </span>
                  </TD>
                  <TD align="right">
                    <Link
                      href={`/app/viajes/${t.id}`}
                      className="inline-flex items-center gap-1 text-xs font-semibold text-brand-700 hover:underline"
                    >
                      Ver delegación →
                    </Link>
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
