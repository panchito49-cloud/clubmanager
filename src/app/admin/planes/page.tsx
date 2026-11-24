import { PageHeader, Flash } from "@/components/ui/page";
import { Card, CardHeader, CardBody } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { SubmitButton } from "@/components/ui/submit";
import { formatMoney } from "@/lib/format";
import { listAllPlans } from "@/server/data/admin";
import { updatePlanAction } from "@/app/actions/admin";

export const metadata = { title: "Superadmin - Planes Comerciales" };

export default async function AdminPlansPage({
  searchParams,
}: {
  searchParams: Promise<{ ok?: string; error?: string }>;
}) {
  const { ok, error } = await searchParams;
  const plans = await listAllPlans();

  return (
    <div className="space-y-6">
      <PageHeader
        title="Planes Comerciales SaaS"
        description="Configuración de precios de suscripción, límites de deportistas y asignación de características."
      />

      <Flash ok={ok} error={error} />

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        {plans.map((p) => (
          <Card key={p.id}>
            <CardHeader
              title={p.name}
              description={p.description || "Plan estándar de suscripción"}
              action={
                <Badge tone={p.isActive ? "success" : "neutral"}>
                  {p.isActive ? "Activo para venta" : "Inactivo"}
                </Badge>
              }
            />
            <CardBody className="space-y-5">
              <div className="flex items-baseline justify-between border-b border-ink-100 pb-4">
                <div>
                  <span className="text-2xl font-black text-ink-900">
                    {formatMoney(p.priceCents)}
                  </span>
                  <span className="text-xs text-ink-500"> / mes por club</span>
                </div>
                <span className="text-xs font-semibold text-brand-700">
                  {p.clubCount} {p.clubCount === 1 ? "club adherido" : "clubes adheridos"}
                </span>
              </div>

              <div className="space-y-2 text-xs text-ink-700">
                <div className="flex justify-between py-1 border-b border-ink-50">
                  <span className="text-ink-500">Límite de deportistas:</span>
                  <span className="font-semibold text-ink-900">
                    {p.maxPlayers ? `Hasta ${p.maxPlayers} jugadores` : "Ilimitado"}
                  </span>
                </div>
                <div className="flex justify-between py-1 border-b border-ink-50">
                  <span className="text-ink-500">Límite de administradores:</span>
                  <span className="font-semibold text-ink-900">
                    {p.maxAdmins ? `Hasta ${p.maxAdmins} administradores` : "Ilimitado"}
                  </span>
                </div>
                <div className="flex justify-between py-1">
                  <span className="text-ink-500">Código de sistema:</span>
                  <span className="font-mono text-ink-900">{p.code}</span>
                </div>
              </div>

              {/* Formulario rápido para actualizar precio y límites */}
              <div className="rounded-xl border border-ink-100 bg-ink-50/50 p-4">
                <h4 className="mb-3 text-xs font-bold uppercase tracking-wider text-ink-600">
                  Actualizar condiciones del plan
                </h4>
                <form action={updatePlanAction} className="space-y-3">
                  <input type="hidden" name="planId" value={p.id} />
                  <div className="grid grid-cols-3 gap-2">
                    <div>
                      <label className="block text-[11px] font-medium text-ink-600 mb-1">
                        Precio ($)
                      </label>
                      <input
                        type="text"
                        name="price"
                        defaultValue={(p.priceCents / 100).toFixed(0)}
                        className="w-full rounded-md border border-ink-200 bg-white px-2.5 py-1.5 text-xs text-ink-900"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-medium text-ink-600 mb-1">
                        Máx. Jugadores
                      </label>
                      <input
                        type="number"
                        name="maxPlayers"
                        defaultValue={p.maxPlayers ?? ""}
                        placeholder="Sin límite"
                        className="w-full rounded-md border border-ink-200 bg-white px-2.5 py-1.5 text-xs text-ink-900"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-medium text-ink-600 mb-1">
                        Máx. Admins
                      </label>
                      <input
                        type="number"
                        name="maxAdmins"
                        defaultValue={p.maxAdmins ?? ""}
                        placeholder="Sin límite"
                        className="w-full rounded-md border border-ink-200 bg-white px-2.5 py-1.5 text-xs text-ink-900"
                      />
                    </div>
                  </div>
                  <div className="pt-2 text-right">
                    <SubmitButton size="sm" variant="secondary">
                      Guardar cambios
                    </SubmitButton>
                  </div>
                </form>
              </div>
            </CardBody>
          </Card>
        ))}
      </div>
    </div>
  );
}
