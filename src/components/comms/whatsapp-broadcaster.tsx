"use client";

import { useState } from "react";
import { Icon } from "@/components/ui/icon";
import { sendAnnouncementAction } from "@/app/actions/comms";
import type { WhatsAppRecipient } from "@/server/data/comms";

interface WhatsAppBroadcasterProps {
  announcementId: string;
  title: string;
  body: string;
  fullMessageText: string;
  shareGroupWaUrl: string;
  isDraft: boolean;
  canSend: boolean;
  recipients: WhatsAppRecipient[];
}

export function WhatsAppBroadcaster({
  announcementId,
  title,
  body,
  fullMessageText,
  shareGroupWaUrl,
  isDraft,
  canSend,
  recipients,
}: WhatsAppBroadcasterProps) {
  const [copied, setCopied] = useState(false);
  const [sentMap, setSentMap] = useState<Record<string, boolean>>({});
  const [search, setSearch] = useState("");

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(fullMessageText);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback
    }
  };

  const handleMarkSent = (id: string) => {
    setSentMap((prev) => ({ ...prev, [id]: true }));
  };

  const filteredRecipients = recipients.filter((r) => {
    const q = search.toLowerCase().trim();
    if (!q) return true;
    return (
      r.name.toLowerCase().includes(q) ||
      (r.playerName && r.playerName.toLowerCase().includes(q)) ||
      (r.phone && r.phone.includes(q))
    );
  });

  const totalRecipients = recipients.length;
  const withPhoneCount = recipients.filter((r) => Boolean(r.phone)).length;
  const sentCount = Object.keys(sentMap).length;

  return (
    <div className="space-y-6">
      {/* Panel de Vista Previa estilo WhatsApp */}
      <div className="overflow-hidden rounded-2xl border border-ink-200 bg-white shadow-sm">
        <div className="bg-[#075e54] p-3 sm:p-4 text-white flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-[#128c7e] text-lg font-bold">
              🏀
            </span>
            <div>
              <p className="text-xs font-bold leading-tight">Club Atlético Estudiantes de Mercedes</p>
              <p className="text-[10px] text-emerald-200">Canal Oficial de WhatsApp · Centenario 1926-2026</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleCopy}
              className="inline-flex items-center gap-1 rounded-lg bg-white/10 px-2.5 py-1 text-xs font-semibold text-white hover:bg-white/20 transition active:scale-95"
            >
              {copied ? "✓ ¡Copiado!" : "📋 Copiar texto"}
            </button>
          </div>
        </div>

        {/* Burbuja de mensaje con fondo característico */}
        <div className="bg-[#efeae2] p-4 sm:p-6 min-h-[160px]">
          <div className="max-w-xl mx-auto rounded-2xl bg-white p-4 sm:p-5 shadow-sm space-y-3 border border-ink-100">
            <div className="flex items-center justify-between border-b border-ink-100 pb-2">
              <span className="text-xs font-extrabold uppercase tracking-wider text-brand-800">
                🏀 CLUB ATLÉTICO ESTUDIANTES DE MERCEDES
              </span>
              <span className="text-[10px] font-bold text-ink-400">OFICIAL</span>
            </div>

            <h4 className="text-sm font-black text-ink-900 uppercase tracking-wide">
              📌 {title}
            </h4>

            <p className="text-xs text-ink-800 whitespace-pre-wrap leading-relaxed font-sans">
              {body}
            </p>

            <div className="pt-2 border-t border-ink-100 flex items-center justify-between text-[11px] text-ink-400">
              <span>📍 Sede Central: Calle 33 N° 334, Mercedes (B)</span>
              <span className="font-mono text-ink-500">✓✓</span>
            </div>
          </div>
        </div>

        {/* Acciones de Disparo Rápido */}
        <div className="p-4 sm:p-5 bg-white border-t border-ink-100 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="text-xs text-ink-500">
              Destinatarios en la audiencia: <strong>{totalRecipients}</strong> ({withPhoneCount} con celular cargado)
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Botón Principal: Compartir en Grupo / Difusión de WhatsApp */}
            <a
              href={shareGroupWaUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-[#25d366] px-4 py-2.5 text-xs font-extrabold text-white shadow-sm hover:bg-[#20ba5a] transition active:scale-95"
            >
              📲 Enviar a Grupo de WhatsApp
            </a>

            {/* Marcar como emitido si es borrador */}
            {isDraft && canSend && (
              <form action={sendAnnouncementAction}>
                <input type="hidden" name="announcementId" value={announcementId} />
                <button
                  type="submit"
                  className="inline-flex items-center gap-1.5 rounded-xl bg-ink-900 px-4 py-2.5 text-xs font-bold text-white shadow-sm hover:bg-ink-800 transition active:scale-95"
                >
                  ✓ Confirmar emisión
                </button>
              </form>
            )}
          </div>
        </div>
      </div>

      {/* Bandeja de Destinatarios Individuales (Envío 1-a-1) */}
      <div className="rounded-2xl border border-ink-200 bg-white p-4 sm:p-5 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <div>
            <h3 className="text-sm font-bold text-ink-900 uppercase tracking-wide">
              Envío Individual a Familias y Tutores (1 a 1)
            </h3>
            <p className="text-xs text-ink-500 mt-0.5">
              Tocá en &quot;Enviar WhatsApp&quot; para abrir el chat directo con el tutor con el mensaje pre-cargado.
              {sentCount > 0 && ` (${sentCount} de ${totalRecipients} contactados)`}
            </p>
          </div>

          <div className="relative w-full sm:w-64">
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar por nombre o hijo..."
              className="w-full rounded-xl border border-ink-200 bg-white px-3 py-1.5 text-xs text-ink-900 placeholder:text-ink-400 focus:outline-none focus:ring-1 focus:ring-brand-500"
            />
          </div>
        </div>

        <div className="divide-y divide-ink-100 max-h-96 overflow-y-auto">
          {filteredRecipients.length === 0 ? (
            <div className="p-8 text-center text-xs text-ink-400">
              No se encontraron destinatarios con número de WhatsApp registrado para esta audiencia.
            </div>
          ) : (
            filteredRecipients.map((r) => {
              const isContacted = sentMap[r.id];

              return (
                <div
                  key={r.id}
                  className={`flex items-center justify-between p-3 transition ${
                    isContacted ? "bg-emerald-50/40" : "hover:bg-ink-50/50"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <span
                      className={`flex h-8 w-8 items-center justify-center rounded-xl text-xs font-bold shadow-2xs ${
                        isContacted
                          ? "bg-emerald-600 text-white"
                          : "bg-ink-100 text-ink-700"
                      }`}
                    >
                      {r.jerseyNumber ? `#${r.jerseyNumber}` : r.name[0]}
                    </span>

                    <div>
                      <p className="text-xs font-bold text-ink-900">{r.name}</p>
                      <p className="text-[11px] text-ink-500">
                        {r.playerName ? `Jugador: ${r.playerName}` : r.relationshipLabel}
                        {r.phone ? ` · 📞 ${r.phone}` : " · ⚠️ Sin teléfono registrado"}
                      </p>
                    </div>
                  </div>

                  <div>
                    {r.waUrl ? (
                      <a
                        href={r.waUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={() => handleMarkSent(r.id)}
                        className={`inline-flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-bold transition shadow-2xs ${
                          isContacted
                            ? "bg-emerald-100 text-emerald-800 border border-emerald-300"
                            : "bg-[#25d366] text-white hover:bg-[#20ba5a] active:scale-95"
                        }`}
                      >
                        {isContacted ? "✓ Enviado" : "💬 Enviar WhatsApp"}
                      </a>
                    ) : (
                      <span className="text-[11px] text-ink-400 italic">No disponible</span>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
