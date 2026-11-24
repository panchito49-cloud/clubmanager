import { PageHeader, NoAccess } from "@/components/ui/page";
import { Card, CardBody } from "@/components/ui/card";
import { ActionForm } from "@/components/ui/action-form";
import { Field, Input, Select, InlineFields } from "@/components/ui/form";
import { createStaffUserAction } from "@/app/actions/users";
import { can, getTenant } from "@/server/tenant";
import { listCategories } from "@/server/data/people";

export const metadata = { title: "Nuevo usuario staff" };

export default async function NewStaffUserPage() {
  const ctx = await getTenant();
  if (!can(ctx, "users.manage")) return <NoAccess />;

  const categories = await listCategories(ctx);

  return (
    <div className="mx-auto max-w-2xl">
      <PageHeader
        title="Dar de alta usuario del staff"
        description="Creá un acceso para un nuevo administrador o entrenador del club."
        backHref="/app/usuarios"
        backLabel="Usuarios"
      />

      <Card>
        <CardBody>
          <ActionForm
            action={createStaffUserAction}
            submitLabel="Crear usuario staff"
            cancelHref="/app/usuarios"
          >
            <div className="space-y-6">
              <section className="space-y-4">
                <h3 className="text-xs font-semibold uppercase tracking-wide text-ink-500">
                  Datos personales y de acceso
                </h3>

                <Field label="Nombre completo" htmlFor="fullName" required>
                  <Input
                    id="fullName"
                    name="fullName"
                    placeholder="Ej: Marcelo Milanesio"
                    required
                  />
                </Field>

                <InlineFields>
                  <Field label="Correo electrónico" htmlFor="email" required hint="Será su identificador de acceso.">
                    <Input
                      id="email"
                      name="email"
                      type="email"
                      placeholder="entrenador@miclub.com"
                      required
                    />
                  </Field>

                  <Field label="Teléfono / WhatsApp" htmlFor="phone">
                    <Input
                      id="phone"
                      name="phone"
                      placeholder="11 4000 1111"
                    />
                  </Field>
                </InlineFields>

                <InlineFields>
                  <Field label="Rol en el club" htmlFor="role" required>
                    <Select id="role" name="role" defaultValue="coach" required>
                      <option value="coach">Entrenador (Acceso deportivo a sus categorías)</option>
                      <option value="club_admin">Administrador (Gestión integral del club)</option>
                    </Select>
                  </Field>

                  <Field
                    label="Contraseña inicial"
                    htmlFor="initialPassword"
                    hint="Opcional. Si se deja en blanco se genera una automática."
                  >
                    <Input
                      id="initialPassword"
                      name="initialPassword"
                      type="text"
                      placeholder="Mínimo 8 caracteres"
                    />
                  </Field>
                </InlineFields>
              </section>

              <section className="space-y-3 border-t border-ink-100 pt-5">
                <div>
                  <h3 className="text-xs font-semibold uppercase tracking-wide text-ink-500">
                    Asignación de categorías (solo entrenadores)
                  </h3>
                  <p className="text-xs text-ink-500">
                    El entrenador solo podrá consultar y gestionar los jugadores, entrenamientos y partidos de las categorías marcadas.
                  </p>
                </div>

                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                  {categories.map((c) => {
                    const suffix =
                      c.gender === "male"
                        ? " (Masc.)"
                        : c.gender === "female"
                          ? " (Fem.)"
                          : "";
                    return (
                      <label
                        key={c.id}
                        className="flex items-center gap-2.5 rounded-lg border border-ink-200 p-2.5 text-xs font-medium text-ink-800 hover:bg-ink-50"
                      >
                        <input
                          type="checkbox"
                          name="categoryIds"
                          value={c.id}
                          className="h-4 w-4 rounded-sm border-ink-300 text-brand-600 focus:ring-brand-500"
                        />
                        <span>
                          {c.name}
                          <strong className="text-ink-500 font-normal">{suffix}</strong>
                        </span>
                      </label>
                    );
                  })}
                </div>
              </section>
            </div>
          </ActionForm>
        </CardBody>
      </Card>
    </div>
  );
}
