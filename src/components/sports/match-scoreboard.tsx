"use client";

import { useState } from "react";
import Image from "next/image";
import { updateMatchScoreAction } from "@/app/actions/sports";
import { getTeamBadge } from "@/lib/venues";

interface MatchScoreboardProps {
  match: {
    id: string;
    rival: string;
    startsAt: Date;
    location?: string | null;
    isHome: boolean;
    status: "scheduled" | "played" | "cancelled";
    ourScore?: number | null;
    rivalScore?: number | null;
    notes?: string | null;
    categoryName: string;
    categoryGender: string;
  };
  canManage: boolean;
}

export function MatchScoreboard({ match, canManage }: MatchScoreboardProps) {
  const isPlayed = match.status === "played" && match.ourScore !== null && match.rivalScore !== null;
  const [isEditing, setIsEditing] = useState(!isPlayed);

  const ourScore = match.ourScore ?? 0;
  const rivalScore = match.rivalScore ?? 0;
  const isWin = isPlayed && ourScore > rivalScore;
  const isLoss = isPlayed && ourScore < rivalScore;
  const isTie = isPlayed && ourScore === rivalScore;
  const diff = Math.abs(ourScore - rivalScore);

  const rivalBadge = getTeamBadge(match.rival);

  return (
    <div className="overflow-hidden rounded-2xl border border-ink-200 bg-white shadow-sm">
      {/* Barra superior estilo tablero deportivo */}
      <div className="bg-gradient-to-r from-ink-950 via-ink-900 to-ink-950 px-4 py-3 text-white flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="flex h-2 w-2 rounded-full bg-red-500 animate-pulse" />
          <span className="text-xs font-bold tracking-wider uppercase text-ink-300">
            {match.categoryName} ({match.categoryGender === "male" ? "Masc" : "Fem"}) · {match.isHome ? "Local en Calle 33 N° 334" : "Visitante"}
          </span>
        </div>

        <div className="flex items-center gap-2">
          {isPlayed ? (
            <span
              className={`rounded-full px-2.5 py-0.5 text-xs font-extrabold uppercase tracking-wide ${
                isWin
                  ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                  : isLoss
                    ? "bg-rose-500/20 text-rose-300 border border-rose-500/30"
                    : "bg-ink-700 text-ink-200"
              }`}
            >
              {isWin ? `Victoria (+${diff})` : isLoss ? `Derrota (-${diff})` : "Empate"}
            </span>
          ) : (
            <span className="rounded-full bg-amber-500/20 px-2.5 py-0.5 text-xs font-bold text-amber-300 border border-amber-500/30">
              Programado
            </span>
          )}

          {canManage && isPlayed && (
            <button
              type="button"
              onClick={() => setIsEditing(!isEditing)}
              className="text-xs text-ink-400 hover:text-white underline ml-1"
            >
              {isEditing ? "Cancelar" : "Modificar"}
            </button>
          )}
        </div>
      </div>

      {/* Cuerpo del Scoreboard */}
      <div className="p-4 sm:p-6">
        {!isEditing && isPlayed ? (
          /* Vista del tanteador final ya guardado */
          <div className="flex flex-col items-center">
            <div className="grid w-full grid-cols-7 items-center gap-2 py-4 text-center">
              {/* Equipo Local / Estudiantes */}
              <div className="col-span-3 flex flex-col items-center justify-center space-y-2">
                <div className="relative flex h-14 w-14 sm:h-16 sm:w-16 items-center justify-center rounded-2xl bg-brand-50 p-2 border-2 border-brand-200 shadow-xs">
                  <Image
                    src="/escudos/estudiantes.png"
                    alt="Club Atlético Estudiantes"
                    width={52}
                    height={52}
                    className="h-auto w-auto object-contain"
                  />
                </div>
                <div>
                  <h3 className="text-sm sm:text-base font-extrabold text-ink-900 leading-tight">
                    Estudiantes
                  </h3>
                  <p className="text-[11px] font-semibold text-brand-700 uppercase">
                    {match.isHome ? "Local" : "Visitante"}
                  </p>
                </div>
              </div>

              {/* Tanteador Digital */}
              <div className="col-span-1 flex flex-col items-center justify-center">
                <div className="flex items-center gap-2 sm:gap-3">
                  <span className={`text-3xl sm:text-5xl font-black tracking-tight ${isWin ? "text-emerald-700" : "text-ink-900"}`}>
                    {match.ourScore}
                  </span>
                  <span className="text-xl sm:text-3xl font-bold text-ink-300">—</span>
                  <span className={`text-3xl sm:text-5xl font-black tracking-tight ${isLoss ? "text-emerald-700" : "text-ink-900"}`}>
                    {match.rivalScore}
                  </span>
                </div>
                <span className="mt-1 text-[10px] font-bold uppercase tracking-wider text-ink-400">
                  FINAL
                </span>
              </div>

              {/* Equipo Rival */}
              <div className="col-span-3 flex flex-col items-center justify-center space-y-2">
                <div className="relative flex h-14 w-14 sm:h-16 sm:w-16 items-center justify-center rounded-2xl bg-white p-2 border-2 border-ink-200 shadow-xs">
                  <Image
                    src={rivalBadge}
                    alt={match.rival}
                    width={52}
                    height={52}
                    className="h-auto w-auto object-contain"
                  />
                </div>
                <div>
                  <h3 className="text-sm sm:text-base font-extrabold text-ink-900 leading-tight">
                    {match.rival}
                  </h3>
                  <p className="text-[11px] font-semibold text-ink-500 uppercase">
                    {match.isHome ? "Visitante" : "Local"}
                  </p>
                </div>
              </div>
            </div>

            {/* Notas del cotejo si existen */}
            {match.notes && (
              <div className="mt-3 w-full rounded-xl bg-ink-50 p-3 text-center text-xs text-ink-600 italic border border-ink-100">
                &ldquo;{match.notes}&rdquo;
              </div>
            )}
          </div>
        ) : canManage ? (
          /* Formulario de carga o edición del resultado final */
          <form action={updateMatchScoreAction} className="space-y-4">
            <input type="hidden" name="matchId" value={match.id} />
            <input type="hidden" name="status" value="played" />

            <div className="text-center">
              <h4 className="text-xs font-bold uppercase tracking-wider text-brand-900">
                {isPlayed ? "Modificar Resultado Final" : "Cargar Resultado Final del Partido"}
              </h4>
              <p className="text-xs text-ink-500 mt-0.5">
                Ingresá los puntos convertidos por cada equipo al concluir el cotejo.
              </p>
            </div>

            <div className="flex items-center justify-center gap-4 sm:gap-6 py-2">
              {/* Estudiantes */}
              <div className="flex flex-col items-center">
                <div className="relative mb-2 h-10 w-10 overflow-hidden rounded-xl border border-brand-200 bg-white p-1">
                  <Image
                    src="/escudos/estudiantes.png"
                    alt="Estudiantes"
                    fill
                    className="object-contain p-0.5"
                  />
                </div>
                <label
                  htmlFor="ourScore"
                  className="block text-xs font-bold uppercase tracking-wider text-brand-800"
                >
                  Estudiantes
                </label>
                <input
                  id="ourScore"
                  name="ourScore"
                  type="number"
                  min="0"
                  max="200"
                  required
                  defaultValue={match.ourScore ?? ""}
                  placeholder="0"
                  className="mt-1.5 h-16 w-24 sm:h-20 sm:w-28 rounded-2xl border-2 border-brand-300 bg-brand-50/30 text-center text-3xl sm:text-4xl font-black text-ink-900 shadow-sm focus:border-brand-600 focus:outline-none focus:ring-2 focus:ring-brand-600"
                />
              </div>

              <span className="text-3xl font-extrabold text-ink-300 pt-10">—</span>

              {/* Rival */}
              <div className="flex flex-col items-center">
                <div className="relative mb-2 h-10 w-10 overflow-hidden rounded-xl border border-ink-200 bg-white p-1">
                  <Image
                    src={rivalBadge}
                    alt={match.rival}
                    fill
                    className="object-contain p-0.5"
                  />
                </div>
                <label
                  htmlFor="rivalScore"
                  className="block text-xs font-bold uppercase tracking-wider text-ink-700 truncate max-w-[130px] sm:max-w-[160px]"
                  title={match.rival}
                >
                  {match.rival}
                </label>
                <input
                  id="rivalScore"
                  name="rivalScore"
                  type="number"
                  min="0"
                  max="200"
                  required
                  defaultValue={match.rivalScore ?? ""}
                  placeholder="0"
                  className="mt-1.5 h-16 w-24 sm:h-20 sm:w-28 rounded-2xl border-2 border-ink-300 bg-ink-50/50 text-center text-3xl sm:text-4xl font-black text-ink-900 shadow-sm focus:border-ink-600 focus:outline-none focus:ring-2 focus:ring-ink-600"
                />
              </div>
            </div>

            {/* Observaciones del partido */}
            <div className="max-w-md mx-auto">
              <label htmlFor="notes" className="block text-xs font-medium text-ink-600">
                Observaciones del partido (opcional):
              </label>
              <input
                id="notes"
                name="notes"
                type="text"
                defaultValue={match.notes ?? ""}
                placeholder="Ej: Gran defensa en el cierre, victoria en suplementario..."
                className="mt-1 w-full rounded-xl border border-ink-200 bg-white px-3 py-2 text-xs text-ink-900 focus:outline-none focus:ring-1 focus:ring-brand-500"
              />
            </div>

            <div className="flex items-center justify-center gap-2 pt-2">
              {isPlayed && (
                <button
                  type="button"
                  onClick={() => setIsEditing(false)}
                  className="rounded-xl border border-ink-200 bg-white px-4 py-2 text-xs font-semibold text-ink-700 hover:bg-ink-50"
                >
                  Cancelar
                </button>
              )}
              <button
                type="submit"
                className="inline-flex items-center gap-1.5 rounded-xl bg-brand-600 px-5 py-2.5 text-xs font-bold text-white shadow-sm transition hover:bg-brand-700 active:scale-95"
              >
                ✓ Guardar Resultado Final
              </button>
            </div>
          </form>
        ) : (
          <div className="py-6 text-center text-xs text-ink-400">
            Partido programado. El resultado final será cargado por el cuerpo técnico al finalizar.
          </div>
        )}
      </div>
    </div>
  );
}
