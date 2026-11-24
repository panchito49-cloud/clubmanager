import Link from "next/link";
import { redirect } from "next/navigation";
import { switchClubAction } from "@/app/actions/auth";
import { getAuth } from "@/server/auth";
import { roleLabel } from "@/lib/permissions";
import { Icon } from "@/components/ui/icon";

export const dynamic = "force-dynamic";
export const metadata = { title: "Elegir club" };

export default async function SeleccionarClubPage() {
  const auth = await getAuth();
  if (!auth) redirect("/login");

  if (auth.clubId && auth.memberships.some((m) => m.clubId === auth.clubId)) {
    redirect("/app");
  }

  if (auth.memberships.length === 0) redirect("/sin-club");

  return (
    <div className="flex min-h-screen flex-col bg-ink-50">
      <header className="border-b border-ink-200 bg-white">
        <div className="mx-auto flex h-14 max-w-3xl items-center px-4">
          <Link href="/" className="flex items-center gap-2.5">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-brand-400 to-brand-700 text-xs font-bold text-white">
              CM
            </span>
            <span className="text-sm font-semibold text-ink-900">ClubManager</span>
          </Link>
        </div>
      </header>

      <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-10">
        <h1 className="text-xl font-semibold tracking-tight text-ink-900">
          ¿Con qué club querés entrar?
        </h1>
        <p className="mt-1 text-sm text-ink-500">
          Tu usuario pertenece a más de un club. Los datos de cada club están
          separados.
        </p>

        <ul className="mt-6 space-y-2">
          {auth.memberships.map((membership) => (
            <li key={membership.id}>
              <form action={switchClubAction}>
                <input type="hidden" name="clubId" value={membership.clubId} />
                <button
                  type="submit"
                  className="flex w-full items-center gap-3 rounded-xl border border-ink-200 bg-white p-4 text-left transition-colors hover:border-brand-300 hover:bg-brand-50/30"
                >
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-ink-100 text-ink-600">
                    <Icon name="building" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-semibold text-ink-900">
                      {membership.clubName}
                    </span>
                    <span className="block text-xs text-ink-500">
                      {roleLabel(membership.role)}
                    </span>
                  </span>
                  <span className="shrink-0 text-sm text-brand-700">Entrar →</span>
                </button>
              </form>
            </li>
          ))}
        </ul>
      </main>
    </div>
  );
}
