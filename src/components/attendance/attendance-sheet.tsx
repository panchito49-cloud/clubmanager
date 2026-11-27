"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { formatDateTime } from "@/lib/format";
import { getMedicalCertificateInfo } from "@/lib/medical";
import { recordAttendanceQuickAction } from "@/app/actions/sports";
import { finishTrainingAction } from "@/app/actions/sports";

export type AttendancePlayer = {
  id: string;
  firstName: string;
  lastName: string;
  jerseyNumber?: number | null;
  birthDate?: string | null;
  position?: string | null;
  medicalCertificateExpiresAt?: string | null;
  attendanceStatus?: "present" | "absent" | "late" | "justified" | null;
  attendanceNote?: string | null;
};

export type TrainingSession = {
  id: string;
  title: string;
  categoryId: string;
  categoryName: string;
  categoryGender: string;
  startsAt: Date;
  endsAt?: Date | null;
  location?: string | null;
  notes?: string | null;
  status: "scheduled" | "completed" | "cancelled";
  coachName?: string | null;
};

interface AttendanceSheetProps {
  training: TrainingSession;
  initialRoster: AttendancePlayer[];
  canRecord: boolean;
}

export function AttendanceSheet({
  training,
  initialRoster,
  canRecord,
}: AttendanceSheetProps) {
  const [players, setPlayers] = useState<AttendancePlayer[]>(initialRoster);
  const [filter, setFilter] = useState<"all" | "present" | "absent" | "unrecorded" | "medical">("all");
  const [search, setSearch] = useState("");
  const [activeNotePlayerId, setActiveNotePlayerId] = useState<string | null>(null);
  const [activeNoteText, setActiveNoteText] = useState("");
  const [saveIndicator, setSaveIndicator] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  // Estadísticas en vivo
  const totalCount = players.length;
  const presentCount = players.filter((p) => p.attendanceStatus === "present" || p.attendanceStatus === "late").length;
  const absentCount = players.filter((p) => p.attendanceStatus === "absent").length;
  const unrecordedCount = players.filter((p) => !p.attendanceStatus).length;
  const pct = totalCount > 0 ? Math.round((presentCount / totalCount) * 100) : 0;

  // Detección de alertas médicas críticas
  const medicalAlerts = players.filter((p) => {
    const med = getMedicalCertificateInfo(p.medicalCertificateExpiresAt);
    return med.status === "expired" || med.status === "missing";
  });

  const handleStatusChange = async (
    playerId: string,
    newStatus: "present" | "absent" | "late" | "justified",
  ) => {
    if (!canRecord) return;

    // Actualización optimista inmediata
    setPlayers((prev) =>
      prev.map((p) =>
        p.id === playerId ? { ...p, attendanceStatus: newStatus } : p,
      ),
    );

    setSaveIndicator("Guardando...");

    // Persistencia en segundo plano
    const currentNote = players.find((p) => p.id === playerId)?.attendanceNote;
    const res = await recordAttendanceQuickAction(
      training.id,
      playerId,
      newStatus,
      currentNote || undefined,
    );

    if (res.success) {
      setSaveIndicator("✓ Guardado");
      setTimeout(() => setSaveIndicator(null), 1500);
    } else {
      setSaveIndicator("⚠️ Error al guardar");
    }
  };

  const handleSaveNote = async (playerId: string) => {
    const player = players.find((p) => p.id === playerId);
    if (!player) return;

    setPlayers((prev) =>
      prev.map((p) =>
        p.id === playerId ? { ...p, attendanceNote: activeNoteText } : p,
      ),
    );

    setActiveNotePlayerId(null);
    setSaveIndicator("Guardando nota...");

    const currentStatus = player.attendanceStatus || "present";
    await recordAttendanceQuickAction(
      training.id,
      playerId,
      currentStatus,
      activeNoteText,
    );

    setSaveIndicator("✓ Nota guardada");
    setTimeout(() => setSaveIndicator(null), 1500);
  };

  const handleMarkAllPresent = async () => {
    if (!canRecord) return;
    const confirm = window.confirm("¿Confirmás marcar a todo el plantel presente?");
    if (!confirm) return;

    setPlayers((prev) =>
      prev.map((p) => ({ ...p, attendanceStatus: "present" })),
    );

    setSaveIndicator("Guardando todo el plantel...");
    for (const player of players) {
      await recordAttendanceQuickAction(
        training.id,
        player.id,
        "present",
        player.attendanceNote || undefined,
      );
    }

    setSaveIndicator("✓ Todo el plantel presente");
    setTimeout(() => setSaveIndicator(null), 2000);
  };

  // Filtrado de jugadores
  const filteredPlayers = players.filter((p) => {
    // Búsqueda por nombre o dorsal
    const query = search.toLowerCase().trim();
    if (query) {
      const fullName = `${p.lastName} ${p.firstName}`.toLowerCase();
      const dorsal = p.jerseyNumber ? `#${p.jerseyNumber}` : "";
      if (!fullName.includes(query) && !dorsal.includes(query)) {
        return false;
      }
    }

    if (filter === "present") return p.attendanceStatus === "present" || p.attendanceStatus === "late";
    if (filter === "absent") return p.attendanceStatus === "absent";
    if (filter === "unrecorded") return !p.attendanceStatus;
    if (filter === "medical") {
      const med = getMedicalCertificateInfo(p.medicalCertificateExpiresAt);
      return med.status === "expired" || med.status === "missing";
    }
    return true;
  });

  return (
    <div className="mx-auto max-w-3xl space-y-4 pb-16">
      {/* Barra de cabecera contextual */}
      <div className="flex flex-col gap-2 rounded-2xl border border-ink-200 bg-white p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center rounded-md bg-brand-50 px-2 py-0.5 text-xs font-semibold text-brand-700 ring-1 ring-inset ring-brand-700/10">
              {training.categoryName} ({training.categoryGender === "male" ? "Masc" : "Fem"})
            </span>
            <span className="text-xs text-ink-500">
              {formatDateTime(training.startsAt)}
            </span>
            {saveIndicator && (
              <span className="text-xs font-semibold text-emerald-600 animate-pulse">
                {saveIndicator}
              </span>
            )}
          </div>
          <h1 className="mt-1 text-lg font-bold text-ink-900 sm:text-xl">
            {training.title}
          </h1>
          <p className="text-xs text-ink-500">
            📍 {training.location || "Sede Calle 33 N° 334"}
            {training.coachName ? ` · DT: ${training.coachName}` : ""}
          </p>
        </div>

        <div className="flex items-center gap-2">
          {canRecord && (
            <button
              type="button"
              onClick={handleMarkAllPresent}
              className="inline-flex items-center gap-1.5 rounded-xl border border-emerald-300 bg-emerald-50 px-3 py-2 text-xs font-bold text-emerald-800 shadow-sm transition hover:bg-emerald-100 active:scale-95"
            >
              ⚡ Todos presentes
            </button>
          )}

          <form action={finishTrainingAction}>
            <input type="hidden" name="trainingId" value={training.id} />
            <button
              type="submit"
              className="inline-flex items-center gap-1.5 rounded-xl bg-ink-900 px-3 py-2 text-xs font-bold text-white shadow-sm transition hover:bg-ink-800 active:scale-95"
            >
              ✓ Finalizar sesión
            </button>
          </form>
        </div>
      </div>

      {/* Alerta de Aptos Médicos Críticos si los hay */}
      {medicalAlerts.length > 0 && (
        <div className="flex items-start gap-3 rounded-2xl border-2 border-rose-300 bg-rose-50/90 p-4 shadow-sm">
          <span className="text-2xl">🚨</span>
          <div className="flex-1">
            <h3 className="text-sm font-bold text-rose-900">
              Atención DT: {medicalAlerts.length} jugador(es) con Apto Médico irregular
            </h3>
            <p className="mt-0.5 text-xs text-rose-700">
              Por normativa reglamentaria del club y la federación, los deportistas sin EMDAP vigente deben regularizar su situación médica de forma prioritaria.
            </p>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {medicalAlerts.map((p) => (
                <span
                  key={p.id}
                  className="inline-flex items-center gap-1 rounded-md bg-white px-2 py-0.5 text-xs font-semibold text-rose-800 shadow-xs border border-rose-200"
                >
                  {p.jerseyNumber ? `#${p.jerseyNumber} ` : ""}
                  {p.lastName}, {p.firstName}
                </span>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Tarjeta de métricas táctiles */}
      <div className="grid grid-cols-4 gap-2 rounded-2xl border border-ink-200 bg-white p-3 shadow-sm text-center">
        <div className="p-1">
          <p className="text-[11px] font-medium text-ink-500">Plantel</p>
          <p className="mt-0.5 text-lg font-bold text-ink-900">{totalCount}</p>
        </div>
        <div className="p-1 rounded-xl bg-emerald-50/70 border border-emerald-100">
          <p className="text-[11px] font-medium text-emerald-700">Presentes</p>
          <p className="mt-0.5 text-lg font-bold text-emerald-800">{presentCount}</p>
        </div>
        <div className="p-1 rounded-xl bg-rose-50/70 border border-rose-100">
          <p className="text-[11px] font-medium text-rose-700">Ausentes</p>
          <p className="mt-0.5 text-lg font-bold text-rose-800">{absentCount}</p>
        </div>
        <div className="p-1">
          <p className="text-[11px] font-medium text-ink-500">Asistencia</p>
          <p className="mt-0.5 text-lg font-bold text-brand-700">{pct}%</p>
        </div>
      </div>

      {/* Barra de búsqueda y filtros rápidos */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative flex-1">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por apellido, nombre o #dorsal..."
            className="w-full rounded-xl border border-ink-200 bg-white px-3.5 py-2 pl-9 text-xs text-ink-900 placeholder:text-ink-400 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500 shadow-xs"
          />
          <span className="absolute left-3 top-2.5 text-ink-400 text-xs">🔍</span>
          {search && (
            <button
              onClick={() => setSearch("")}
              className="absolute right-3 top-2 text-xs font-bold text-ink-400 hover:text-ink-700"
            >
              ✕
            </button>
          )}
        </div>

        {/* Filtros tipo pastilla */}
        <div className="flex flex-wrap items-center gap-1">
          <button
            type="button"
            onClick={() => setFilter("all")}
            className={`rounded-lg px-2.5 py-1 text-xs font-medium transition ${
              filter === "all"
                ? "bg-ink-900 text-white"
                : "bg-ink-100 text-ink-600 hover:bg-ink-200"
            }`}
          >
            Todos ({totalCount})
          </button>
          <button
            type="button"
            onClick={() => setFilter("present")}
            className={`rounded-lg px-2.5 py-1 text-xs font-medium transition ${
              filter === "present"
                ? "bg-emerald-600 text-white"
                : "bg-emerald-50 text-emerald-800 hover:bg-emerald-100"
            }`}
          >
            Presentes ({presentCount})
          </button>
          <button
            type="button"
            onClick={() => setFilter("absent")}
            className={`rounded-lg px-2.5 py-1 text-xs font-medium transition ${
              filter === "absent"
                ? "bg-rose-600 text-white"
                : "bg-rose-50 text-rose-800 hover:bg-rose-100"
            }`}
          >
            Ausentes ({absentCount})
          </button>
          {unrecordedCount > 0 && (
            <button
              type="button"
              onClick={() => setFilter("unrecorded")}
              className={`rounded-lg px-2.5 py-1 text-xs font-medium transition ${
                filter === "unrecorded"
                  ? "bg-amber-600 text-white"
                  : "bg-amber-50 text-amber-800 hover:bg-amber-100"
              }`}
            >
              Sin marcar ({unrecordedCount})
            </button>
          )}
          {medicalAlerts.length > 0 && (
            <button
              type="button"
              onClick={() => setFilter("medical")}
              className={`rounded-lg px-2.5 py-1 text-xs font-bold transition ${
                filter === "medical"
                  ? "bg-rose-600 text-white"
                  : "bg-rose-100 text-rose-800 hover:bg-rose-200 border border-rose-300"
              }`}
            >
              ⚠️ Médica ({medicalAlerts.length})
            </button>
          )}
        </div>
      </div>

      {/* Lista táctil de jugadores */}
      <div className="space-y-2.5">
        {filteredPlayers.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-ink-200 bg-white p-8 text-center text-xs text-ink-500">
            No se encontraron jugadores con los filtros seleccionados.
          </div>
        ) : (
          filteredPlayers.map((player) => {
            const medInfo = getMedicalCertificateInfo(player.medicalCertificateExpiresAt);
            const isMedicalAlert = medInfo.status === "expired" || medInfo.status === "missing";

            return (
              <div
                key={player.id}
                className={`flex flex-col gap-3 rounded-2xl border bg-white p-3.5 shadow-sm transition sm:p-4 ${
                  isMedicalAlert
                    ? "border-rose-300 ring-1 ring-rose-200 bg-rose-50/20"
                    : "border-ink-200 hover:border-ink-300"
                }`}
              >
                {/* Cabecera del jugador */}
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-3">
                    {/* Dorsal / Avatar */}
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-600 text-sm font-bold text-white shadow-xs">
                      {player.jerseyNumber ? `#${player.jerseyNumber}` : player.firstName[0]}
                    </div>

                    <div>
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <h4 className="text-sm font-bold text-ink-900">
                          {player.lastName}, {player.firstName}
                        </h4>
                        {player.position && (
                          <span className="rounded bg-ink-100 px-1.5 py-0.5 text-[10px] font-semibold text-ink-600">
                            {player.position}
                          </span>
                        )}
                      </div>

                      {/* Semáforo médico en vivo */}
                      <div className="mt-0.5 flex items-center gap-1.5">
                        <span
                          className={`inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[11px] border font-medium ${medInfo.badgeClass}`}
                        >
                          {medInfo.status === "valid" ? "🟢" : medInfo.status === "warning" ? "🟡" : "🔴"}{" "}
                          {medInfo.label}
                        </span>
                        {isMedicalAlert && (
                          <span className="text-[10px] font-bold text-rose-700">
                            (Requiere EMDAP)
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Botón de observación rápida */}
                  <button
                    type="button"
                    onClick={() => {
                      setActiveNotePlayerId(player.id);
                      setActiveNoteText(player.attendanceNote || "");
                    }}
                    className={`rounded-lg p-1.5 text-xs transition ${
                      player.attendanceNote
                        ? "bg-amber-100 text-amber-800 font-semibold"
                        : "text-ink-400 hover:bg-ink-100 hover:text-ink-700"
                    }`}
                    title={player.attendanceNote || "Agregar observación"}
                  >
                    📝 {player.attendanceNote ? "Ver nota" : "+ Nota"}
                  </button>
                </div>

                {/* Nota guardada visible si existe */}
                {player.attendanceNote && activeNotePlayerId !== player.id && (
                  <div className="rounded-xl border border-amber-200 bg-amber-50/80 px-3 py-1.5 text-xs text-amber-900 flex items-center justify-between">
                    <p className="italic">
                      <span className="font-semibold not-italic">Nota DT:</span> {player.attendanceNote}
                    </p>
                    <button
                      type="button"
                      onClick={() => {
                        setActiveNotePlayerId(player.id);
                        setActiveNoteText(player.attendanceNote || "");
                      }}
                      className="ml-2 text-[11px] font-bold text-amber-700 hover:underline"
                    >
                      Editar
                    </button>
                  </div>
                )}

                {/* Editor inline de nota rápida */}
                {activeNotePlayerId === player.id && (
                  <div className="rounded-xl border border-brand-200 bg-brand-50/50 p-2.5 space-y-2">
                    <label className="text-[11px] font-bold text-brand-900 block">
                      Observación técnica / médica para {player.firstName}:
                    </label>
                    <input
                      type="text"
                      value={activeNoteText}
                      onChange={(e) => setActiveNoteText(e.target.value)}
                      placeholder="Ej: Dolor en rodilla, avisa que llega tarde por colegio..."
                      className="w-full rounded-lg border border-ink-200 bg-white px-2.5 py-1.5 text-xs text-ink-900 focus:outline-none focus:ring-1 focus:ring-brand-500"
                      autoFocus
                    />
                    <div className="flex justify-end gap-1.5">
                      <button
                        type="button"
                        onClick={() => setActiveNotePlayerId(null)}
                        className="rounded-md border border-ink-200 bg-white px-2.5 py-1 text-[11px] font-medium text-ink-700 hover:bg-ink-50"
                      >
                        Cancelar
                      </button>
                      <button
                        type="button"
                        onClick={() => handleSaveNote(player.id)}
                        className="rounded-md bg-brand-600 px-3 py-1 text-[11px] font-bold text-white hover:bg-brand-700"
                      >
                        Guardar nota
                      </button>
                    </div>
                  </div>
                )}

                {/* 4 Botones Táctiles para el Entrenador (Thumb-friendly) */}
                <div className="grid grid-cols-4 gap-1.5 pt-1">
                  {/* Presente */}
                  <button
                    type="button"
                    onClick={() => handleStatusChange(player.id, "present")}
                    disabled={!canRecord}
                    className={`flex flex-col items-center justify-center rounded-xl py-2 px-1 text-center transition active:scale-95 ${
                      player.attendanceStatus === "present"
                        ? "bg-emerald-600 text-white font-bold shadow-md ring-2 ring-emerald-600/30"
                        : "border border-ink-200 bg-white text-ink-700 hover:bg-emerald-50 hover:text-emerald-700"
                    }`}
                  >
                    <span className="text-sm">✓</span>
                    <span className="text-[11px] font-semibold mt-0.5">Presente</span>
                  </button>

                  {/* Tarde */}
                  <button
                    type="button"
                    onClick={() => handleStatusChange(player.id, "late")}
                    disabled={!canRecord}
                    className={`flex flex-col items-center justify-center rounded-xl py-2 px-1 text-center transition active:scale-95 ${
                      player.attendanceStatus === "late"
                        ? "bg-amber-500 text-white font-bold shadow-md ring-2 ring-amber-500/30"
                        : "border border-ink-200 bg-white text-ink-700 hover:bg-amber-50 hover:text-amber-700"
                    }`}
                  >
                    <span className="text-sm">⏱</span>
                    <span className="text-[11px] font-semibold mt-0.5">Tarde</span>
                  </button>

                  {/* Ausente */}
                  <button
                    type="button"
                    onClick={() => handleStatusChange(player.id, "absent")}
                    disabled={!canRecord}
                    className={`flex flex-col items-center justify-center rounded-xl py-2 px-1 text-center transition active:scale-95 ${
                      player.attendanceStatus === "absent"
                        ? "bg-rose-600 text-white font-bold shadow-md ring-2 ring-rose-600/30"
                        : "border border-ink-200 bg-white text-ink-700 hover:bg-rose-50 hover:text-rose-700"
                    }`}
                  >
                    <span className="text-sm">✕</span>
                    <span className="text-[11px] font-semibold mt-0.5">Ausente</span>
                  </button>

                  {/* Justificado */}
                  <button
                    type="button"
                    onClick={() => handleStatusChange(player.id, "justified")}
                    disabled={!canRecord}
                    className={`flex flex-col items-center justify-center rounded-xl py-2 px-1 text-center transition active:scale-95 ${
                      player.attendanceStatus === "justified"
                        ? "bg-sky-600 text-white font-bold shadow-md ring-2 ring-sky-600/30"
                        : "border border-ink-200 bg-white text-ink-700 hover:bg-sky-50 hover:text-sky-700"
                    }`}
                  >
                    <span className="text-sm">📝</span>
                    <span className="text-[11px] font-semibold mt-0.5">Justificado</span>
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Pie de página con acceso al calendario */}
      <div className="flex items-center justify-between pt-4 text-xs text-ink-500">
        <Link
          href="/app/asistencias"
          className="inline-flex items-center gap-1 font-semibold text-brand-700 hover:underline"
        >
          ← Volver a Hub de Asistencias
        </Link>
        <Link
          href="/app/calendario"
          className="font-medium text-ink-500 hover:text-ink-900"
        >
          Ver calendario general →
        </Link>
      </div>
    </div>
  );
}
