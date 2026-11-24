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

      <Card className="overflow-hidden">
        <form
          method="get"
          className="flex flex-col gap-2 border-b border-ink-100 p-3 sm:flex-row sm:items-center sm:p-4"
        >
          <div className="flex flex-1 gap-2">
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
          </div>
          <div className="flex gap-2">
            <Select
              name="categoria"
              defaultValue={params.categoria ?? ""}
              aria-label="Filtrar por categoría"
              className="min-w-0 flex-1 sm:w-40"
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
              className="w-28"
            >
              <option value="">Estado</option>
              <option value="active">Activos</option>
              <option value="inactive">Inactivos</option>
            </Select>
            <button
              type="submit"
              className="h-9 shrink-0 rounded-lg bg-ink-900 px-3 text-sm font-medium text-white hover:bg-ink-800"
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
                  <TH>Estado</TH>
                  <TH align="right">Deuda</TH>
                  <TH />
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
                        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-ink-100 text-xs font-semibold text-ink-600">
                          {player.jerseyNumber ?? player.firstName[0]}
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
                      <StatusBadge meta={playerStatusMeta[player.status]} />
                    </TD>
                    <TD align="right">
                      {player.debtCents > 0 ? (
                        <span className="money font-medium text-rose-600">
                          {formatMoney(player.debtCents)}
                        </span>
                      ) : (
                        <span className="text-xs text-emerald-600">Al día</span>
                      )}
                    </TD>
                    <TD align="right">
                      <Link
                        href={`/app/jugadores/${player.id}`}
                        className="text-xs font-medium text-brand-700 hover:underline"
                      >
                        Ver ficha →
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
