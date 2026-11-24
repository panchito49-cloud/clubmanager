import Link from "next/link";
import { PageHeader, NoAccess, Flash } from "@/components/ui/page";
import { Card, CardHeader, CardBody } from "@/components/ui/card";
import { Table, THead, TBody, TR, TH, TD } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { ActionForm } from "@/components/ui/action-form";
import { Field, Input, Select, InlineFields } from "@/components/ui/form";
import { createCategoryAction } from "@/app/actions/people";
import { can, getTenant } from "@/server/tenant";
import { listCategories } from "@/server/data/people";

export const metadata = { title: "Categorías" };

const GENDER_LABEL: Record<string, string> = {
  male: "Masculino",
  female: "Femenino",
  mixed: "Mixto",
};

export default async function CategoriesPage({
  searchParams,
}: {
  searchParams: Promise<{ ok?: string; error?: string }>;
}) {
  const ctx = await getTenant();
  if (!can(ctx, "categories.manage")) return <NoAccess />;

  const params = await searchParams;
  const categories = await listCategories(ctx);

  return (
    <div>
      <PageHeader
        title="Categorías"
        description="Divisiones deportivas del club. Se usan para cuotas, entrenamientos y convocatorias."
      />

      <Flash ok={params.ok} error={params.error} />

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="overflow-hidden lg:col-span-2">
          <CardHeader
            title="Categorías del club"
            description={`${categories.length} categoría(s)`}
          />
          {categories.length === 0 ? (
            <p className="px-5 py-10 text-center text-sm text-ink-400">
              Todavía no hay categorías. Creá la primera con el formulario.
            </p>
          ) : (
            <Table minWidth="min-w-[560px]">
              <THead>
                <TR>
                  <TH>Categoría</TH>
                  <TH>Años de nacimiento</TH>
                  <TH>Rama</TH>
                  <TH align="center">Jugadores</TH>
                  <TH />
                </TR>
              </THead>
              <TBody>
                {categories.map((category) => (
                  <TR key={category.id}>
                    <TD>
                      <span className="font-medium text-ink-900">{category.name}</span>
                      {!category.isActive ? (
                        <Badge tone="neutral" className="ml-2">
                          Inactiva
                        </Badge>
                      ) : null}
                    </TD>
                    <TD className="text-xs text-ink-600">
                      {category.birthYearFrom || category.birthYearTo
                        ? `${category.birthYearFrom ?? "…"} – ${category.birthYearTo ?? "…"}`
                        : "—"}
                    </TD>
                    <TD className="text-xs text-ink-600">
                      {GENDER_LABEL[category.gender] ?? category.gender}
                    </TD>
                    <TD align="center">
                      <span className="inline-flex h-6 min-w-6 items-center justify-center rounded-full bg-ink-100 px-2 text-xs font-semibold text-ink-700">
                        {category.playerCount}
                      </span>
                    </TD>
                    <TD align="right">
                      <Link
                        href={`/app/categorias/${category.id}`}
                        className="text-xs font-medium text-brand-700 hover:underline"
                      >
                        Editar →
                      </Link>
                    </TD>
                  </TR>
                ))}
              </TBody>
            </Table>
          )}
        </Card>

        <Card>
          <CardHeader title="Nueva categoría" />
          <CardBody>
            <ActionForm
              action={createCategoryAction}
              submitLabel="Crear categoría"
              footerClassName="border-none pt-1"
            >
              <Field label="Nombre" htmlFor="name" required hint="Ej: U13, U15, Primera.">
                <Input id="name" name="name" required />
              </Field>
              <InlineFields>
                <Field label="Año desde" htmlFor="birthYearFrom">
                  <Input id="birthYearFrom" name="birthYearFrom" type="number" placeholder="2014" />
                </Field>
                <Field label="Año hasta" htmlFor="birthYearTo">
                  <Input id="birthYearTo" name="birthYearTo" type="number" placeholder="2015" />
                </Field>
                <Field label="Rama" htmlFor="gender">
                  <Select id="gender" name="gender" defaultValue="mixed">
                    <option value="mixed">Mixto</option>
                    <option value="male">Masculino</option>
                    <option value="female">Femenino</option>
                  </Select>
                </Field>
                <Field label="Orden" htmlFor="sortOrder">
                  <Input id="sortOrder" name="sortOrder" type="number" defaultValue={0} />
                </Field>
              </InlineFields>
            </ActionForm>
          </CardBody>
        </Card>
      </div>
    </div>
  );
}
