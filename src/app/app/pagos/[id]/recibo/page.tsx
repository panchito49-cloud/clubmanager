import Link from "next/link";
import { notFound } from "next/navigation";
import { NoAccess, Flash } from "@/components/ui/page";
import { Icon } from "@/components/ui/icon";
import { PrintButton } from "@/components/app/print-button";
import { formatDate, formatDateTime, formatMoney } from "@/lib/format";
import { paymentMethodLabel } from "@/lib/status";
import { can, getTenant } from "@/server/tenant";
import { getPayment } from "@/server/data/finance";

export const metadata = { title: "Recibo Oficial de Pago" };

export default async function PaymentReceiptPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ ok?: string }>;
}) {
  const ctx = await getTenant();
  if (!can(ctx, "fees.view")) return <NoAccess />;

  const { id } = await params;
  const { ok } = await searchParams;
  const data = await getPayment(ctx, id);
  if (!data) notFound();

  const { payment, applications } = data;
  const receiptNumber = `REC-2026-${payment.id.slice(0, 8).toUpperCase()}`;
  const totalImputed = applications.reduce((sum, app) => sum + app.amountCents, 0);

  // Generamos enlace de WhatsApp si hay teléfono o familia
  const shareMessage = encodeURIComponent(
    `Hola! Adjuntamos el Recibo Oficial ${receiptNumber} del Club Atlético Estudiantes de Mercedes por el importe de ${formatMoney(
      payment.amountCents,
    )} correspondiente a las cuotas del básquetbol formativo. ¡Muchas gracias por el compromiso con el club!`,
  );

  const verificationUrl = `https://estudiantesmercedes.clubmanager.app/recibo/${payment.id}`;
  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=140x140&margin=0&data=${encodeURIComponent(
    verificationUrl,
  )}`;

  return (
    <div className="mx-auto max-w-4xl py-6 px-4">
      {/* Botones de acción (ocultos al imprimir) */}
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3 print:hidden">
        <Link
          href={`/app/pagos/${payment.id}`}
          className="inline-flex items-center gap-1.5 text-sm font-medium text-ink-600 hover:text-ink-900"
        >
          <Icon name="arrow-left" size={16} /> Volver al pago
        </Link>
        <div className="flex flex-wrap items-center gap-2">
          <a
            href={`https://wa.me/?text=${shareMessage}`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-medium text-white shadow-xs hover:bg-emerald-700 transition"
          >
            <Icon name="phone" size={14} /> Enviar por WhatsApp
          </a>
          <PrintButton />
        </div>
      </div>

      <Flash ok={ok} />

      {/* Recibo Oficial - Tarjeta imprimible A4 */}
      <div className="rounded-xl border border-ink-200 bg-white p-6 shadow-sm sm:p-10 text-ink-900 print:border-none print:shadow-none print:p-0">
        {/* Cabecera Institucional */}
        <div className="border-b-2 border-brand-800 pb-5">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex items-center gap-3">
              {/* Escudo del club */}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/escudo-estudiantes-centenario.jpg"
                alt="Escudo C.A. Estudiantes"
                className="h-16 w-16 rounded-full object-cover border border-brand-800 shadow-xs"
              />
              <div>
                <span className="text-xs font-bold tracking-widest text-brand-700 uppercase">
                  Fundado el 27 de Mayo de 1926 · Centenario 1926-2026
                </span>
                <h1 className="text-xl sm:text-2xl font-black uppercase tracking-tight text-ink-950 font-serif">
                  Club Atlético Estudiantes
                </h1>
                <p className="text-xs text-ink-600">
                  Subcomisión de Básquetbol · Mercedes (Pcia. de Buenos Aires)
                </p>
                <p className="text-[11px] text-ink-400">
                  Sede: Calle 33 N° 334 · Personería Jurídica N° 24.119 · CUIT: 30-58291044-8
                </p>
              </div>
            </div>

            {/* Recuadro de número de recibo */}
            <div className="rounded-lg border border-brand-700 bg-brand-50/50 p-3 text-right shrink-0">
              <span className="block text-[10px] font-bold uppercase tracking-wider text-brand-800">
                Constancia de Cobro Oficial
              </span>
              <span className="block text-lg font-mono font-black text-brand-900">
                {receiptNumber}
              </span>
              <span className="block text-xs text-ink-600 mt-0.5">
                Fecha: {formatDate(payment.reviewedAt ? payment.reviewedAt.toISOString().slice(0, 10) : payment.createdAt.toISOString().slice(0, 10))}
              </span>
            </div>
          </div>
        </div>

        {/* Datos Principales del Pago */}
        <div className="my-6 grid gap-4 rounded-lg bg-ink-50 p-4 sm:grid-cols-2 text-xs">
          <div>
            <span className="block text-[11px] font-semibold text-ink-500 uppercase">Recibimos de</span>
            <span className="block text-sm font-bold text-ink-900 mt-0.5">
              {payment.payerName || payment.familyName || "Socio / Tutor"}
            </span>
            {payment.familyName && payment.familyName !== payment.payerName ? (
              <span className="block text-ink-600 mt-0.5">Familia: {payment.familyName}</span>
            ) : null}
          </div>
          <div>
            <span className="block text-[11px] font-semibold text-ink-500 uppercase">Medio de Pago</span>
            <div className="flex items-center gap-2 mt-0.5">
              <span className="font-semibold text-ink-900">
                {paymentMethodLabel[payment.method]}
              </span>
              {payment.reference ? (
                <span className="rounded bg-white px-1.5 py-0.5 text-[10px] font-mono border border-ink-200">
                  Op: {payment.reference}
                </span>
              ) : null}
            </div>
          </div>
          <div className="sm:col-span-2 pt-2 border-t border-ink-200/60 flex flex-wrap items-baseline justify-between gap-2">
            <div>
              <span className="text-[11px] font-semibold text-ink-500 uppercase">La suma total de:</span>
              <p className="text-base sm:text-lg font-black text-brand-900 mt-0.5">
                {formatMoney(payment.amountCents)}
              </p>
            </div>
            {payment.creditCents > 0 ? (
              <div className="rounded bg-amber-50 border border-amber-200 px-2.5 py-1 text-right">
                <span className="text-[10px] text-amber-700 font-semibold block uppercase">Saldo a Favor</span>
                <span className="text-xs font-bold text-amber-900">{formatMoney(payment.creditCents)}</span>
              </div>
            ) : null}
          </div>
        </div>

        {/* Detalle de Imputación de Cuotas */}
        <div className="my-6">
          <h2 className="text-xs font-bold uppercase tracking-wider text-ink-600 mb-2">
            Conceptos Imputados
          </h2>
          {applications.length === 0 ? (
            <p className="rounded border border-dashed border-ink-200 p-4 text-center text-xs text-ink-500">
              Pago registrado a cuenta de futuras obligaciones o saldo general.
            </p>
          ) : (
            <div className="overflow-hidden rounded-lg border border-ink-200">
              <table className="w-full text-left text-xs">
                <thead className="bg-ink-100 text-[11px] uppercase text-ink-700 font-semibold">
                  <tr>
                    <th className="py-2 px-3">Concepto / Cuota</th>
                    <th className="py-2 px-3">Período</th>
                    <th className="py-2 px-3">Vencimiento Original</th>
                    <th className="py-2 px-3 text-right">Importe Imputado</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-ink-100 font-normal">
                  {applications.map((app) => (
                    <tr key={app.id}>
                      <td className="py-2 px-3 font-medium text-ink-900">{app.concept}</td>
                      <td className="py-2 px-3 text-ink-600">{app.period}</td>
                      <td className="py-2 px-3 text-ink-600">{formatDate(app.dueDate)}</td>
                      <td className="py-2 px-3 text-right font-mono font-medium text-ink-900">
                        {formatMoney(app.amountCents)}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot className="bg-ink-50 font-bold border-t border-ink-200">
                  <tr>
                    <td colSpan={3} className="py-2.5 px-3 text-right uppercase text-[11px] text-ink-600">
                      Total Imputado:
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono text-ink-900">
                      {formatMoney(totalImputed)}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          )}
        </div>

        {/* Notas y Observaciones */}
        {payment.notes ? (
          <div className="mb-6 rounded border border-ink-100 bg-white p-3 text-xs text-ink-600">
            <span className="font-semibold text-ink-700">Observaciones: </span>
            {payment.notes}
          </div>
        ) : null}

        {/* Pie con QR, Firmas y Validez Institucional */}
        <div className="mt-8 pt-6 border-t border-ink-200 grid sm:grid-cols-3 gap-6 items-center">
          {/* QR de verificación */}
          <div className="flex items-center gap-3">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={qrUrl}
              alt="QR Verificación"
              className="h-20 w-20 rounded border border-ink-200 p-0.5 shrink-0"
            />
            <div className="text-[10px] text-ink-500 leading-tight">
              <span className="font-bold text-ink-700 block">Comprobante Oficial</span>
              Escaneá el código para verificar la autenticidad en la plataforma del club.
            </div>
          </div>

          {/* Sello de Cobranza */}
          <div className="text-center">
            <div className="inline-block rounded-full border-2 border-dashed border-emerald-600 px-4 py-1.5 text-[11px] font-black uppercase tracking-wider text-emerald-700 rotate-[-4deg]">
              ✓ Cobrado y Acreditado
            </div>
            <span className="block text-[10px] text-ink-400 mt-1">
              Emitido: {formatDateTime(payment.reviewedAt ?? payment.createdAt)}
            </span>
          </div>

          {/* Firma de Tesorería */}
          <div className="text-right">
            <div className="inline-block border-t border-ink-400 pt-1 text-center min-w-[160px]">
              <span className="block text-xs font-semibold text-ink-900">
                {payment.reviewedByName || payment.declaredByName || "Tesorería"}
              </span>
              <span className="block text-[10px] text-ink-500">
                Subcomisión de Básquetbol
              </span>
              <span className="block text-[9px] text-ink-400">
                Club Atlético Estudiantes
              </span>
            </div>
          </div>
        </div>

        {/* Franja Centenario al pie */}
        <div className="mt-8 pt-3 border-t border-ink-100 flex items-center justify-between text-[10px] text-ink-400">
          <span>ClubManager · Software de Gestión Deportiva</span>
          <span>1926 — 2026 · 100 Años de Pasión y Deporte en Mercedes</span>
        </div>
      </div>
    </div>
  );
}
