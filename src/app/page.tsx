import Link from "next/link";
import { asc } from "drizzle-orm";
import { db } from "@/db/client";
import { plans } from "@/db/schema";
import { Icon } from "@/components/ui/icon";
import { ButtonLink } from "@/components/ui/button";
import { formatMoney } from "@/lib/format";
import { getAuth } from "@/server/auth";

export const dynamic = "force-dynamic";

const FEATURES = [
  {
    icon: "users" as const,
    title: "Jugadores y familias",
    text: "Ficha completa de cada jugador, tutores, documentación y categorías. Todo en un solo lugar.",
  },
  {
    icon: "wallet" as const,
    title: "Cuotas y cobranzas",
    text: "Cuotas generadas por categoría, descuentos por hermano y becas. Estado de deuda siempre claro.",
  },
  {
    icon: "receipt" as const,
    title: "Pagos declarados",
    text: "La familia informa su transferencia y el club la aprueba. Nunca se cobra dos veces ni se cancela deuda sola.",
  },
  {
    icon: "calendar" as const,
    title: "Entrenamientos y asistencia",
    text: "Calendario por categoría y asistencia tomada desde el teléfono en la cancha.",
  },
  {
    icon: "trophy" as const,
    title: "Partidos y convocatorias",
    text: "Convocá a los jugadores, recibí confirmaciones y guardá el resultado del partido.",
  },
  {
    icon: "bus" as const,
    title: "Viajes y autorizaciones",
    text: "Organizá la logística del viaje y controlá quién tiene la autorización firmada.",
  },
];

