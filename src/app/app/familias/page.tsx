import Link from "next/link";
import { PageHeader, Pagination, NoAccess, Flash } from "@/components/ui/page";
import { Card } from "@/components/ui/card";
import { Table, THead, TBody, TR, TH, TD } from "@/components/ui/table";
import { ButtonLink } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { Input } from "@/components/ui/form";
import { formatMoney } from "@/lib/format";
import { can, getTenant } from "@/server/tenant";
import { listFamilies } from "@/server/data/people";

export const metadata = { title: "Familias" };

export default async function FamiliesPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; page?: string; ok?: string }>;
}) {
  const ctx = await getTenant();
  if (!can(ctx, "families.view")) return <NoAccess />;

  const params = await searchParams;
  const result = await listFamilies(ctx, {
    q: params.q,
    page: Number(params.page ?? 1) || 1,
  });

  return (
    <div>
      <PageHeader
        title="Familias"
        description="Grupos familiares, contactos y hermanos agrupados para descuentos."
        actions={
          can(ctx, "families.manage") ? (
            <ButtonLink href="/app/familias/nueva" size="sm">
              <Icon name="plus" size={15} /> Nueva familia
            </ButtonLink>
          ) : null
        }
      />

      <Flash ok={params.ok} />

      <Card className="overflow-hidden">
        <form method="get" className="flex gap-2 border-b border-ink-100 p-3 sm:p-4">
          <div className="relative flex-1">
            <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-400">
              <Icon name="search" size={16} />
            </span>
            <Input
              name="q"
              defaultValue={params.q ?? ""}
              placeholder="Buscar por familia, contacto o teléfono"
              className="pl-9"
              aria-label="Buscar familias"
            />
          </div>
          <button
            type="submit"
            className="h-9 shrink-0 rounded-lg bg-ink-900 px-3 text-sm font-medium text-white hover:bg-ink-800"
          >
            Buscar
          </button>
        </form>

        {result.rows.length === 0 ? (
          <div className="px-6 py-14 text-center">
            <p className="text-sm font-semibold text-ink-800">No hay familias</p>
            <p className="mt-1 text-sm text-ink-500">
              {params.q
                ? "Probá con otro término de búsqueda."
                : "Cargá la primera familia para agrupar jugadores y contactos."}
            </p>
            {can(ctx, "families.manage") && !params.q ? (
              <ButtonLink href="/app/familias/nueva" className="mt-4" size="sm">
                Nueva familia
              </ButtonLink>
            ) : null}
          </div>
        ) : (
          <>
            <Table minWidth="min-w-[720px]">
              <THead>
                <TR>
                  <TH>Familia</TH>
                  <TH>Contacto</TH>
                  <TH>Teléfono</TH>
                  <TH align="center">Jugadores</TH>
                  <TH align="right">Deuda</TH>
                  <TH />
                </TR>
              </THead>
              <TBody>
                {result.rows.map((family) => (
                  <TR key={family.id}>
                    <TD>
                      <Link
                        href={`/app/familias/${family.id}`}
                        className="font-medium text-ink-900 hover:text-brand-700"
                      >
                        {family.name}
                      </Link>
                    </TD>
                    <TD className="text-sm">{family.contactName}</TD>
                    <TD className="text-xs text-ink-600">{family.contactPhone}</TD>
                    <TD align="center">
                      <span className="inline-flex h-6 min-w-6 items-center justify-center rounded-full bg-ink-100 px-2 text-xs font-semibold text-ink-700">
                        {family.playerCount}
                      </span>
                    </TD>
                    <TD align="right">
                      {family.debtCents > 0 ? (
                        <span className="money font-medium text-rose-600">
                          {formatMoney(family.debtCents)}
                        </span>
                      ) : (
                        <span className="text-xs text-emerald-600">Al día</span>
                      )}
                    </TD>
                    <TD align="right">
                      <Link
                        href={`/app/familias/${family.id}`}
                        className="text-xs font-medium text-brand-700 hover:underline"
                      >
                        Ver →
                      </Link>
                    </TD>
                  </TR>
                ))}
              </TBody>
            </Table>
            <Pagination
              basePath="/app/familias"
              params={{ q: params.q }}
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
