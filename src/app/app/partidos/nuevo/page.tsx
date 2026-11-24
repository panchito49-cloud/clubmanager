import { PageHeader, NoAccess } from "@/components/ui/page";
import { Card, CardBody } from "@/components/ui/card";
import { ActionForm } from "@/components/ui/action-form";
import { Field, Input, Select, Textarea, InlineFields } from "@/components/ui/form";
import { createMatchAction } from "@/app/actions/sports";
import { can, getTenant } from "@/server/tenant";
import { listCategories } from "@/server/data/people";
import { todayISO } from "@/lib/format";

export const metadata = { title: "Nuevo partido" };

export default async function NewMatchPage() {
  const ctx = await getTenant();
  if (!can(ctx, "matches.manage")) return <NoAccess />;

  const categories = await listCategories(ctx);

  return (
    <div className="mx-auto max-w-2xl">
      <PageHeader
        title="Programar partido"
        description="Agendá un nuevo cotejo deportivo vs rival para la categoría."
        backHref="/app/partidos"
        backLabel="Partidos"
      />

      <Card>
        <CardBody>
          <ActionForm
            action={createMatchAction}
            submitLabel="Programar partido"
            cancelHref="/app/partidos"
          >
            <div className="space-y-4">
              <Field label="Rival" htmlFor="rival" required hint="Nombre del club o equipo adversario.">
                <Input id="rival" name="rival" placeholder="Ej: Club Social y Deportivo Lanús" required />
              </Field>

              <Field label="Categoría" htmlFor="categoryId" required>
                <Select id="categoryId" name="categoryId" required defaultValue="">
                  <option value="" disabled>
                    Seleccioná una categoría
                  </option>
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
              </Field>

              <InlineFields>
                <Field label="Fecha" htmlFor="date" required>
                  <Input id="date" name="date" type="date" defaultValue={todayISO()} required />
                </Field>
                <Field label="Hora" htmlFor="time" required>
                  <Input id="time" name="time" type="time" defaultValue="19:30" required />
                </Field>
              </InlineFields>

              <InlineFields>
                <Field label="Condición" htmlFor="isHome" required>
                  <Select id="isHome" name="isHome" defaultValue="true">
                    <option value="true">Local (en nuestro club)</option>
                    <option value="false">Visitante (en cancha rival)</option>
                  </Select>
                </Field>
                <Field label="Lugar / Dirección" htmlFor="location">
                  <Input
                    id="location"
                    name="location"
                    placeholder="Ej: Estadio Club Atenas, La Plata"
                  />
                </Field>
              </InlineFields>

              <Field label="Indicaciones para la citación" htmlFor="notes">
                <Textarea
                  id="notes"
                  name="notes"
                  rows={3}
                  placeholder="Horario de citación en el vestuario, indumentaria titular/suplente, etc."
                />
              </Field>
            </div>
          </ActionForm>
        </CardBody>
      </Card>
    </div>
  );
}
