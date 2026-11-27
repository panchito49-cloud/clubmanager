"use client";

import { useState } from "react";
import { createAnnouncementAction } from "@/app/actions/comms";
import { ActionForm } from "@/components/ui/action-form";

interface CategoryOption {
  id: string;
  name: string;
  gender: string;
}

const PRESET_TEMPLATES = [
  {
    id: "match",
    name: "🏀 Convocatoria a Partido Oficial",
    defaultTitle: "Convocatoria para el partido de este fin de semana",
    defaultAudience: "category",
    defaultBody:
      "Hola familias! Los convocamos para el próximo cotejo oficial de básquetbol.\n\n📅 Día y Hora: Sábado 18:30 hs\n🏀 Rival: vs Club Quilmes de Mercedes\n📍 Cancha: Estadio Centenario - Calle 33 N° 334, Mercedes\n👕 Indumentaria: Titular roja oficial completa\n⏱ Citación: 45 minutos antes en vestuarios\n\nPor favor confirmar asistencia respondiendo a este mensaje. ¡Vamos Estudiantes!",
  },
  {
    id: "weather",
    name: "🌧️ Suspensión / Reprogramación por Clima",
    defaultTitle: "Aviso importante: Suspensión de entrenamientos de hoy",
    defaultAudience: "category",
    defaultBody:
      "Estimadas familias y deportistas:\n\nPor cuestiones climáticas y para resguardar la seguridad de los chicos en el traslado, quedan SUSPENDIDOS los entrenamientos de básquetbol programados para la fecha.\n\nRetomamos las prácticas habituales en el próximo turno de calendario. ¡Muchas gracias!",
  },
  {
    id: "medical",
    name: "⚠️ Recordatorio Urgente de Apto Médico (EMDAP)",
    defaultTitle: "Regularización obligatoria de Apto Médico (EMDAP)",
    defaultAudience: "families",
    defaultBody:
      "Estimadas familias del club:\n\nPor reglamentación obligatoria de la Federación de Básquetbol y cobertura del seguro deportivo, les recordamos que todos los jugadores deben contar con el Apto Médico vigente para poder entrenar y disputar partidos.\n\nLes solicitamos acercar el certificado a la secretaría del club (Calle 33 N° 334) o cargarlo en el portal a la brevedad para evitar la inhabilitación del deportista.",
  },
  {
    id: "fee",
    name: "💳 Aviso de Cuota Social y Cobranzas",
    defaultTitle: "Información de cuota social y medios de pago",
    defaultAudience: "families",
    defaultBody:
      "Estimada comunidad de Estudiantes de Mercedes:\n\nLes recordamos que ya se encuentran al cobro las cuotas del mes. Pueden abonar en caja de secretaría (Lunes a Viernes de 16 a 21hs) o desde el Portal Familiar con Mercado Pago.\n\nDatos para transferencia directa:\nAlias: ESTUDIANTES.MERCEDES\n\n¡Gracias por acompañar el crecimiento de nuestro club en este año del Centenario!",
  },
  {
    id: "custom",
    name: "📢 Comunicado Institucional Libre",
    defaultTitle: "",
    defaultAudience: "all",
    defaultBody: "",
  },
];

