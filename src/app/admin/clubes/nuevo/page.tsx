import { PageHeader } from "@/components/ui/page";
import { Card, CardBody } from "@/components/ui/card";
import { ActionForm } from "@/components/ui/action-form";
import { Field, Input, Select, InlineFields } from "@/components/ui/form";
import { createClubAction } from "@/app/actions/admin";
import { listAllPlans } from "@/server/data/admin";
import { formatMoney } from "@/lib/format";

export const metadata = { title: "Superadmin - Nuevo Club" };

export default async function NewClubAdminPage() {
  const plans = await listAllPlans();

  return (
    <div className="mx-auto max-w-2xl">
      <PageHeader
        title="Dar de alta nuevo club"
        description="Registrá una nueva institución deportiva. Se inicializarán automáticamente las 16 categorías de básquet (ramas masculina y femenina)."
        backHref="/admin/clubes"
        backLabel="Clubes"
      />

      <Card>
        <CardBody>
          <ActionForm
            action={createClubAction}
            submitLabel="Crear e inicializar club"
            cancelHref="/admin/clubes"
          >
            <div className="space-y-6">
              <section className="space-y-4">
                <h3 className="text-xs font-semibold uppercase tracking-wide text-ink-500">
                  Identificación de la institución
                </h3>

                <InlineFields>
                  <Field label="Nombre del club" htmlFor="name" required>
                    <Input
                      id="name"
                      name="name"
                      placeholder="Ej: Club Atlético Unión"
                      required
                    />
                  </Field>

                  <Field
                    label="Slug (Identificador URL)"
                    htmlFor="slug"
                    required
                    hint="Solo minúsculas, números y guiones. Ej: union-sf"
                  >
                    <Input
                      id="slug"
                      name="slug"
                      placeholder="union-sf"
                      required
                    />
                  </Field>
                </InlineFields>

                <InlineFields>
                  <Field label="Ciudad / Localidad" htmlFor="city">
                    <Input id="city" name="city" placeholder="Ej: Santa Fe" />
                  </Field>

                  <Field label="Provincia" htmlFor="province">
                    <Input id="province" name="province" placeholder="Ej: Santa Fe" />
                  </Field>
                </InlineFields>

                <Field label="Plan SaaS inicial" htmlFor="planId" required>
                  <Select id="planId" name="planId" required defaultValue={plans[0]?.id ?? ""}>
                    {plans.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name} ({formatMoney(p.priceCents)}/mes) ·{" "}
                        {p.maxPlayers ? `Hasta ${p.maxPlayers} jugadores` : "Ilimitado"}
                      </option>
                    ))}
                  </Select>
                </Field>
              </section>

              <section className="space-y-4 border-t border-ink-100 pt-5">
                <div>
                  <h3 className="text-xs font-semibold uppercase tracking-wide text-ink-500">
                    Administrador inicial del club
                  </h3>
                  <p className="text-xs text-ink-500">
                    Recibirá las credenciales de acceso para comenzar a operar la institución.
                  </p>
                </div>

                <Field label="Nombre y Apellido" htmlFor="adminFullName" required>
                  <Input
                    id="adminFullName"
                    name="adminFullName"
                    placeholder="Ej: Juan Carlos López"
                    required
                  />
                </Field>

                <InlineFields>
                  <Field label="Email de acceso" htmlFor="adminEmail" required>
                    <Input
                      id="adminEmail"
                      name="adminEmail"
                      type="email"
                      placeholder="administrador@union.com"
                      required
                    />
                  </Field>

                  <Field label="Teléfono de contacto" htmlFor="adminPhone">
                    <Input
                      id="adminPhone"
                      name="adminPhone"
                      placeholder="342 400 1111"
                    />
                  </Field>
                </InlineFields>
              </section>
            </div>
          </ActionForm>
        </CardBody>
      </Card>
    </div>
  );
}
