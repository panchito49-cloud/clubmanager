"use client";

import Image from "next/image";
import { resolveVenueLocation } from "@/lib/venues";

interface VenueMapCardProps {
  isHome: boolean;
  rival?: string | null;
  location?: string | null;
  startsAt?: Date | string | null;
  className?: string;
  compact?: boolean;
}

export function VenueMapCard({
  isHome,
  rival,
  location,
  startsAt,
  className = "",
  compact = false,
}: VenueMapCardProps) {
  const venue = resolveVenueLocation({ isHome, rival, location });

  if (compact) {
    return (
      <div className={`flex flex-wrap items-center gap-1.5 ${className}`}>
        <span className="text-xs text-ink-600 truncate max-w-xs" title={venue.address}>
          📍 {venue.address}
        </span>
        <a
          href={venue.mapsDirectionsUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 rounded-md bg-emerald-50 px-2 py-0.5 text-[11px] font-bold text-emerald-800 border border-emerald-200 hover:bg-emerald-100 transition shadow-2xs"
          title="Abrir indicaciones paso a paso en Google Maps"
        >
          🗺️ ¿Cómo llegar?
        </a>
      </div>
    );
  }

  return (
    <div className={`overflow-hidden rounded-2xl border border-ink-200 bg-white shadow-sm ${className}`}>
      {/* Cabecera de la sede */}
      <div className="bg-gradient-to-r from-ink-900 to-ink-950 p-4 text-white flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="relative h-10 w-10 overflow-hidden rounded-full border border-white/20 bg-white p-1 flex-shrink-0 shadow-sm">
            <Image
              src={venue.badgeUrl}
              alt={venue.venueTitle}
              fill
              className="object-contain p-0.5"
            />
          </div>
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-ink-300">
              Sede del Encuentro · {isHome ? "Local (Nuestra Cancha)" : "Visitante (Cancha Rival)"}
            </h4>
            <p className="text-sm font-extrabold text-white mt-0.5">{venue.venueTitle}</p>
          </div>
        </div>

        <span
          className={`rounded-full px-2.5 py-0.5 text-[11px] font-extrabold uppercase tracking-wide border ${
            isHome
              ? "bg-brand-600 text-white border-brand-500"
              : "bg-sky-500/20 text-sky-300 border-sky-500/30"
          }`}
        >
          {isHome ? "En Calle 33 N° 334" : "Viajamos"}
        </span>
      </div>

      {/* Contenido y Dirección Exacta */}
      <div className="p-4 sm:p-5 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 rounded-xl bg-ink-50/80 p-3.5 border border-ink-100">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-wide text-ink-500">
              Dirección oficial para GPS
            </p>
            <p className="text-sm font-bold text-ink-900 mt-0.5">{venue.address}</p>
            <p className="text-xs text-ink-500 mt-0.5">
              {isHome
                ? "Sede Social y Cancha de Básquetbol de Estudiantes de Mercedes."
                : `Estadio del club ${rival || "rival"}.`}
            </p>
          </div>

          {/* Botones de Google Maps y Navegación */}
          <div className="flex flex-wrap items-center gap-2 pt-1 sm:pt-0">
            <a
              href={venue.mapsDirectionsUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-emerald-600 px-3.5 py-2 text-xs font-bold text-white shadow-sm hover:bg-emerald-700 transition active:scale-95"
              title="Iniciar navegación GPS en Google Maps"
            >
              🚗 ¿Cómo llegar? (GPS)
            </a>

            <a
              href={venue.mapsSearchUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-ink-200 bg-white px-3 py-2 text-xs font-semibold text-ink-700 hover:bg-ink-50 transition shadow-2xs"
              title="Ver ubicación en el mapa interactivo de Google Maps"
            >
              🗺️ Ver en Google Maps
            </a>
          </div>
        </div>

        {/* Indicaciones para Familias, Entrenadores y Jugadores */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs text-ink-600">
          <div className="rounded-xl border border-ink-100 p-2.5 bg-white">
            <p className="font-bold text-ink-900 flex items-center gap-1">
              <span>👨‍👩‍👧</span> Para Padres y Familias
            </p>
            <p className="text-[11px] text-ink-500 mt-1">
              Tocá en &quot;¿Cómo llegar?&quot; desde tu celular para que Google Maps guíe tu auto hasta la puerta del estadio.
            </p>
          </div>

          <div className="rounded-xl border border-ink-100 p-2.5 bg-white">
            <p className="font-bold text-ink-900 flex items-center gap-1">
              <span>🏀</span> Para Jugadores
            </p>
            <p className="text-[11px] text-ink-500 mt-1">
              {isHome
                ? "Llegar con indumentaria oficial titular roja al vestuario."
                : "Traer bolso completo con indumentaria titular y suplente."}
            </p>
          </div>

          <div className="rounded-xl border border-ink-100 p-2.5 bg-white">
            <p className="font-bold text-ink-900 flex items-center gap-1">
              <span>⏱</span> Para el DT / Delegado
            </p>
            <p className="text-[11px] text-ink-500 mt-1">
              Citación del equipo 45 minutos antes para calentamiento y firma de planilla de juego.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
