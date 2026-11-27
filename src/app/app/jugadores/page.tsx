import Link from "next/link";
import { PageHeader, Pagination, NoAccess, Flash } from "@/components/ui/page";
import { Card } from "@/components/ui/card";
import { Badge, StatusBadge } from "@/components/ui/badge";
import { Table, THead, TBody, TR, TH, TD } from "@/components/ui/table";
import { ButtonLink } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { Input, Select } from "@/components/ui/form";
import { formatDate, formatMoney, ageFrom } from "@/lib/format";
import { playerStatusMeta } from "@/lib/status";
import { getMedicalCertificateInfo } from "@/lib/medical";
import { can, getTenant } from "@/server/tenant";
import { listCategories, listPlayers } from "@/server/data/people";

export const metadata = { title: "Jugadores" };

export default async function PlayersPage({
  searchParams,
}: {
  searchParams: Promise<{
    q?: string;
    categoria?: string;
    estado?: string;
    page?: string;
    ok?: string;
  }>;
}) {
  const ctx = await getTenant();
  if (!can(ctx, "players.view")) return <NoAccess />;

  const params = await searchParams;
  const [categories, result] = await Promise.all([
    listCategories(ctx),
    listPlayers(ctx, {
      q: params.q,
      categoryId: params.categoria,
      status: params.estado,
      page: Number(params.page ?? 1) || 1,
    }),
  ]);

  return (
    <div>
      <PageHeader
        title="Jugadores"
        description="Fichas de jugadores del club, categoría y estado de cuenta."
        actions={
          can(ctx, "players.manage") ? (
            <div className="flex items-center gap-2">
              <ButtonLink href="/app/jugadores/importar" variant="secondary" size="sm">
                <Icon name="upload" size={15} /> Importar
              </ButtonLink>
              <ButtonLink href="/app/jugadores/nuevo" size="sm">
                <Icon name="plus" size={15} /> Nuevo jugador
              </ButtonLink>
            </div>
          ) : null
        }
      />

      <Flash ok={params.ok} />

      <div className="mb-4 grid gap-3 sm:grid-cols-4">
        <div className="rounded-xl border border-ink-200 bg-white p-4 shadow-sm">
          <span className="block text-xs font-semibold uppercase tracking-wider text-ink-400">Total Jugadores</span>
          <span className="mt-1 block text-2xl font-bold text-ink-950">{result.total}</span>
          <span className="mt-0.5 block text-xs text-ink-500">Padrón de deportistas</span>
        </div>
        <div className="rounded-xl border border-ink-200 bg-white p-4 shadow-sm">
          <span className="block text-xs font-semibold uppercase tracking-wider text-ink-400">Categorías</span>
          <span className="mt-1 block text-2xl font-bold text-ink-950">{categories.length}</span>
          <span className="mt-0.5 block text-xs text-red-600 font-medium">Básquet Masc. y Fem.</span>
        </div>
        <div className="rounded-xl border border-ink-200 bg-white p-4 shadow-sm">
          <span className="block text-xs font-semibold uppercase tracking-wider text-ink-400">Estado de Cuotas</span>
          <span className="mt-1 block text-2xl font-bold text-emerald-600">
            {result.rows.filter(r => r.debtCents === 0).length} al día
          </span>
          <span className="mt-0.5 block text-xs text-ink-500">
            {result.rows.filter(r => r.debtCents > 0).length} con saldo pendiente
          </span>
        </div>
        <div className="rounded-xl border border-ink-200 bg-white p-4 shadow-sm">
          <span className="block text-xs font-semibold uppercase tracking-wider text-ink-400">Sede Principal</span>
          <span className="mt-1 block text-lg font-bold text-ink-950 truncate">Mercedes (B)</span>
          <span className="mt-0.5 block text-xs text-ink-500">C.A. Estudiantes</span>
        </div>
      </div>

      <Card className="overflow-hidden">
        <form
          method="get"
          className="flex flex-col gap-3 border-b border-ink-100 p-3 sm:flex-row sm:items-center sm:justify-between sm:p-4"
        >
          <div className="relative flex-1">
            <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-400">
              <Icon name="search" size={16} />
            </span>
            <Input
              name="q"
              defaultValue={params.q ?? ""}
              placeholder="Buscar por nombre o DNI"
              className="pl-9"
              aria-label="Buscar jugadores"
            />
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Select
              name="categoria"
              defaultValue={params.categoria ?? ""}
              aria-label="Filtrar por categoría"
              className="w-48 text-xs"
            >
              <option value="">Todas las categorías</option>
              {categories.map((category) => {
                const suffix =
                  category.gender === "male"
                    ? " (Masc.)"
                    : category.gender === "female"
                      ? " (Fem.)"
                      : "";
                return (
                  <option key={category.id} value={category.id}>
                    {category.name}
                    {suffix}
                  </option>
                );
              })}
            </Select>
            <Select
              name="estado"
              defaultValue={params.estado ?? ""}
              aria-label="Filtrar por estado"
              className="w-32 text-xs"
            >
              <option value="">Estado</option>
              <option value="active">Activos</option>
              <option value="inactive">Inactivos</option>
            </Select>
            <button
              type="submit"
              className="h-9 shrink-0 rounded-lg bg-red-600 px-4 text-xs font-semibold text-white transition hover:bg-red-700"
            >
              Filtrar
            </button>
          </div>
        </form>

        {result.rows.length === 0 ? (
          <div className="px-6 py-14 text-center">
            <p className="text-sm font-semibold text-ink-800">
              No se encontraron jugadores
            </p>
            <p className="mt-1 text-sm text-ink-500">
              {params.q || params.categoria || params.estado
                ? "Probá con otros filtros."
                : "Todavía no hay jugadores cargados en el club."}
            </p>
            {can(ctx, "players.manage") && !params.q ? (
              <ButtonLink href="/app/jugadores/nuevo" className="mt-4" size="sm">
                Cargar el primer jugador
              </ButtonLink>
            ) : null}
          </div>
        ) : (
          <>
            <Table minWidth="min-w-[820px]">
              <THead>
                <TR>
                  <TH>Jugador</TH>
                  <TH>Categoría</TH>
                  <TH>Familia</TH>
                  <TH>Edad</TH>
                  <TH>Apto Médico</TH>
                  <TH>Estado</TH>
                  {ctx.role === "club_admin" && <TH align="right">Deuda</TH>}
                  <TH align="right">Acciones</TH>
                </TR>
              </THead>
              <TBody>
                {result.rows.map((player) => (
                  <TR key={player.id}>
                    <TD>
                      <Link
                        href={`/app/jugadores/${player.id}`}
                        className="flex items-center gap-2.5"
                      >
                        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-red-50 text-xs font-bold text-red-700 border border-red-200">
                          {player.jerseyNumber ? `#${player.jerseyNumber}` : (player.firstName[0] + player.lastName[0])}
                        </span>
                        <span>
                          <span className="block font-medium text-ink-900">
                            {player.lastName}, {player.firstName}
                          </span>
                          <span className="block text-xs text-ink-500">
                            {player.dni ? `DNI ${player.dni}` : "Sin DNI"}
                            {player.position ? ` · ${player.position}` : ""}
                          </span>
                        </span>
                      </Link>
                    </TD>
                    <TD>
                      {player.categoryName ? (
                        <Badge tone="neutral">{player.categoryName}</Badge>
                      ) : (
                        <span className="text-xs text-ink-400">Sin categoría</span>
                      )}
                    </TD>
                    <TD>
                      {player.familyId ? (
                        <Link
                          href={`/app/familias/${player.familyId}`}
                          className="text-ink-700 hover:text-brand-700 hover:underline"
                        >
                          {player.familyName ?? "Ver familia"}
                        </Link>
                      ) : (
                        <span className="text-xs text-ink-400">Sin familia</span>
                      )}
                    </TD>
                    <TD className="whitespace-nowrap text-xs text-ink-500">
                      {ageFrom(player.birthDate) ?? "—"}
                      {player.birthDate ? (
                        <span className="block text-[10px] text-ink-400">
                          {formatDate(player.birthDate)}
                        </span>
                      ) : null}
                    </TD>
                    <TD>
                      {(() => {
                        const med = getMedicalCertificateInfo(player.medicalCertificateExpiresAt);
                        return (
                          <span
                            className={`inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-[11px] font-medium ${med.badgeClass}`}
                            title={med.description}
                          >
                            <span
                              className={`h-1.5 w-1.5 rounded-full ${
                                med.status === "valid"
                                  ? "bg-emerald-600"
                                  : med.status === "warning"
                                    ? "bg-amber-600"
                                    : "bg-rose-600"
                              }`}
                            />
                            {med.label}
                          </span>
                        );
                      })()}
                    </TD>
                    <TD>
                      <StatusBadge meta={playerStatusMeta[player.status]} />
                    </TD>
                    {ctx.role === "club_admin" && (
                      <TD align="right">
                        {player.debtCents > 0 ? (
                          <span className="money font-medium text-rose-600">
                            {formatMoney(player.debtCents)}
                          </span>
                        ) : (
                          <span className="text-xs text-emerald-600">Al día</span>
                        )}
                      </TD>
                    )}
                    <TD align="right" className="space-x-2 whitespace-nowrap">
                      <Link
                        href={`/app/jugadores/${player.id}/carnet`}
                        className="inline-flex items-center gap-1 rounded bg-red-50 px-2 py-1 text-xs font-semibold text-red-700 hover:bg-red-100 transition border border-red-200"
                        title="Ver Carnet Digital Oficial con QR"
                      >
                        <Icon name="shield" size={12} /> Carnet
                      </Link>
                      <Link
                        href={`/app/jugadores/${player.id}`}
                        className="text-xs font-medium text-ink-700 hover:text-red-700 hover:underline"
                      >
                        Ficha →
                      </Link>
                    </TD>
                  </TR>
                ))}
              </TBody>
            </Table>
            <Pagination
              basePath="/app/jugadores"
              params={{ q: params.q, categoria: params.categoria, estado: params.estado }}
              page={result.page}
              totalPages={result.totalPages}
              totalItems={result.total}
              pageSize={result.pageSize}
            />
          </>
        )}
      </Card>
    </div>
  );
}