export function AnnouncementComposer({ categories }: { categories: CategoryOption[] }) {
  const [selectedTemplate, setSelectedTemplate] = useState("match");
  const [title, setTitle] = useState(PRESET_TEMPLATES[0].defaultTitle);
  const [body, setBody] = useState(PRESET_TEMPLATES[0].defaultBody);
  const [audience, setAudience] = useState(PRESET_TEMPLATES[0].defaultAudience);
  const [categoryId, setCategoryId] = useState(categories[0]?.id || "");
  const [channel, setChannel] = useState("whatsapp");

  const handleTemplateChange = (templateId: string) => {
    setSelectedTemplate(templateId);
    const t = PRESET_TEMPLATES.find((item) => item.id === templateId);
    if (t) {
      if (t.defaultTitle) setTitle(t.defaultTitle);
      if (t.defaultBody) setBody(t.defaultBody);
      if (t.defaultAudience) setAudience(t.defaultAudience);
    }
  };

  return (
    <div className="space-y-6">
      {/* Selector de Plantilla Rápida */}
      <div className="rounded-2xl border border-brand-200 bg-brand-50/40 p-4 space-y-2">
        <label className="block text-xs font-bold uppercase tracking-wider text-brand-950">
          Plantillas Rápidas para Disparo Institucional:
        </label>
        <div className="flex flex-wrap gap-1.5">
          {PRESET_TEMPLATES.map((tmpl) => (
            <button
              key={tmpl.id}
              type="button"
              onClick={() => handleTemplateChange(tmpl.id)}
              className={`rounded-xl px-3 py-1.5 text-xs font-bold transition active:scale-95 ${
                selectedTemplate === tmpl.id
                  ? "bg-brand-600 text-white shadow-xs"
                  : "border border-brand-200 bg-white text-brand-900 hover:bg-brand-100"
              }`}
            >
              {tmpl.name}
            </button>
          ))}
        </div>
      </div>

      <ActionForm
        action={createAnnouncementAction}
        submitLabel="Crear Comunicado y Preparar Envío por WhatsApp →"
        cancelHref="/app/comunicaciones"
      >
        <div className="space-y-4">
          {/* Título */}
          <div>
            <label htmlFor="title" className="block text-xs font-bold uppercase tracking-wide text-ink-700">
              Título del Comunicado <span className="text-red-500">*</span>
            </label>
            <input
              id="title"
              name="title"
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Ej: Convocatoria para el partido del sábado"
              className="mt-1 w-full rounded-xl border border-ink-200 bg-white px-3.5 py-2.5 text-xs text-ink-900 shadow-xs focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* Audiencia */}
            <div>
              <label htmlFor="audience" className="block text-xs font-bold uppercase tracking-wide text-ink-700">
                Audiencia Destinataria <span className="text-red-500">*</span>
              </label>
              <select
                id="audience"
                name="audience"
                required
                value={audience}
                onChange={(e) => setAudience(e.target.value)}
                className="mt-1 w-full rounded-xl border border-ink-200 bg-white px-3.5 py-2 text-xs font-semibold text-ink-900 shadow-xs focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
              >
                <option value="category">Categoría específica (Ej. U15 Masc.)</option>
                <option value="all">Toda la comunidad del club</option>
                <option value="families">Solo familias y tutores</option>
                <option value="coaches">Solo entrenadores y cuerpo técnico</option>
                <option value="players">Solo jugadores</option>
              </select>
            </div>

            {/* Canal */}
            <div>
              <label htmlFor="channel" className="block text-xs font-bold uppercase tracking-wide text-ink-700">
                Canal de Entrega <span className="text-red-500">*</span>
              </label>
              <select
                id="channel"
                name="channel"
                required
                value={channel}
                onChange={(e) => setChannel(e.target.value)}
                className="mt-1 w-full rounded-xl border border-ink-200 bg-white px-3.5 py-2 text-xs font-semibold text-ink-900 shadow-xs focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
              >
                <option value="whatsapp">📲 WhatsApp + Notificación Interna (Recomendado)</option>
                <option value="in_app">🔔 Solo Bandeja Interna (In-App)</option>
              </select>
            </div>
          </div>

          {/* Categoría condicional si audience === "category" */}
          {audience === "category" && (
            <div className="rounded-xl border border-ink-200 bg-ink-50/60 p-3.5 space-y-1">
              <label htmlFor="categoryId" className="block text-xs font-bold text-ink-900 uppercase">
                Seleccionar Categoría de Básquetbol:
              </label>
              <select
                id="categoryId"
                name="categoryId"
                required={audience === "category"}
                value={categoryId}
                onChange={(e) => setCategoryId(e.target.value)}
                className="w-full rounded-lg border border-ink-300 bg-white px-3 py-2 text-xs font-semibold text-ink-900 shadow-xs focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
              >
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} ({c.gender === "male" ? "Masculino" : "Femenino"})
                  </option>
                ))}
              </select>
              <p className="text-[11px] text-ink-500">
                El comunicado se preparará para todos los padres y jugadores activos de esta categoría.
              </p>
            </div>
          )}

          {/* Mensaje / Cuerpo */}
          <div>
            <div className="flex items-center justify-between">
              <label htmlFor="body" className="block text-xs font-bold uppercase tracking-wide text-ink-700">
                Mensaje Institucional (Formato WhatsApp) <span className="text-red-500">*</span>
              </label>
              <span className="text-[11px] text-ink-400">
                Podés usar *negrita*, _cursiva_ y emojis.
              </span>
            </div>
            <textarea
              id="body"
              name="body"
              required
              rows={6}
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder="Escribí el texto del comunicado aquí..."
              className="mt-1 w-full rounded-xl border border-ink-200 bg-white p-3 text-xs text-ink-900 leading-relaxed shadow-xs focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500 font-mono"
            />
          </div>

          {/* Vista previa en tiempo real */}
          {body && (
            <div className="rounded-xl border border-emerald-200 bg-emerald-50/50 p-3.5 space-y-1.5">
              <p className="text-[10px] font-bold uppercase tracking-wider text-emerald-800">
                Vista previa del formato en WhatsApp:
              </p>
              <div className="rounded-lg bg-white p-3 text-xs text-ink-800 border border-emerald-100 shadow-2xs font-sans whitespace-pre-wrap">
                <span className="font-bold text-brand-900 block mb-1">
                  🏀 CLUB ATLÉTICO ESTUDIANTES DE MERCEDES
                </span>
                <span className="font-extrabold text-ink-900 block mb-1">
                  📌 {title || "TÍTULO DEL COMUNICADO"}
                </span>
                {body}
              </div>
            </div>
          )}
        </div>
      </ActionForm>
    </div>
  );
}
