import Link from "next/link";
import { redirect } from "next/navigation";
import { and, asc, eq, inArray, isNull } from "drizzle-orm";
import { db } from "@/db/client";
import { charges, paymentApplications, payments } from "@/db/schema";
import { allocateOldestFirst, chargeStatusFor } from "@/lib/billing";
import { formatMoney } from "@/lib/format";
import { Icon } from "@/components/ui/icon";

export const metadata = { title: "Mercado Pago · Checkout Seguro" };

type AllocatableRow = {
  id: string;
  dueDate: string;
  totalCents: number;
  paidCents: number;
};

async function confirmPayment(formData: FormData) {
  "use server";

  const paymentId = String(formData.get("paymentId") ?? "");
  const chargeId = String(formData.get("chargeId") ?? "");

  if (!paymentId) {
    redirect("/app/cuotas");
  }

  const [payment] = await db
    .select()
    .from(payments)
    .where(eq(payments.id, paymentId))
    .limit(1);

  if (!payment) {
    redirect("/app/cuotas");
  }

  // Si no está ya aprobado, lo aprobamos e imputamos
  if (payment.status !== "approved") {
    await db.transaction(async (tx) => {
      // Si vino con cuota específica, la buscamos primero
      let chargeRows: AllocatableRow[] = [];
      if (chargeId) {
        chargeRows = await tx
          .select({
            id: charges.id,
            dueDate: charges.dueDate,
            totalCents: charges.totalCents,
            paidCents: charges.paidCents,
          })
          .from(charges)
          .where(and(eq(charges.id, chargeId), isNull(charges.voidedAt)));
      }

      // Si no o además hay saldo, buscamos cuotas de la familia si tiene
      if (chargeRows.length === 0 && payment.familyId) {
        chargeRows = await tx
          .select({
            id: charges.id,
            dueDate: charges.dueDate,
            totalCents: charges.totalCents,
            paidCents: charges.paidCents,
          })
          .from(charges)
          .where(
            and(
              eq(charges.familyId, payment.familyId),
              inArray(charges.status, ["pending", "partial"]),
              isNull(charges.voidedAt),
            ),
          )
          .orderBy(asc(charges.dueDate));
      }

      const { applications, unappliedCents } = allocateOldestFirst(
        chargeRows.map((row) => ({
          id: row.id,
          dueDate: row.dueDate,
          totalCents: row.totalCents,
          paidCents: row.paidCents,
        })),
        payment.amountCents,
      );

      // Limpiamos aplicaciones preliminares si hubiera
      await tx
        .delete(paymentApplications)
        .where(eq(paymentApplications.paymentId, payment.id));

      for (const app of applications) {
        const ch = chargeRows.find((r) => r.id === app.chargeId);
        if (!ch) continue;
        const newPaid = ch.paidCents + app.amountCents;

        await tx.insert(paymentApplications).values({
          clubId: payment.clubId,
          paymentId: payment.id,
          chargeId: ch.id,
          amountCents: app.amountCents,
        });

        await tx
          .update(charges)
          .set({
            paidCents: newPaid,
            status: chargeStatusFor(ch.totalCents, newPaid),
            updatedAt: new Date(),
          })
          .where(eq(charges.id, ch.id));
      }

      await tx
        .update(payments)
        .set({
          status: "approved",
          reviewedAt: new Date(),
          creditCents: unappliedCents,
          updatedAt: new Date(),
        })
        .where(eq(payments.id, payment.id));
    });
  }

  redirect(`/app/pagos/${paymentId}/recibo?ok=Pago+procesado+exitosamente+con+Mercado+Pago`);
}

