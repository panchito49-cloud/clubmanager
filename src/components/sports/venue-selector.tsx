"use client";

import { useState } from "react";
import Image from "next/image";
import { HOME_VENUE, LEAGUE_CLUBS, resolveVenueLocation } from "@/lib/venues";

export function VenueSelector() {
  const [isHome, setIsHome] = useState(true);
  const [rival, setRival] = useState("");
  const [location, setLocation] = useState(
    `${HOME_VENUE.courtName} - ${HOME_VENUE.address}, ${HOME_VENUE.city} (B)`,
  );

  const rivalsList = LEAGUE_CLUBS.filter((v) => !v.isHomeClub);

  const handleConditionChange = (condition: string) => {
    const isHomeValue = condition === "true";
    setIsHome(isHomeValue);
    if (isHomeValue) {
      setLocation(`${HOME_VENUE.courtName} - ${HOME_VENUE.address}, ${HOME_VENUE.city} (B)`);
    } else {
      setLocation("");
    }
  };

  const handleSelectClub = (clubId: string) => {
    if (!clubId) return;
    const selected = LEAGUE_CLUBS.find((c) => c.id === clubId);
    if (selected) {
      setRival(selected.shortName);
      setLocation(`${selected.courtName} - ${selected.address}, ${selected.city}`);
    }
  };

  const resolved = resolveVenueLocation({ isHome, rival, location });

  return (
    <div className="space-y-4">
      {/* Campo Condición */}
      <div>
        <label htmlFor="isHome" className="block text-xs font-bold text-ink-700 uppercase tracking-wide">
          Condición de localía <span className="text-red-500">*</span>
        </label>
        <select
          id="isHome"
          name="isHome"
          value={isHome ? "true" : "false"}
          onChange={(e) => handleConditionChange(e.target.value)}
          className="mt-1 w-full rounded-xl border border-ink-200 bg-white px-3.5 py-2.5 text-xs font-semibold text-ink-900 shadow-xs focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
        >
          <option value="true">🏠 Local (en nuestro club: Calle 33 N° 334, Mercedes)</option>
          <option value="false">🚗 Visitante (viajamos a la cancha del rival)</option>
        </select>
        <p className="mt-1 text-[11px] text-ink-500">
          Determina si las familias y jugadores deben asistir a nuestra sede o trasladarse al estadio rival.
        </p>
      </div>

      {/* Selector visual de los clubes oficiales de la liga */}
      {!isHome && (
        <div className="rounded-xl border border-sky-200 bg-sky-50/50 p-3.5 space-y-2.5">
          <label className="block text-xs font-bold text-sky-950">
            Clubes oficiales de la liga de básquetbol (10 equipos):
          </label>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {rivalsList.map((c) => {
              const isSelected = rival.toLowerCase().includes(c.shortName.toLowerCase());
              return (
                <button
                  type="button"
                  key={c.id}
                  onClick={() => handleSelectClub(c.id)}
                  className={`flex items-center gap-2 rounded-xl p-2 text-left border text-xs transition ${
                    isSelected
                      ? "border-brand-500 bg-white shadow-xs font-bold text-brand-900 ring-2 ring-brand-500/20"
                      : "border-sky-200 bg-white/80 hover:bg-white text-ink-700 hover:border-sky-300"
                  }`}
                >
                  <div className="relative h-7 w-7 flex-shrink-0 overflow-hidden rounded-full border border-ink-200 bg-white">
                    <Image
                      src={c.badgeUrl}
                      alt={c.name}
                      fill
                      className="object-contain p-0.5"
                    />
                  </div>
                  <div className="min-w-0 flex-1 leading-tight">
                    <p className="truncate font-semibold">{c.shortName}</p>
                    <p className="truncate text-[10px] text-ink-400">{c.city}</p>
                  </div>
                </button>
              );
            })}
          </div>
          <p className="text-[11px] text-sky-800">
            Hacé clic en cualquier club para autocompletar su estadio y la ubicación exacta de Google Maps.
          </p>
        </div>
      )}

      {/* Campo Rival */}
      <div>
        <label htmlFor="rival" className="block text-xs font-bold text-ink-700 uppercase tracking-wide">
          Nombre del Club Rival <span className="text-red-500">*</span>
        </label>
        <input
          id="rival"
          name="rival"
          type="text"
          required
          value={rival}
          onChange={(e) => setRival(e.target.value)}
          placeholder="Ej: Club Mercedes, Sarmiento, Timón, Dorrego..."
          className="mt-1 w-full rounded-xl border border-ink-200 bg-white px-3.5 py-2.5 text-xs text-ink-900 shadow-xs focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
        />
      </div>

      {/* Campo Lugar / Dirección */}
      <div>
        <label htmlFor="location" className="block text-xs font-bold text-ink-700 uppercase tracking-wide">
          Lugar y Dirección exacta de la cancha
        </label>
        <input
          id="location"
          name="location"
          type="text"
          value={location}
          onChange={(e) => setLocation(e.target.value)}
          placeholder="Ej: Microestadio Club Mercedes - Av. 29 N° 720, Mercedes"
          className="mt-1 w-full rounded-xl border border-ink-200 bg-white px-3.5 py-2.5 text-xs text-ink-900 shadow-xs focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
        />

        {/* Vista previa y botón interactivo de Google Maps */}
        {location && (
          <div className="mt-2 flex flex-wrap items-center justify-between gap-2 rounded-lg bg-ink-50 p-2.5 border border-ink-100 text-xs">
            <div className="flex items-center gap-2 text-ink-700">
              <div className="relative h-6 w-6 overflow-hidden rounded-full border border-ink-200 bg-white flex-shrink-0">
                <Image
                  src={resolved.badgeUrl}
                  alt={resolved.venueTitle}
                  fill
                  className="object-contain p-0.5"
                />
              </div>
              <div className="min-w-0">
                <span className="font-semibold text-ink-900">{resolved.venueTitle}: </span>
                <span className="text-ink-500 truncate">{resolved.address}</span>
              </div>
            </div>

            <a
              href={resolved.mapsDirectionsUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 rounded-md bg-emerald-600 px-2.5 py-1 text-[11px] font-bold text-white hover:bg-emerald-700 transition"
              title="Probar enlace de navegación en Google Maps"
            >
              🗺️ Probar en Google Maps
            </a>
          </div>
        )}
      </div>
    </div>
  );
}
