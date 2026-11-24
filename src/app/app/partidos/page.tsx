import Link from "next/link";
import { PageHeader, NoAccess, Flash } from "@/components/ui/page";
import { Card } from "@/components/ui/card";
import { Table, THead, TBody, TR, TH, TD } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { ButtonLink } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { Select } from "@/components/ui/form";
import { formatDateTime } from "@/lib/format";
import { can, getTenant } from "@/server/tenant";
import { listCategories } from "@/server/data/people";
import { listMatches } from "@/server/data/sports";

export const metadata = { title: "Partidos y Convocatorias" };

export default async function MatchesPage({
  searchParams,
}: {
  searchParams: Promise<{ categoria?: string; ok?: string; error?: string }>;
}) {
  const ctx = await getTenant();
  if (!can(ctx, "matches.view")) return <NoAccess />;

  const params = await searchParams;
  const [categories, matches] = await Promise.all([
    listCategories(ctx),
    listMatches(ctx, { categoryId: params.categoria }),
  ]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Partidos y Convocatorias"
        description="Fixture, partidos programados vs rivales, citación de jugadores y registro de tanteadores."
        actions={
          can(ctx, "matches.manage") ? (
            <ButtonLink href="/app/partidos/nuevo" size="sm">
              <Icon name="plus" size={15} /> Programar partido
            </ButtonLink>
          ) : null
        }
      />

      <Flash ok={params.ok} error={params.error} />

      <Card className="overflow-hidden">
        <form
          method="get"
          className="flex flex-col gap-2 border-b border-ink-100 p-3 sm:flex-row sm:items-center sm:p-4"
        >
          <div className="flex flex-1 items-center gap-2">
            <Select
              name="categoria"
              defaultValue={params.categoria ?? ""}
              aria-label="Filtrar por categoría"
              className="w-full sm:w-64"
            >
              <option value="">Todas las categorías</option>
              {categories.map((c) => {
                const suffix =
                  c.gender === "male"
                    ? " (Masc.)"
                    : c.gender === "female"
                      ? " (Fem.)"
                      : "";
                return (
                  <option key={c.id} value={c.id}>
                    {c.name}
                    {suffix}
                  </option>
                );
              })}
            </Select>
            <button
              type="submit"
              className="inline-flex h-9 items-center rounded-lg bg-ink-100 px-3 text-xs font-semibold text-ink-700 hover:bg-ink-200"
            >
              Filtrar
            </button>
          </div>
        </form>

        {matches.length === 0 ? (
          <p className="px-5 py-12 text-center text-sm text-ink-400">
            No hay partidos programados todavía.
          </p>
        ) : (
          <Table minWidth="min-w-[650px]">
            <THead>
              <TR>
                <TH>Fecha y Horario</TH>
                <TH>Categoría</TH>
                <TH>Rival y Condición</TH>
                <TH>Resultado / Tanteador</TH>
                <TH align="center">Convocados</TH>
                <TH />
              </TR>
            </THead>
            <TBody>
              {matches.map((m) => (
                <TR key={m.id}>
                  <TD className="whitespace-nowrap font-medium text-ink-900">
                    {formatDateTime(m.startsAt)}
                  </TD>
                  <TD>
                    <Badge tone="info">
                      {m.categoryName} ({m.categoryGender === "male" ? "Masc" : "Fem"})
                    </Badge>
                  </TD>
                  <TD>
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-ink-900">vs {m.rival}</span>
                      <Badge tone={m.isHome ? "success" : "neutral"}>
                        {m.isHome ? "Local" : "Visitante"}
                      </Badge>
                    </div>
                    {m.location ? (
                      <p className="text-xs text-ink-500">{m.location}</p>
                    ) : null}
                  </TD>
                  <TD>
                    {m.status === "played" && m.ourScore !== null && m.rivalScore !== null ? (
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-ink-900">
                          {m.ourScore} - {m.rivalScore}
                        </span>
                        <Badge tone={m.ourScore > m.rivalScore ? "success" : m.ourScore < m.rivalScore ? "danger" : "neutral"}>
                          {m.ourScore > m.rivalScore ? "Victoria" : m.ourScore < m.rivalScore ? "Derrota" : "Empate"}
                        </Badge>
                      </div>
                    ) : (
                      <Badge tone="warning">Programado</Badge>
                    )}
                  </TD>
                  <TD align="center">
                    <span className="inline-flex items-center gap-1 text-xs font-semibold text-ink-700">
                      <Icon name="users" size={13} /> {m.confirmedCount} / {m.callupCount}
                    </span>
                  </TD>
                  <TD align="right">
                    <Link
                      href={`/app/partidos/${m.id}`}
                      className="inline-flex items-center gap-1 text-xs font-semibold text-brand-700 hover:underline"
                    >
                      Ver convocatoria →
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
