import Link from "next/link";
import { Icon } from "@/components/ui/icon";

export const metadata = { title: "Recuperar contraseña" };

export default function RecuperarPage() {
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
        <div className="w-full max-w-md rounded-2xl border border-ink-200 bg-white p-6 shadow-sm sm:p-8">
          <span className="flex h-10 w-10 items-center justify-center rounded-full bg-brand-50 text-brand-700">
            <Icon name="lock" size={19} />
          </span>
          <h1 className="mt-4 text-lg font-semibold tracking-tight text-ink-900">
            Recuperar contraseña
          </h1>
          <p className="mt-2 text-sm leading-relaxed text-ink-600">
            Esta instalación no envía correos automáticos, así que la
            recuperación la gestiona el club para evitar suplantaciones.
          </p>

          <ol className="mt-4 space-y-2.5 text-sm text-ink-600">
            <li className="flex gap-2">
              <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-ink-100 text-[11px] font-semibold text-ink-700">
                1
              </span>
              Escribile al administrador del club pidiendo el restablecimiento.
            </li>
            <li className="flex gap-2">
              <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-ink-100 text-[11px] font-semibold text-ink-700">
                2
              </span>
              El administrador genera un enlace de un solo uso, válido por una
              hora.
            </li>
            <li className="flex gap-2">
              <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-ink-100 text-[11px] font-semibold text-ink-700">
                3
              </span>
              Abrí el enlace y definí tu nueva contraseña.
            </li>
          </ol>

          <div className="mt-6 rounded-lg bg-amber-50 p-3 text-xs leading-relaxed text-amber-900 ring-1 ring-inset ring-amber-200">
            Nunca compartas tu contraseña por WhatsApp ni por correo. El club
            solo debería enviarte un enlace, no pedirte la clave.
          </div>

          <Link
            href="/login"
            className="mt-6 flex h-9 items-center justify-center rounded-lg bg-brand-600 px-4 text-sm font-medium text-white hover:bg-brand-700"
          >
            Volver al ingreso
          </Link>
        </div>
      </main>
    </div>
  );
}
