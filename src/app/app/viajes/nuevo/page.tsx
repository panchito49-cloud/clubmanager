import { PageHeader, NoAccess } from "@/components/ui/page";
import { Card, CardBody } from "@/components/ui/card";
import { ActionForm } from "@/components/ui/action-form";
import { Field, Input, Select, Textarea, InlineFields } from "@/components/ui/form";
import { createTripAction } from "@/app/actions/sports";
import { can, getTenant } from "@/server/tenant";
import { listCategories } from "@/server/data/people";
import { todayISO } from "@/lib/format";

export const metadata = { title: "Nuevo viaje deportivo" };

export default async function NewTripPage() {
  const ctx = await getTenant();
  if (!can(ctx, "trips.manage")) return <NoAccess />;

  const categories = await listCategories(ctx);

  return (
    <div className="mx-auto max-w-2xl">
      <PageHeader
        title="Organizar nuevo viaje"
        description="Planificá el traslado a un torneo o partido de visitante, fijá costos y gestioná autorizaciones."
        backHref="/app/viajes"
        backLabel="Viajes"
      />

      <Card>
        <CardBody>
          <ActionForm
            action={createTripAction}
            submitLabel="Crear viaje"
            cancelHref="/app/viajes"
          >
            <div className="space-y-4">
              <Field
                label="Nombre del viaje / Torneo"
                htmlFor="title"
                required
                hint="Ej: Torneo Provincial Mar del Plata 2026 o Visita a Pergamino"
              >
                <Input id="title" name="title" placeholder="Ej: Torneo Provincial Mar del Plata" required />
              </Field>

              <Field label="Destino" htmlFor="destination" required>
                <Input id="destination" name="destination" placeholder="Ciudad, Club o Complejo" required />
              </Field>

              <Field label="Categoría" htmlFor="categoryId" hint="Opcional. Dejá vacío si viajan varias categorías.">
                <Select id="categoryId" name="categoryId" defaultValue="">
                  <option value="">Todas las categorías / Plantel combinado</option>
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
                <Field label="Fecha de salida" htmlFor="date" required>
                  <Input id="date" name="date" type="date" defaultValue={todayISO()} required />
                </Field>
                <Field label="Hora de salida" htmlFor="time" required>
                  <Input id="time" name="time" type="time" defaultValue="07:00" required />
                </Field>
              </InlineFields>

              <InlineFields>
                <Field label="Medio de transporte" htmlFor="transport" hint="Ej: Micro del club, Combi privada, etc.">
                  <Input id="transport" name="transport" placeholder="Micro larga distancia" />
                </Field>
                <Field label="Plazas disponibles" htmlFor="seats" hint="Cantidad de asientos.">
                  <Input id="seats" name="seats" type="number" min="1" placeholder="Ej: 45" />
                </Field>
              </InlineFields>

              <Field label="Costo por jugador en Pesos ($)" htmlFor="cost" hint="Dejá en 0 si está cubierto por el club.">
                <Input id="cost" name="cost" type="number" step="0.01" min="0" defaultValue="0" />
              </Field>

              <Field label="Indicaciones de logística y alojamiento" htmlFor="notes">
                <Textarea
                  id="notes"
                  name="notes"
                  rows={3}
                  placeholder="Punto de encuentro, comidas incluidas, documentación que deben llevar los chicos..."
                />
              </Field>
            </div>
          </ActionForm>
        </CardBody>
      </Card>
    </div>
  );
}
