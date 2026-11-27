"use client";

import { useState } from "react";
import Link from "next/link";
import { formatMoney, formatDate, formatDateTime } from "@/lib/format";
import { Icon } from "@/components/ui/icon";
import { PayButton } from "@/components/payments/pay-button";
import { paymentMethodLabel } from "@/lib/status";
import { VenueMapCard } from "@/components/sports/venue-map-card";
import { HOME_VENUE } from "@/lib/venues";
import type { GuardianPortalData } from "@/server/data/portal";

export function GuardianPortal({
  data,
  clubId,
  clubName = "Club Atlético Estudiantes",
}: {
  data: GuardianPortalData;
  clubId: string;
  clubName?: string;
}) {
  const [activeTab, setActiveTab] = useState<"players" | "finances" | "schedule" | "contact">(
    "players",
  );

  const { family, children, pendingCharges, recentPayments, totalDebtCents, upcomingEvents } = data;
  const isUpToDate = totalDebtCents === 0;

  return (
    <div className="mx-auto max-w-5xl space-y-5 pb-12">
      {/* Cabecera Familiar Mobile-First */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-ink-950 via-ink-900 to-brand-950 p-5 sm:p-7 text-white shadow-md">
        <div className="relative z-10 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-3.5">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/escudo-estudiantes-centenario.jpg"
              alt="Escudo C.A. Estudiantes"
              className="h-14 w-14 rounded-full border-2 border-red-500 object-cover shadow-sm shrink-0"
            />
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-bold tracking-widest text-red-400 uppercase">
                  {clubName} · Básquetbol
                </span>
                <span className="hidden sm:inline-block rounded-full bg-white/10 px-2 py-0.5 text-[10px] text-red-200">
                  Centenario 1926-2026
                </span>
              </div>
              <h1 className="text-xl sm:text-2xl font-black tracking-tight text-white">
                {family.name}
              </h1>
              <p className="text-xs text-ink-300">
                Tutor a cargo: <strong className="text-white">{family.contactName || "Responsable"}</strong>
              </p>
            </div>
          </div>

          {/* Estado de Cuenta Resumen */}
          <div className="rounded-xl bg-white/10 backdrop-blur-xs border border-white/15 p-3.5 sm:text-right shrink-0">
            <span className="block text-[11px] font-semibold text-ink-300 uppercase">
              Estado de Cuenta
            </span>
            {isUpToDate ? (
              <div className="flex items-center sm:justify-end gap-1.5 mt-0.5">
                <span className="inline-block h-2 w-2 rounded-full bg-emerald-400" />
                <span className="text-sm font-bold text-emerald-300">Al día · Sin deuda</span>
              </div>
            ) : (
              <div>
                <span className="text-xl font-black text-amber-300 font-mono block">
                  {formatMoney(totalDebtCents)}
                </span>
                <span className="text-[10px] text-amber-200/80 block">
                  {pendingCharges.length} cuota(s) pendiente(s)
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Acceso rápido a pago si hay saldo */}
        {!isUpToDate ? (
          <div className="mt-4 pt-4 border-t border-white/10 flex flex-wrap items-center justify-between gap-3">
            <span className="text-xs text-ink-200">
              Podés cancelar el saldo total de la familia en un solo clic:
            </span>
            <div className="flex flex-wrap items-center gap-2">
              <PayButton
                clubId={clubId}
                amountCents={totalDebtCents}
                description={`Cuotas Básquetbol C.A. Estudiantes - ${family.name}`}
                className="py-1.5 px-3 bg-[#009ee3] hover:bg-[#008ecb] text-white font-bold"
              />
              <Link
                href="/app/cuotas/declarar"
                className="inline-flex items-center gap-1 rounded-lg bg-white/15 px-3 py-1.5 text-xs font-semibold text-white hover:bg-white/20 transition"
              >
                <Icon name="receipt" size={13} /> Declarar transferencia
              </Link>
            </div>
          </div>
        ) : null}
      </div>

      {/* Selector de Pestañas Mobile & Desktop */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 border-b border-ink-200">
        <button
          onClick={() => setActiveTab("players")}
          className={`flex items-center gap-2 whitespace-nowrap rounded-lg px-3.5 py-2 text-xs font-bold transition ${
            activeTab === "players"
              ? "bg-brand-700 text-white shadow-xs"
              : "text-ink-600 hover:bg-ink-100"
          }`}
        >
          <Icon name="users" size={15} />
          Mis Hijos & Carnets ({children.length})
        </button>

        <button
          onClick={() => setActiveTab("finances")}
          className={`flex items-center gap-2 whitespace-nowrap rounded-lg px-3.5 py-2 text-xs font-bold transition ${
            activeTab === "finances"
              ? "bg-brand-700 text-white shadow-xs"
              : "text-ink-600 hover:bg-ink-100"
          }`}
        >
          <Icon name="wallet" size={15} />
          Cuotas y Pagos
          {!isUpToDate ? (
            <span className="rounded-full bg-amber-400 text-ink-950 px-1.5 py-0.2 text-[10px] font-black">
              {pendingCharges.length}
            </span>
          ) : null}
        </button>

        <button
          onClick={() => setActiveTab("schedule")}
          className={`flex items-center gap-2 whitespace-nowrap rounded-lg px-3.5 py-2 text-xs font-bold transition ${
            activeTab === "schedule"
              ? "bg-brand-700 text-white shadow-xs"
              : "text-ink-600 hover:bg-ink-100"
          }`}
        >
          <Icon name="calendar" size={15} />
          Partidos y Entrenamientos
        </button>

        <button
          onClick={() => setActiveTab("contact")}
          className={`flex items-center gap-2 whitespace-nowrap rounded-lg px-3.5 py-2 text-xs font-bold transition ${
            activeTab === "contact"
              ? "bg-brand-700 text-white shadow-xs"
              : "text-ink-600 hover:bg-ink-100"
          }`}
        >
          <Icon name="phone" size={15} />
          Contacto del Club
        </button>
      </div>

      {/* PESTAÑA 1: MIS HIJOS & CARNETS DIGITALES */}
      {activeTab === "players" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-ink-900 uppercase tracking-wide">
              Deportistas Federados en el Club
            </h2>
            <span className="text-xs text-ink-500">Temporada Centenario 2026</span>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            {children.map((child) => (
              <div
                key={child.id}
                className="overflow-hidden rounded-xl border border-ink-200 bg-white shadow-xs hover:shadow-sm transition"
              >
                {/* Cabecera Credencial */}
                <div className="bg-gradient-to-r from-ink-950 to-brand-950 p-4 text-white flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-brand-700 text-white font-black text-lg border-2 border-white/20">
                      {child.jerseyNumber ? `#${child.jerseyNumber}` : child.firstName[0]}
                    </div>
                    <div>
                      <span className="block text-sm font-black text-white">
                        {child.firstName} {child.lastName}
                      </span>
                      <span className="block text-xs font-medium text-red-300">
                        {child.categoryName ?? "Categoría Básquet"}
                        {child.position ? ` · ${child.position}` : ""}
                      </span>
                    </div>
                  </div>
                  {child.isEligible ? (
                    <span className="rounded-full bg-emerald-500/20 border border-emerald-400 text-emerald-300 px-2 py-0.5 text-[10px] font-bold">
                      ✓ HABILITADO
                    </span>
                  ) : (
                    <span className="rounded-full bg-rose-500/20 border border-rose-400 text-rose-300 px-2 py-0.5 text-[10px] font-bold">
                      ⚠ NO HABILITADO
                    </span>
                  )}
                </div>

                {/* Datos del Jugador */}
                <div className="p-4 space-y-3 text-xs">
                  <div className="grid grid-cols-2 gap-2 text-ink-600">
                    <div>
                      <span className="block text-[10px] text-ink-400 uppercase font-semibold">DNI</span>
                      <span className="font-semibold text-ink-900">{child.dni || "—"}</span>
                    </div>
                    <div>
                      <span className="block text-[10px] text-ink-400 uppercase font-semibold">Nacimiento</span>
                      <span className="font-semibold text-ink-900">{formatDate(child.birthDate)}</span>
                    </div>
                  </div>

                  {/* Semáforo Apto Médico */}
                  <div className="rounded-lg border border-ink-100 bg-ink-50 p-2.5 flex items-center justify-between gap-2">
                    <div>
                      <span className="block text-[10px] font-bold uppercase text-ink-500">
                        Apto Médico (EMDAP)
                      </span>
                      <span className="text-[11px] text-ink-700 block">
                        {child.medicalInfo.description}
                      </span>
                    </div>
                    <span
                      className={`rounded px-2 py-0.5 text-[10px] font-bold shrink-0 border ${child.medicalInfo.badgeClass}`}
                    >
                      {child.medicalInfo.label}
                    </span>
                  </div>

                  {/* Botón Ver Carnet Digital con QR */}
                  <div className="pt-2">
                    <Link
                      href={`/app/jugadores/${child.id}/carnet`}
                      className="w-full flex items-center justify-center gap-2 rounded-lg bg-brand-700 py-2.5 px-3 text-xs font-bold text-white shadow-xs hover:bg-brand-800 transition"
                    >
                      <Icon name="shield" size={14} />
                      Ver Carnet Digital Oficial (QR)
                    </Link>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* PESTAÑA 2: CUOTAS Y PAGOS */}
      {activeTab === "finances" && (
        <div className="space-y-6">
          {/* Obligaciones pendientes */}
          <div className="rounded-xl border border-ink-200 bg-white p-5 shadow-xs">
            <h3 className="text-sm font-bold text-ink-900 uppercase tracking-wide mb-3">
              Obligaciones y Cuotas a Abonar
            </h3>

            {pendingCharges.length === 0 ? (
              <div className="rounded-lg border border-dashed border-ink-200 p-8 text-center text-xs text-ink-500">
                <span className="block text-2xl mb-1">🎉</span>
                <span className="font-bold text-ink-800 text-sm block">¡Excelente! La familia está al día</span>
                No tenés cuotas pendientes de pago. Cuando el club emita las próximas cuotas aparecerán acá.
              </div>
            ) : (
              <div className="divide-y divide-ink-100">
                {pendingCharges.map((ch) => (
                  <div
                    key={ch.id}
                    className="py-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-ink-900 text-sm">{ch.concept}</span>
                        <span className="rounded bg-ink-100 px-1.5 py-0.5 text-[10px] text-ink-600 font-mono">
                          {ch.period}
                        </span>
                        {ch.isOverdue ? (
                          <span className="rounded bg-rose-100 px-1.5 py-0.2 text-[10px] font-bold text-rose-800">
                            Vencida ({ch.daysOverdue}d)
                          </span>
                        ) : null}
                      </div>
                      <span className="text-xs text-ink-500 block mt-0.5">
                        {ch.playerName ? `Jugador: ${ch.playerName} · ` : ""}
                        Vence: {formatDate(ch.dueDate)}
                      </span>
                    </div>

                    <div className="flex items-center justify-between sm:justify-end gap-3">
                      <span className="font-mono font-black text-ink-900 text-base">
                        {formatMoney(ch.balanceCents)}
                      </span>
                      <PayButton
                        clubId={clubId}
                        chargeId={ch.id}
                        amountCents={ch.balanceCents}
                        description={`${ch.concept} (${ch.period}) - ${ch.playerName || family.name}`}
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Historial de Comprobantes y Recibos Oficiales */}
          <div className="rounded-xl border border-ink-200 bg-white p-5 shadow-xs">
            <h3 className="text-sm font-bold text-ink-900 uppercase tracking-wide mb-3">
              Historial de Pagos y Recibos Oficiales
            </h3>

            {recentPayments.length === 0 ? (
              <p className="text-xs text-ink-400 text-center py-6">
                Todavía no hay recibos oficiales emitidos para esta familia.
              </p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-ink-50 text-[10px] uppercase font-bold text-ink-500">
                    <tr>
                      <th className="py-2.5 px-3">Fecha</th>
                      <th className="py-2.5 px-3">Recibo N°</th>
                      <th className="py-2.5 px-3">Medio</th>
                      <th className="py-2.5 px-3 text-right">Importe</th>
                      <th className="py-2.5 px-3 text-right">Comprobante</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-ink-100">
                    {recentPayments.map((p) => (
                      <tr key={p.id} className="hover:bg-ink-50/50">
                        <td className="py-2.5 px-3 text-ink-700 whitespace-nowrap">
                          {formatDate(p.createdAt)}
                        </td>
                        <td className="py-2.5 px-3 font-mono font-bold text-brand-900">
                          {p.receiptNumber}
                        </td>
                        <td className="py-2.5 px-3 text-ink-600">
                          {paymentMethodLabel[p.method]}
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono font-bold text-ink-900">
                          {formatMoney(p.amountCents)}
                        </td>
                        <td className="py-2.5 px-3 text-right">
                          <Link
                            href={`/app/pagos/${p.id}/recibo`}
                            className="inline-flex items-center gap-1 text-xs font-bold text-brand-700 hover:underline"
                          >
                            <Icon name="receipt" size={13} />
                            Ver Recibo Oficial →
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* PESTAÑA 3: CALENDARIO Y PARTIDOS */}
      {activeTab === "schedule" && (
        <div className="rounded-xl border border-ink-200 bg-white p-5 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-ink-900 uppercase tracking-wide">
              Próximas Fechas de Básquetbol
            </h3>
            <span className="text-xs text-ink-500">Categorías de tus hijos</span>
          </div>

          {upcomingEvents.length === 0 ? (
            <div className="p-8 text-center text-xs text-ink-400">
              No hay partidos ni entrenamientos programados para los próximos días.
            </div>
          ) : (
            <div className="space-y-3">
              {upcomingEvents.map((evt) => (
                <div
                  key={evt.id}
                  className="rounded-lg border border-ink-100 p-3.5 flex items-start justify-between gap-3 hover:bg-ink-50/60 transition"
                >
                  <div className="flex items-start gap-3">
                    <span
                      className={`rounded-lg p-2.5 text-white shrink-0 ${
                        evt.type === "match" ? "bg-red-700" : "bg-sky-700"
                      }`}
                    >
                      <Icon name={evt.type === "match" ? "trophy" : "calendar"} size={16} />
                    </span>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-sm text-ink-900">{evt.title}</span>
                        <span className="rounded bg-brand-50 text-brand-800 border border-brand-200 px-1.5 py-0.2 text-[10px] font-bold">
                          {evt.categoryName}
                        </span>
                      </div>
                      <span className="text-xs text-ink-600 block mt-0.5">
                        {formatDateTime(evt.startsAt)}
                      </span>

                      {/* Botón de Google Maps para que la familia sepa exactamente cómo llegar */}
                      <div className="mt-2">
                        <VenueMapCard
                          isHome={evt.isHome ?? (evt.type === "training")}
                          rival={evt.rival}
                          location={evt.location}
                          compact={true}
                        />
                      </div>
                    </div>
                  </div>
                  <span
                    className={`rounded px-2 py-0.5 text-[10px] font-bold uppercase shrink-0 ${
                      evt.type === "match" ? "bg-red-100 text-red-800" : "bg-sky-100 text-sky-800"
                    }`}
                  >
                    {evt.type === "match" ? "Partido" : "Entrenamiento"}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* PESTAÑA 4: CONTACTO DEL CLUB */}
      {activeTab === "contact" && (
        <div className="rounded-xl border border-ink-200 bg-white p-5 shadow-xs space-y-4">
          <h3 className="text-sm font-bold text-ink-900 uppercase tracking-wide">
            Sede y Canales de Atención al Socio
          </h3>

          <div className="grid gap-4 sm:grid-cols-2 text-xs">
            <div className="rounded-lg bg-ink-50 p-4 space-y-2.5">
              <span className="text-[10px] font-bold uppercase text-ink-400 block">Sede Social y Cancha</span>
              <p className="font-bold text-ink-900 text-sm">{HOME_VENUE.clubName}</p>
              <p className="text-ink-600">{HOME_VENUE.courtName} · {HOME_VENUE.address}, {HOME_VENUE.city}</p>
              <p className="text-ink-500 text-[11px]">Horario de secretaría: Lunes a Viernes de 16:00 a 21:00 hs</p>
              <a
                href={`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(HOME_VENUE.googleMapsQuery)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 rounded-lg bg-ink-900 px-3 py-1.5 text-[11px] font-bold text-white shadow-2xs hover:bg-ink-800 transition"
              >
                🗺️ ¿Cómo llegar a la sede en Google Maps?
              </a>
            </div>

            <div className="rounded-lg bg-emerald-50 border border-emerald-200 p-4 space-y-3">
              <span className="text-[10px] font-bold uppercase text-emerald-800 block">Contacto Directo</span>
              <p className="text-emerald-900">
                ¿Tenés consultas sobre cuotas, entrenamientos o aptos médicos de tus hijos?
              </p>
              <a
                href="https://wa.me/5491155551000?text=Hola%20Club%20Atl%C3%A9tico%20Estudiantes%2C%20me%20comunico%20desde%20el%20Portal%20de%20la%20Familia"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 font-bold text-white shadow-xs hover:bg-emerald-700 transition"
              >
                <Icon name="phone" size={14} />
                Contactar Secretaría por WhatsApp
              </a>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