export default async function DemoCheckoutPage({
  searchParams,
}: {
  searchParams: Promise<{
    paymentId?: string;
    chargeId?: string;
    amountCents?: string;
    description?: string;
    prefId?: string;
  }>;
}) {
  const params = await searchParams;
  const amountCents = Number(params.amountCents ?? 0);
  const description = params.description || "Cuota Básquetbol C.A. Estudiantes";

  return (
    <div className="min-h-screen bg-[#f5f5f5] text-slate-800">
      {/* Header oficial estilo Mercado Pago */}
      <header className="border-b border-[#e6e6e6] bg-[#009ee3] px-4 py-3 text-white shadow-xs">
        <div className="mx-auto flex max-w-2xl items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="font-black text-xl tracking-tight text-white">mercado</span>
            <span className="font-light text-xl tracking-tight text-white">pago</span>
          </div>
          <div className="flex items-center gap-1.5 text-xs text-sky-100">
            <Icon name="check" size={14} />
            <span>Checkout Oficial Seguro</span>
          </div>
        </div>
      </header>

      {/* Banner de Modo Demo Informativo */}
      <div className="bg-amber-100 border-b border-amber-300 px-4 py-2 text-center text-xs text-amber-900 font-medium">
        ⚡ <strong>Entorno de Demostración Activo:</strong> Esta pantalla simula la pasarela de pagos integrada para el <strong>Club Atlético Estudiantes</strong>. Al hacer clic en pagar, el pago se aprueba y se emite el recibo oficial de forma inmediata.
      </div>

      <main className="mx-auto max-w-2xl p-4 sm:py-8">
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
          {/* Cabecera del comercio / Club */}
          <div className="border-b border-slate-100 bg-slate-50/70 p-4 sm:p-6 flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/escudo-estudiantes-centenario.jpg"
                alt="C.A. Estudiantes"
                className="h-12 w-12 rounded-full border border-slate-300 object-cover"
              />
              <div>
                <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide">
                  Pagás en
                </span>
                <h1 className="text-base font-bold text-slate-900">
                  Club Atlético Estudiantes (Mercedes)
                </h1>
                <p className="text-xs text-slate-500">Básquetbol Formativo y Superior</p>
              </div>
            </div>
            <div className="text-right">
              <span className="text-[11px] text-slate-500 block">Total a pagar</span>
              <span className="text-xl sm:text-2xl font-black text-[#009ee3] font-mono">
                {formatMoney(amountCents)}
              </span>
            </div>
          </div>

          {/* Detalle del Item */}
          <div className="p-4 sm:p-6 border-b border-slate-100">
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">
              Detalle del concepto
            </h2>
            <div className="flex items-center justify-between py-2 text-sm">
              <span className="font-medium text-slate-800">{description}</span>
              <span className="font-mono font-semibold text-slate-900">{formatMoney(amountCents)}</span>
            </div>
          </div>

          {/* Opciones de Pago */}
          <div className="p-4 sm:p-6 space-y-4">
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-400">
              ¿Cómo querés pagar?
            </h2>

            <div className="space-y-2.5">
              <label className="flex items-center justify-between p-3.5 rounded-lg border-2 border-[#009ee3] bg-sky-50/40 cursor-pointer">
                <div className="flex items-center gap-3">
                  <input
                    type="radio"
                    name="paymentMethod"
                    defaultChecked
                    className="h-4 w-4 text-[#009ee3] focus:ring-[#009ee3]"
                  />
                  <div>
                    <span className="block text-sm font-semibold text-slate-900">
                      Dinero en cuenta Mercado Pago
                    </span>
                    <span className="block text-xs text-slate-500">
                      Saldo disponible: $ 180.000,00 · Acreditación instantánea
                    </span>
                  </div>
                </div>
                <span className="rounded bg-sky-100 px-2 py-0.5 text-[10px] font-bold text-[#009ee3]">
                  Recomendado
                </span>
              </label>

              <label className="flex items-center justify-between p-3.5 rounded-lg border border-slate-200 hover:bg-slate-50 cursor-pointer">
                <div className="flex items-center gap-3">
                  <input
                    type="radio"
                    name="paymentMethod"
                    className="h-4 w-4 text-[#009ee3] focus:ring-[#009ee3]"
                  />
                  <div>
                    <span className="block text-sm font-medium text-slate-900">
                      Tarjeta de Débito (Visa Débito)
                    </span>
                    <span className="block text-xs text-slate-500">
                      Terminada en 4821
                    </span>
                  </div>
                </div>
              </label>

              <label className="flex items-center justify-between p-3.5 rounded-lg border border-slate-200 hover:bg-slate-50 cursor-pointer">
                <div className="flex items-center gap-3">
                  <input
                    type="radio"
                    name="paymentMethod"
                    className="h-4 w-4 text-[#009ee3] focus:ring-[#009ee3]"
                  />
                  <div>
                    <span className="block text-sm font-medium text-slate-900">
                      Transferencia bancaria directa (DEBIN / Alias)
                    </span>
                    <span className="block text-xs text-slate-500">
                      Acreditación en el momento
                    </span>
                  </div>
                </div>
              </label>
            </div>

            {/* Formulario de confirmación */}
            <form action={confirmPayment} className="pt-4">
              <input type="hidden" name="paymentId" value={params.paymentId ?? ""} />
              <input type="hidden" name="chargeId" value={params.chargeId ?? ""} />

              <button
                type="submit"
                className="w-full rounded-lg bg-[#009ee3] py-3 text-center text-sm font-bold text-white shadow-sm hover:bg-[#008ecb] transition active:scale-[0.99]"
              >
                Pagar {formatMoney(amountCents)} con Mercado Pago
              </button>
            </form>

            <div className="text-center pt-2">
              <Link
                href="/app/cuotas"
                className="text-xs text-slate-500 hover:text-slate-800 underline"
              >
                Cancelar y volver al club
              </Link>
            </div>
          </div>
        </div>

        {/* Footer seguridad */}
        <div className="mt-6 text-center text-xs text-slate-400 space-y-1">
          <p>Pagos procesados de forma segura con encriptación de 256 bits.</p>
          <p>© 2026 Mercado Pago - C.A. Estudiantes de Mercedes (BA)</p>
        </div>
      </main>
    </div>
  );
}
