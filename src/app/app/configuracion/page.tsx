import { PageHeader, NoAccess, Flash } from "@/components/ui/page";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { ActionForm } from "@/components/ui/action-form";
import { Field, Input, InlineFields, Checkbox } from "@/components/ui/form";
import { Badge } from "@/components/ui/badge";
import { can, getTenant } from "@/server/tenant";
import { updateClubConfigAction } from "@/app/actions/club";

export const metadata = { title: "Configuración del Club" };

export default async function ClubConfigPage({
  searchParams,
}: {
  searchParams: Promise<{ ok?: string; error?: string }>;
}) {
  const ctx = await getTenant();
  if (!can(ctx, "club.manage")) return <NoAccess />;

  const { ok, error } = await searchParams;
  const club = ctx.club;
  const settings = club.settings || {};
  const plan = ctx.plan;

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <PageHeader
        title="Configuración de la Institución"
        description="Parámetros institucionales, fiscales y reglas económicas de cobro de tu club."
        actions={
          <Badge tone={club.status === "active" ? "success" : "warning"}>
            Plan {plan?.name || "Sin plan"} · {club.status === "active" ? "Activo" : "Prueba"}
          </Badge>
        }
      />

      <Flash ok={ok} error={error} />

      <Card>
        <CardBody>
          <ActionForm
            action={updateClubConfigAction}
            submitLabel="Guardar cambios"
            cancelHref="/app"
          >
            <div className="space-y-8">
              {/* DATOS INSTITUCIONALES */}
              <section className="space-y-4">
                <h3 className="text-xs font-semibold uppercase tracking-wide text-ink-500">
                  Datos de la institución
                </h3>

                <InlineFields>
                  <Field label="Nombre del club" htmlFor="name" required>
                    <Input
                      id="name"
                      name="name"
                      defaultValue={club.name}
                      required
                    />
                  </Field>

                  <Field label="Color de identidad institucional" htmlFor="primaryColor" required hint="Código hexadecimal con #.">
                    <div className="flex items-center gap-2">
                      <input
                        type="color"
                        defaultValue={club.primaryColor}
                        onChange={undefined}
                        className="h-9 w-12 cursor-pointer rounded-lg border border-ink-200 p-1"
                        id="colorPicker"
                      />
                      <Input
                        id="primaryColor"
                        name="primaryColor"
                        defaultValue={club.primaryColor}
                        required
                        className="font-mono text-xs"
                      />
                    </div>
                  </Field>
                </InlineFields>

                <InlineFields>
                  <Field label="Ciudad / Localidad" htmlFor="city">
                    <Input
                      id="city"
                      name="city"
                      defaultValue={club.city ?? ""}
                      placeholder="Ej: La Plata"
                    />
                  </Field>

                  <Field label="Provincia" htmlFor="province">
                    <Input
                      id="province"
                      name="province"
                      defaultValue={club.province ?? ""}
                      placeholder="Ej: Buenos Aires"
                    />
                  </Field>
                </InlineFields>

                <InlineFields>
                  <Field label="Dirección / Sede" htmlFor="address">
                    <Input
                      id="address"
                      name="address"
                      defaultValue={settings.address ?? ""}
                      placeholder="Calle 12 N° 345"
                    />
                  </Field>

                  <Field label="CUIT Institucional" htmlFor="cuit">
                    <Input
                      id="cuit"
                      name="cuit"
                      defaultValue={settings.cuit ?? ""}
                      placeholder="30-12345678-9"
                    />
                  </Field>
                </InlineFields>

                <InlineFields>
                  <Field label="Teléfono de secretaría" htmlFor="phone">
                    <Input
                      id="phone"
                      name="phone"
                      defaultValue={settings.phone ?? ""}
                      placeholder="0221 400 1111"
                    />
                  </Field>

                  <Field label="Email institucional" htmlFor="email">
                    <Input
                      id="email"
                      name="email"
                      type="email"
                      defaultValue={settings.email ?? ""}
                      placeholder="secretaria@club.com.ar"
                    />
                  </Field>
                </InlineFields>
              </section>

              {/* REGLAS ECONÓMICAS Y COBRANZAS */}
              <section className="space-y-4 border-t border-ink-100 pt-6">
                <div>
                  <h3 className="text-xs font-semibold uppercase tracking-wide text-ink-500">
                    Reglas de cobranzas y cuotas sociales
                  </h3>
                  <p className="text-xs text-ink-500">
                    Estas reglas se aplican automáticamente en la emisión masiva de cuotas y cálculo de morosidad.
                  </p>
                </div>

                <InlineFields>
                  <Field
                    label="Descuento automático por hermano (%)"
                    htmlFor="siblingDiscountPct"
                    hint="Porcentaje de descuento para el 2do hermano en adelante (0 a 100)."
                  >
                    <Input
                      id="siblingDiscountPct"
                      name="siblingDiscountPct"
                      type="number"
                      min={0}
                      max={100}
                      defaultValue={settings.siblingDiscountPct ?? 0}
                    />
                  </Field>

                  <Field
                    label="Días de gracia por vencimiento"
                    htmlFor="graceDays"
                    hint="Días adicionales después de la fecha de vencimiento antes de considerar mora."
                  >
                    <Input
                      id="graceDays"
                      name="graceDays"
                      type="number"
                      min={0}
                      max={60}
                      defaultValue={settings.graceDays ?? 5}
                    />
                  </Field>

                  <Field
                    label="Día habitual de vencimiento"
                    htmlFor="billingDay"
                    hint="Día del mes sugerido para el vencimiento de cuotas (1 al 28)."
                  >
                    <Input
                      id="billingDay"
                      name="billingDay"
                      type="number"
                      min={1}
                      max={28}
                      defaultValue={settings.billingDay ?? 10}
                    />
                  </Field>
                </InlineFields>

                <div className="rounded-xl border border-ink-100 bg-ink-50/50 p-4">
                  <label className="flex items-start gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      name="remindersEnabled"
                      defaultChecked={settings.remindersEnabled ?? false}
                      className="mt-0.5 h-4 w-4 rounded-sm border-ink-300 text-brand-600 focus:ring-brand-500"
                    />
                    <div>
                      <span className="text-sm font-semibold text-ink-900">
                        Recordatorios automáticos de vencimiento
                      </span>
                      <p className="text-xs text-ink-500">
                        Habilita la programación de notificaciones automáticas previas al vencimiento de cada cuota.
                      </p>
                    </div>
                  </label>
                </div>
              </section>
            </div>
          </ActionForm>
        </CardBody>
      </Card>

      {/* PLAN Y LÍMITES */}
      <Card>
        <CardHeader
          title="Plan y Capacidad Contratada"
          description="Límites asignados por el plan SaaS del club."
        />
        <CardBody>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div className="rounded-xl bg-ink-50 p-4">
              <span className="text-xs font-medium text-ink-500">Plan contratado</span>
              <p className="mt-1 text-base font-bold text-ink-900">{plan?.name || "Sin plan"}</p>
              <p className="text-xs text-ink-500">{plan?.description || "Plan estándar"}</p>
            </div>
            <div className="rounded-xl bg-ink-50 p-4">
              <span className="text-xs font-medium text-ink-500">Límite de deportistas</span>
              <p className="mt-1 text-base font-bold text-ink-900">
                {plan?.maxPlayers ? `Hasta ${plan.maxPlayers}` : "Ilimitados"}
              </p>
              <p className="text-xs text-ink-500">Capacidad máxima del club</p>
            </div>
            <div className="rounded-xl bg-ink-50 p-4">
              <span className="text-xs font-medium text-ink-500">Límite de administradores</span>
              <p className="mt-1 text-base font-bold text-ink-900">
                {plan?.maxAdmins ? `Hasta ${plan.maxAdmins}` : "Ilimitados"}
              </p>
              <p className="text-xs text-ink-500">Usuarios con rol Administrador</p>
            </div>
          </div>
        </CardBody>
      </Card>
    </div>
  );
}