export default async function LandingPage() {
  const auth = await getAuth().catch(() => null);

  const planRows = await db
    .select()
    .from(plans)
    .orderBy(asc(plans.sortOrder))
    .catch(() => []);

  return (
    <div className="min-h-screen bg-white">
      <header className="sticky top-0 z-20 border-b border-ink-200 bg-white/90 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
          <Link href="/" className="flex items-center gap-2.5">
            <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-brand-400 to-brand-700 text-sm font-bold text-white shadow-sm">
              CM
            </span>
            <span className="text-sm font-semibold text-ink-900">ClubManager</span>
          </Link>
          <nav className="flex items-center gap-2">
            <Link
              href="#planes"
              className="hidden rounded-lg px-3 py-2 text-sm font-medium text-ink-600 hover:bg-ink-50 sm:block"
            >
              Planes
            </Link>
            {auth ? (
              <ButtonLink href={auth.clubId ? "/app" : "/admin"} size="sm">
                Ir a la aplicación
              </ButtonLink>
            ) : (
              <>
                <ButtonLink href="/login" variant="secondary" size="sm">
                  Ingresar
                </ButtonLink>
                <ButtonLink href="/login" size="sm">
                  Probar demo
                </ButtonLink>
              </>
            )}
          </nav>
        </div>
      </header>

      <main>
        <section className="mx-auto max-w-6xl px-4 pb-14 pt-12 sm:px-6 sm:pb-20 sm:pt-20">
          <div className="max-w-3xl">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-brand-50 px-3 py-1 text-xs font-medium text-brand-700 ring-1 ring-inset ring-brand-200">
              <Icon name="sparkles" size={14} />
              Hecho para clubes de barrio
            </span>
            <h1 className="mt-5 text-3xl font-semibold leading-[1.1] tracking-tight text-ink-900 sm:text-5xl">
              El club ordenado,
              <br />
              <span className="text-brand-700">sin planillas de Excel.</span>
            </h1>
            <p className="mt-5 max-w-xl text-base leading-relaxed text-ink-600 sm:text-lg">
              Jugadores, familias, cuotas, asistencia y viajes en una sola
              plataforma. Pensada para el básquet formativo y para quien lleva
              las cuentas del club.
            </p>
            <div className="mt-7 flex flex-wrap items-center gap-3">
              <ButtonLink href="/login" size="lg">
                Ingresar a la demo
              </ButtonLink>
              <ButtonLink href="#planes" variant="secondary" size="lg">
                Ver planes
              </ButtonLink>
            </div>
            <p className="mt-3 text-xs text-ink-500">
              La demo usa datos ficticios de un club de ejemplo.
            </p>
          </div>

          <dl className="mt-12 grid grid-cols-2 gap-6 border-t border-ink-100 pt-8 sm:grid-cols-4">
            {[
              ["Cuotas al día", "de un vistazo"],
              ["Pagos declarados", "con aprobación"],
              ["Asistencia", "desde el celular"],
              ["Multi-club", "aislado por club"],
            ].map(([title, subtitle]) => (
              <div key={title}>
                <dt className="text-sm font-semibold text-ink-900">{title}</dt>
                <dd className="mt-0.5 text-xs text-ink-500">{subtitle}</dd>
              </div>
            ))}
          </dl>
        </section>

        <section className="border-y border-ink-100 bg-ink-50/60">
          <div className="mx-auto max-w-6xl px-4 py-14 sm:px-6 sm:py-20">
            <h2 className="text-2xl font-semibold tracking-tight text-ink-900">
              Todo lo que el club necesita, sin lo que no usa
            </h2>
            <p className="mt-2 max-w-2xl text-sm text-ink-600">
              Módulos que se activan según el plan. Cada club ve únicamente su
              propia información.
            </p>
            <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {FEATURES.map((feature) => (
                <div
                  key={feature.title}
                  className="rounded-xl border border-ink-200 bg-white p-5"
                >
                  <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand-50 text-brand-700">
                    <Icon name={feature.icon} size={18} />
                  </span>
                  <h3 className="mt-3 text-sm font-semibold text-ink-900">
                    {feature.title}
                  </h3>
                  <p className="mt-1 text-sm leading-relaxed text-ink-600">
                    {feature.text}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section id="planes" className="mx-auto max-w-6xl px-4 py-14 sm:px-6 sm:py-20">
          <h2 className="text-2xl font-semibold tracking-tight text-ink-900">
            Planes
          </h2>
          <p className="mt-2 max-w-2xl text-sm text-ink-600">
            Precios de referencia por mes. La suscripción se activa cuando el
            pago se confirma: la plataforma nunca marca un plan como pago por
            su cuenta.
          </p>

          <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {planRows.length === 0 ? (
              <p className="text-sm text-ink-500">
                Los planes todavía no están cargados.
              </p>
            ) : (
              planRows.map((plan) => (
                <div
                  key={plan.id}
                  className="flex flex-col rounded-xl border border-ink-200 bg-white p-5"
                >
                  <h3 className="text-sm font-semibold text-ink-900">{plan.name}</h3>
                  <p className="mt-2">
                    <span className="money text-2xl font-semibold text-ink-900">
                      {plan.priceCents > 0 ? formatMoney(plan.priceCents) : "A medida"}
                    </span>
                    {plan.priceCents > 0 ? (
                      <span className="text-xs text-ink-500"> / mes</span>
                    ) : null}
                  </p>
                  <p className="mt-2 flex-1 text-xs leading-relaxed text-ink-600">
                    {plan.description}
                  </p>
                  <ul className="mt-3 space-y-1.5 text-xs text-ink-600">
                    <li className="flex items-center gap-1.5">
                      <Icon name="check" size={13} className="text-brand-600" />
                      Hasta {plan.maxPlayers ?? "sin límite"} jugadores
                    </li>
                    <li className="flex items-center gap-1.5">
                      <Icon name="check" size={13} className="text-brand-600" />
                      {plan.maxAdmins ?? "Sin límite"} administradores
                    </li>
                    <li className="flex items-center gap-1.5">
                      <Icon name="check" size={13} className="text-brand-600" />
                      Datos aislados por club
                    </li>
                  </ul>
                </div>
              ))
            )}
          </div>

          <div className="mt-8 rounded-xl border border-ink-200 bg-ink-50 p-5">
            <p className="text-sm font-semibold text-ink-800">
              ¿Querés probarlo con tu club?
            </p>
            <p className="mt-1 text-sm text-ink-600">
              Ingresá a la demo con un usuario de prueba y recorré la
              plataforma completa con datos ficticios.
            </p>
            <ButtonLink href="/login" className="mt-3" size="sm">
              Ingresar a la demo
            </ButtonLink>
          </div>
        </section>
      </main>

      <footer className="border-t border-ink-200 bg-white">
        <div className="mx-auto flex max-w-6xl flex-col gap-2 px-4 py-6 text-xs text-ink-500 sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <p>ClubManager · Gestión para clubes de básquet</p>
          <p>
            Datos de menores tratados según la Ley 25.326. Acceso restringido
            por rol.
          </p>
        </div>
      </footer>
    </div>
  );
}
