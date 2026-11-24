import Link from "next/link";
import { logoutAction } from "@/app/actions/auth";
import { Icon } from "@/components/ui/icon";

export const metadata = { title: "Club suspendido" };

export default function ClubSuspendidoPage() {
  return (
    <div className="flex min-h-screen flex-col bg-ink-50">
      <header className="border-b border-ink-200 bg-white">
        <div className="mx-auto flex h-14 max-w-3xl items-center">
          <Link href="/" className="flex items-center gap-2.5">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-brand-400 to-brand-700 text-xs font-bold text-white">
              CM
            </span>
            <span className="text-sm font-semibold text-ink-900">ClubManager</span>
          </Link>
        </div>
      </header>

      <main className="mx-auto w-full max-w-lg flex-1 px-4 py-16">
        <div className="rounded-2xl border border-ink-200 bg-white p-6 text-center sm:p-8">
          <span className="mx-auto flex h-11 w-11 items-center justify-center rounded-full bg-rose-50 text-rose-700">
            <Icon name="lock" size={20} />
          </span>
          <h1 className="mt-4 text-lg font-semibold text-ink-900">
            El acceso del club está suspendido
          </h1>
          <p className="mt-2 text-sm leading-relaxed text-ink-600">
            Por el estado de la suscripción o por una decisión administrativa, el
            acceso a los datos del club está temporalmente deshabilitado.
          </p>
          <p className="mt-2 text-sm text-ink-600">
            Contactá al administrador del club o a soporte para regularizar la
            situación. Los datos no se eliminan.
          </p>
          <form action={logoutAction} className="mt-6">
            <button
              type="submit"
              className="flex h-9 w-full items-center justify-center rounded-lg bg-ink-900 px-4 text-sm font-medium text-white hover:bg-ink-800"
            >
              Cerrar sesión
            </button>
          </form>
        </div>
      </main>
    </div>
  );
}
