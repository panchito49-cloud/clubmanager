import "server-only";

import type { TenantContext } from "./tenant";

export const MODULE_LABELS: Record<string, string> = {
  jugadores: "Jugadores y familias",
  cuotas: "Cuotas y cobranzas",
  deportivo: "Entrenamientos y partidos",
  comunicaciones: "Comunicaciones",
  reportes: "Reportes",
  whatsapp: "WhatsApp Business",
  "multi-disciplina": "Multi-disciplina",
};

/**
 * Un modulo esta habilitado si el plan del club lo incluye.
 * Si el club no tiene plan asignado se permite el uso completo para no
 * bloquear clubes en proceso de alta (el limite real es el contrato).
 */
export function hasModule(ctx: TenantContext, moduleKey: string): boolean {
  if (!ctx.plan) return true;
  const modules = ctx.plan.features?.modules;
  if (!Array.isArray(modules)) return true;
  return modules.includes(moduleKey);
}

export function planModuleKeys(ctx: TenantContext): string[] {
  if (!ctx.plan) return Object.keys(MODULE_LABELS);
  const modules = ctx.plan.features?.modules;
  return Array.isArray(modules) ? modules : Object.keys(MODULE_LABELS);
}
