import Link from "next/link";
import { redirect } from "next/navigation";
import { logoutAction } from "@/app/actions/auth";
import { getAuth } from "@/server/auth";
import { Icon } from "@/components/ui/icon";

export const dynamic = "force-dynamic";
export const metadata = { title: "Sin club asignado" };

export default async function SinClubPage() {
  const auth = await getAuth();
  if (!auth) redirect("/login");

  return (
    <div className="flex min-h-screen flex-col bg-ink-50">
      <header className="border-b border-ink-200 bg-white">
        <div className="mx-auto flex h-14 max-w-3xl items-center justify-between px-4">
          <Link href="/" className="flex items-center gap-2.5">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-brand-400 to-brand-700 text-xs font-bold text-white">
              CM
            </span>
            <span className="text-sm font-semibold text-ink-900">ClubManager</span>
          </Link>
          <form action={logoutAction}>
            <button type="submit" className="flex items-center gap-1.5 text-xs text-ink-500 hover:text-ink-800">
              <Icon name="logout" size={14} /> Cerrar sesión
            </button>
          </form>
        </div>
      </header>

      <main className="mx-auto w-full max-w-lg flex-1 px-4 py-16">
        <div className="rounded-2xl border border-ink-200 bg-white p-6 text-center sm:p-8">
          <span className="mx-auto flex h-11 w-11 items-center justify-center rounded-full bg-amber-50 text-amber-700">
            <Icon name="building" size={20} />
          </span>
          <h1 className="mt-4 text-lg font-semibold text-ink-900">
            Tu usuario no tiene un club activo
          </h1>
          <p className="mt-2 text-sm leading-relaxed text-ink-600">
            Tu cuenta existe ({auth.user.email}) pero todavía no estás asociado a
            ningún club, o tu membresía fue desactivada.
          </p>
          <p className="mt-2 text-sm text-ink-600">
            Pedile al administrador del club que te invite o reactive tu acceso.
          </p>
          <form action={logoutAction} className="mt-6">
            <button
              type="submit"
              className="flex h-9 w-full items-center justify-center rounded-lg bg-brand-600 px-4 text-sm font-medium text-white hover:bg-brand-700"
            >
              Cerrar sesión
            </button>
          </form>
        </div>
      </main>
    </div>
  );
}
