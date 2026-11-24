import Link from "next/link";
import { createHash } from "node:crypto";
import { and, eq, gt, isNull } from "drizzle-orm";
import { db } from "@/db/client";
import { passwordResetTokens } from "@/db/schema";
import { ResetForm } from "./reset-form";

export const dynamic = "force-dynamic";
export const metadata = { title: "Restablecer contraseña" };

export default async function RestablecerPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const tokenHash = createHash("sha256").update(token).digest("hex");

  const [row] = await db
    .select({ id: passwordResetTokens.id })
    .from(passwordResetTokens)
    .where(
      and(
        eq(passwordResetTokens.tokenHash, tokenHash),
        gt(passwordResetTokens.expiresAt, new Date()),
        isNull(passwordResetTokens.usedAt),
      ),
    )
    .limit(1);

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
          <h1 className="text-lg font-semibold tracking-tight text-ink-900">
            Restablecer contraseña
          </h1>

          {row ? (
            <>
              <p className="mt-1 text-sm text-ink-500">
                Elegí una contraseña nueva para tu cuenta.
              </p>
              <div className="mt-5">
                <ResetForm token={token} />
              </div>
            </>
          ) : (
            <>
              <p className="mt-2 text-sm leading-relaxed text-ink-600">
                Este enlace no es válido, ya se usó o venció. Los enlaces duran
                una hora.
              </p>
              <Link
                href="/recuperar"
                className="mt-5 flex h-9 items-center justify-center rounded-lg bg-brand-600 px-4 text-sm font-medium text-white hover:bg-brand-700"
              >
                Ver cómo pedir uno nuevo
              </Link>
            </>
          )}
        </div>
      </main>
    </div>
  );
}
