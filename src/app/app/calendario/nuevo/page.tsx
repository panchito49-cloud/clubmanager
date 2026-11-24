import { PageHeader, NoAccess } from "@/components/ui/page";
import { Card, CardBody } from "@/components/ui/card";
import { ActionForm } from "@/components/ui/action-form";
import { Field, Input, Select, Textarea, InlineFields } from "@/components/ui/form";
import { createTrainingAction } from "@/app/actions/sports";
import { can, getTenant } from "@/server/tenant";
import { listCategories } from "@/server/data/people";
import { todayISO } from "@/lib/format";

export const metadata = { title: "Nuevo entrenamiento" };

export default async function NewTrainingPage() {
  const ctx = await getTenant();
  if (!can(ctx, "trainings.manage")) return <NoAccess />;

  const categories = await listCategories(ctx);

  return (
    <div className="mx-auto max-w-2xl">
      <PageHeader
        title="Programar entrenamiento"
        description="Fijá la fecha, hora y categoría para planificar la práctica deportiva."
        backHref="/app/calendario"
        backLabel="Calendario"
      />

      <Card>
        <CardBody>
          <ActionForm
            action={createTrainingAction}
            submitLabel="Crear entrenamiento"
            cancelHref="/app/calendario"
          >
            <div className="space-y-4">
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

              <Field
                label="Título / Objetivo de la práctica"
                htmlFor="title"
                required
                hint="Ej: Práctica táctica de transición y tiro, o Entrenamiento físico."
              >
                <Input
                  id="title"
                  name="title"
                  defaultValue="Entrenamiento general"
                  required
                />
              </Field>

              <InlineFields>
                <Field label="Fecha" htmlFor="date" required>
                  <Input id="date" name="date" type="date" defaultValue={todayISO()} required />
                </Field>
                <Field label="Hora de inicio" htmlFor="time" required>
                  <Input id="time" name="time" type="time" defaultValue="18:00" required />
                </Field>
              </InlineFields>

              <Field label="Lugar" htmlFor="location" hint="Por defecto: Gimnasio principal del club.">
                <Input
                  id="location"
                  name="location"
                  defaultValue="Cancha principal"
                  placeholder="Ej: Cancha principal, Cancha auxiliar, etc."
                />
              </Field>

              <Field label="Notas para el cuerpo técnico" htmlFor="notes">
                <Textarea
                  id="notes"
                  name="notes"
                  rows={3}
                  placeholder="Enfoque de la práctica, materiales a llevar, indicaciones especiales..."
                />
              </Field>
            </div>
          </ActionForm>
        </CardBody>
      </Card>
    </div>
  );
}
