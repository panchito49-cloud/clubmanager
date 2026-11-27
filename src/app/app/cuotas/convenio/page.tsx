import Link from "next/link";
import { notFound } from "next/navigation";
import { NoAccess, Flash } from "@/components/ui/page";
import { Icon } from "@/components/ui/icon";
import { PrintButton } from "@/components/app/print-button";
import { formatDate, formatDateTime, formatMoney, todayISO } from "@/lib/format";
import { can, getTenant } from "@/server/tenant";
import { getFamily } from "@/server/data/people";

export const metadata = { title: "Convenio de Regularización y Plan de Pagos" };

export default async function PaymentPlanAgreementPage({
  searchParams,
}: {
  searchParams: Promise<{
    familia?: string;
    cuotas?: string;
    total?: string;
    original?: string;
    quita?: string;
    ok?: string;
  }>;
}) {
  const ctx = await getTenant();
  if (!can(ctx, "fees.view")) return <NoAccess />;

  const params = await searchParams;
  const familyId = params.familia;
  if (!familyId) notFound();

  const data = await getFamily(ctx, familyId);
  if (!data) notFound();

  const { family } = data;
  const installments = Number(params.cuotas || 3);
  const financedCents = Number(params.total || 0);
  const originalDebtCents = Number(params.original || financedCents);
  const discountPct = Number(params.quita || 0);

  const agreementNumber = `CONV-2026-${family.id.slice(0, 6).toUpperCase()}`;

  const shareMessage = encodeURIComponent(
    `Hola! Le compartimos el Convenio de Pago N° ${agreementNumber} del Club Atlético Estudiantes de Mercedes por la refinanciación de las cuotas en ${installments} pagos de ${formatMoney(
      Math.floor(financedCents / installments),
    )}. Con este acuerdo los deportistas continúan habilitados. ¡Muchas gracias!`,
  );

  return (
    <div className="mx-auto max-w-4xl py-6 px-4">
      {/* Botones de acción (ocultos al imprimir) */}
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3 print:hidden">
        <Link
          href="/app/cuotas"
          className="inline-flex items-center gap-1.5 text-sm font-medium text-ink-600 hover:text-ink-900"
        >
          <Icon name="arrow-left" size={16} /> Volver a Cuotas
        </Link>
        <div className="flex flex-wrap items-center gap-2">
          <a
            href={`https://wa.me/?text=${shareMessage}`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-medium text-white shadow-xs hover:bg-emerald-700 transition"
          >
            <Icon name="phone" size={14} /> Enviar Convenio por WhatsApp
          </a>
          <PrintButton />
        </div>
      </div>

      <Flash ok={params.ok} />

      {/* Documento Imprimible del Convenio */}
      <div className="rounded-xl border border-ink-200 bg-white p-6 shadow-sm sm:p-10 text-ink-900 print:border-none print:shadow-none print:p-0">
        {/* Cabecera Oficial */}
        <div className="border-b-2 border-brand-800 pb-5">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex items-center gap-3">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/escudo-estudiantes-centenario.jpg"
                alt="Escudo C.A. Estudiantes"
                className="h-16 w-16 rounded-full object-cover border border-brand-800 shadow-xs"
              />
              <div>
                <span className="text-xs font-bold tracking-widest text-brand-700 uppercase">
                  Club Atlético Estudiantes · Centenario 1926-2026
                </span>
                <h1 className="text-xl sm:text-2xl font-black uppercase tracking-tight text-ink-950 font-serif">
                  Convenio de Regularización y Facilidades
                </h1>
                <p className="text-xs text-ink-600">
                  Subcomisión de Básquetbol · Mercedes (Provincia de Buenos Aires)
                </p>
              </div>
            </div>

            <div className="rounded-lg border border-brand-700 bg-brand-50/50 p-3 text-right shrink-0">
              <span className="block text-[10px] font-bold uppercase tracking-wider text-brand-800">
                Acuerdo Institucional N°
              </span>
              <span className="block text-lg font-mono font-black text-brand-900">
                {agreementNumber}
              </span>
              <span className="block text-xs text-ink-600 mt-0.5">
                Fecha: {formatDate(todayISO())}
              </span>
            </div>
          </div>
        </div>

        {/* Partes Intervinientes */}
        <div className="my-6 rounded-lg bg-ink-50 p-4 text-xs space-y-2">
          <p>
            Entre el <strong>CLUB ATLÉTICO ESTUDIANTES DE MERCEDES</strong>, representado por su Subcomisión de Básquetbol y Tesorería, y por la otra parte el/la tutor/a responsable de la <strong>{family.name}</strong>, Sr/a. <strong>{family.contactName || "Tutor Responsable"}</strong> (Teléfono: {family.contactPhone || "Registrado en legajo"}), convienen celebrar el presente Acuerdo de Facilidades de Pago con arreglo a las siguientes cláusulas:
          </p>
        </div>

        {/* Cláusulas del Convenio */}
        <div className="space-y-4 text-xs text-ink-800 leading-relaxed">
          <div>
            <h3 className="font-bold text-ink-950 uppercase text-[11px] tracking-wide">
              PRIMERA — Reconocimiento de Deuda Consolidada
            </h3>
            <p className="mt-1">
              La Familia reconoce adeudar a la fecha al Club la suma de{" "}
              <strong>{formatMoney(originalDebtCents)}</strong> en concepto de cuotas sociales y deportivas impagas con morosidad mayor a 90 días.
            </p>
          </div>

          <div>
            <h3 className="font-bold text-ink-950 uppercase text-[11px] tracking-wide">
              SEGUNDA — Bonificación y Financiación Acordada
            </h3>
            <p className="mt-1">
              En carácter de fomento deportivo y regularización comunitaria, el Club concede una bonificación extraordinaria del{" "}
              <strong>{discountPct}%</strong> (-{formatMoney(originalDebtCents - financedCents)}), fijando el monto neto total de regularización en{" "}
              <strong className="text-brand-900 font-mono text-sm">{formatMoney(financedCents)}</strong>, a abonarse en{" "}
              <strong>{installments} cuotas mensuales y consecutivas</strong>.
            </p>
          </div>

          <div>
            <h3 className="font-bold text-ink-950 uppercase text-[11px] tracking-wide">
              TERCERA — Cronograma de Pagos y Vencimientos
            </h3>
            <p className="mt-1">
              Las cuotas del plan han quedado devengadas en el sistema de autogestión ClubManager del club. El pago podrá efectuarse mediante efectivo en tesorería, transferencia bancaria institucional o la plataforma digital de Mercado Pago.
            </p>
          </div>

          <div>
            <h3 className="font-bold text-ink-950 uppercase text-[11px] tracking-wide">
              CUARTA — Mantenimiento de Habilitación Deportiva
            </h3>
            <p className="mt-1">
              La suscripción de este convenio y el pago de la primera cuota otorga la <strong>habilitación federativa y médica inmediata</strong> de los deportistas de la familia para participar en entrenamientos y partidos oficiales de la liga.
            </p>
          </div>
        </div>

        {/* Firmas y Sellos */}
        <div className="mt-12 pt-8 border-t border-ink-200 grid sm:grid-cols-2 gap-8 text-center text-xs">
          <div>
            <div className="border-t border-ink-400 pt-2 mx-auto max-w-[220px]">
              <span className="font-bold text-ink-900 block">{family.contactName || family.name}</span>
              <span className="text-ink-500 text-[11px] block">Firma del Tutor / Responsable</span>
              <span className="text-ink-400 text-[10px] block">DNI: _______________________</span>
            </div>
          </div>
          <div>
            <div className="border-t border-ink-400 pt-2 mx-auto max-w-[220px]">
              <span className="font-bold text-ink-900 block">Tesorería / Presidencia</span>
              <span className="text-ink-500 text-[11px] block">Subcomisión de Básquetbol</span>
              <span className="text-ink-400 text-[10px] block">Club Atlético Estudiantes</span>
            </div>
          </div>
        </div>

        <div className="mt-8 pt-4 border-t border-ink-100 flex items-center justify-between text-[10px] text-ink-400">
          <span>ClubManager · Módulo de Inteligencia de Cobranzas</span>
          <span>1926 — 2026 · Centenario Club Atlético Estudiantes de Mercedes</span>
        </div>
      </div>
    </div>
  );
}
