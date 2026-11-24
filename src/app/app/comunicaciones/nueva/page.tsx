import { PageHeader, NoAccess } from "@/components/ui/page";
import { Card, CardBody } from "@/components/ui/card";
import { ActionForm } from "@/components/ui/action-form";
import { Field, Input, Select, Textarea, InlineFields } from "@/components/ui/form";
import { createAnnouncementAction } from "@/app/actions/comms";
import { can, getTenant } from "@/server/tenant";
import { listCategories } from "@/server/data/people";

export const metadata = { title: "Nueva comunicación" };

export default async function NewAnnouncementPage() {
  const ctx = await getTenant();
  if (!can(ctx, "comms.send")) return <NoAccess />;

  const categories = await listCategories(ctx);

  return (
    <div className="mx-auto max-w-2xl">
      <PageHeader
        title="Nueva comunicación"
        description="Redactá un comunicado institucional para familias, jugadores o entrenadores."
        backHref="/app/comunicaciones"
        backLabel="Comunicaciones"
      />

      <Card>
        <CardBody>
          <ActionForm
            action={createAnnouncementAction}
            submitLabel="Guardar como borrador"
            cancelHref="/app/comunicaciones"
          >
            <div className="space-y-4">
              <Field
                label="Título del comunicado"
                htmlFor="title"
                required
                hint="Asunto claro y conciso."
              >
                <Input
                  id="title"
                  name="title"
                  placeholder="Ej: Cambio de horario para entrenamientos del sábado"
                  required
                />
              </Field>

              <InlineFields>
                <Field
                  label="Audiencia destinataria"
                  htmlFor="audience"
                  required
                  hint="A quién va dirigido el mensaje."
                >
                  <Select id="audience" name="audience" defaultValue="all" required>
                    <option value="all">Toda la comunidad del club</option>
                    <option value="category">Categoría específica</option>
                    <option value="families">Solo familias / tutores</option>
                    <option value="coaches">Solo entrenadores</option>
                    <option value="players">Solo jugadores</option>
                  </Select>
                </Field>

                <Field
                  label="Canal de entrega"
                  htmlFor="channel"
                  required
                  hint="Por dónde se emite el aviso."
                >
                  <Select id="channel" name="channel" defaultValue="in_app" required>
                    <option value="in_app">Bandeja interna (In-App)</option>
                    <option value="whatsapp" disabled>
                      WhatsApp (Requiere configurar API oficial)
                    </option>
                  </Select>
                </Field>
              </InlineFields>

              <Field
                label="Categoría (solo si seleccionaste Categoría específica)"
                htmlFor="categoryId"
                hint="Seleccioná la categoría correspondiente."
              >
                <Select id="categoryId" name="categoryId" defaultValue="">
                  <option value="">Seleccioná una categoría...</option>
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
                label="Cuerpo del mensaje"
                htmlFor="body"
                required
                hint="Texto completo de la comunicación. Podés incluir detalles de fechas, horarios y requerimientos."
              >
                <Textarea
                  id="body"
                  name="body"
                  rows={6}
                  placeholder="Estimadas familias y jugadores: les informamos que..."
                  required
                />
              </Field>
            </div>
          </ActionForm>
        </CardBody>
      </Card>
    </div>
  );
}
