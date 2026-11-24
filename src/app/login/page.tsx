import Link from "next/link";
import { eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import { db } from "@/db/client";
import { clubs } from "@/db/schema";
import { getAuth } from "@/server/auth";
import { LoginForm } from "./login-form";

export const dynamic = "force-dynamic";

const DEMO_PASSWORD = "Demo2026!";
const DEMO_ACCOUNTS = [
  { key: "admin", email: "admin@barrio-norte.demo", label: "Administrador del club" },
  { key: "coach", email: "martin.ferreyra@barrio-norte.demo", label: "Entrenador" },
  { key: "tutor", email: "carla.gomez@barrio-norte.demo", label: "Padre / Tutor" },
  { key: "player", email: "tomas.gomez@barrio-norte.demo", label: "Jugador" },
];

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ demo?: string | string[] }>;
}) {
  const auth = await getAuth();
  if (auth) {
    if (!auth.clubId && auth.user.isPlatformAdmin) redirect("/admin");
    if (auth.clubId) redirect("/app");
  }

  const params = await searchParams;
  const demoParam = typeof params.demo === "string" ? params.demo : null;

  const [demoClub] = await db
    .select({ id: clubs.id })
    .from(clubs)
    .where(eq(clubs.slug, "barrio-norte-demo"))
    .limit(1);

  const demoAccount = demoClub
    ? DEMO_ACCOUNTS.find((account) => account.key === demoParam)
    : undefined;

  const prefill = demoAccount
    ? { email: demoAccount.email, password: DEMO_PASSWORD }
    : null;

  return (
    <div className="flex min-h-screen flex-col bg-ink-50">
      <header className="border-b border-ink-200 bg-white">
        <div className="mx-auto flex h-14 max-w-5xl items-center px-4">
          <Link href="/" className="flex items-center gap-2.5">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-brand-400 to-brand-700 text-xs font-bold text-white">
              CM
            </span>
            <span className="text-sm font-semibold text-ink-900">ClubManager</span>
          </Link>
        </div>
      </header>

      <main className="flex flex-1 items-center justify-center px-4 py-10">
        <div className="w-full max-w-4xl overflow-hidden rounded-2xl border border-ink-200 bg-white shadow-sm">
          <div className="grid lg:grid-cols-2">
            <div className="p-6 sm:p-8">
              <h1 className="text-xl font-semibold tracking-tight text-ink-900">
                Ingresar
              </h1>
              <p className="mt-1 text-sm text-ink-500">
                Usá el usuario que te dio el club.
              </p>
              <div className="mt-6">
                <LoginForm prefill={prefill} />
              </div>
            </div>

            <div className="border-t border-ink-100 bg-ink-50/70 p-6 lg:border-l lg:border-t-0 sm:p-8">
              {demoClub ? (
                <>
                  <h2 className="text-sm font-semibold text-ink-900">
                    Acceso a la demo
                  </h2>
                  <p className="mt-1 text-xs leading-relaxed text-ink-500">
                    El club de ejemplo está cargado con datos ficticios. Elegí un
                    rol para completar el formulario automáticamente.
                  </p>
                  <ul className="mt-4 space-y-2">
                    {DEMO_ACCOUNTS.map((account) => (
                      <li key={account.key}>
                        <Link
                          href={`/login?demo=${account.key}`}
                          className="flex items-center justify-between gap-2 rounded-lg border border-ink-200 bg-white px-3 py-2 text-xs transition-colors hover:border-brand-300 hover:bg-brand-50/40"
                        >
                          <span className="min-w-0">
                            <span className="block font-medium text-ink-800">
                              {account.label}
                            </span>
                            <span className="block truncate text-ink-500">
                              {account.email}
                            </span>
                          </span>
                          <span className="shrink-0 text-brand-700">Usar →</span>
                        </Link>
                      </li>
                    ))}
                  </ul>
                  <p className="mt-4 text-[11px] leading-relaxed text-ink-400">
                    Contraseña de la demo: <code className="text-ink-600">{DEMO_PASSWORD}</code>
                    <br />
                    Los datos del club demo no son reales y no deben usarse para
                    información sensible.
                  </p>
                </>
              ) : (
                <>
                  <h2 className="text-sm font-semibold text-ink-900">
                    ¿Todavía no tenés acceso?
                  </h2>
                  <p className="mt-1 text-xs leading-relaxed text-ink-500">
                    El alta de un club la realiza la administración de la
                    plataforma. Si tu club ya está dado de alta, pedile al
                    administrador que te invite y te envíe un enlace de acceso.
                  </p>
                  <p className="mt-4 rounded-lg bg-white p-3 text-[11px] leading-relaxed text-ink-500 ring-1 ring-inset ring-ink-200">
                    Por seguridad, esta instalación no envía emails
                    automáticamente: los enlaces de restablecimiento los genera
                    el administrador del club.
                  </p>
                </>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
