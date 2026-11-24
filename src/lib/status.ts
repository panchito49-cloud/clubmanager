import type { Role } from "./permissions";

type Tone = "neutral" | "success" | "warning" | "danger" | "info";

type StatusMeta = { label: string; tone: Tone };

export const chargeStatusMeta: Record<string, StatusMeta> = {
  pending: { label: "Pendiente", tone: "neutral" },
  partial: { label: "Pago parcial", tone: "info" },
  paid: { label: "Pagada", tone: "success" },
  void: { label: "Anulada", tone: "neutral" },
  overdue: { label: "Vencida", tone: "danger" },
};

export const paymentStatusMeta: Record<string, StatusMeta> = {
  declared: { label: "Declarado", tone: "warning" },
  under_review: { label: "En revisión", tone: "info" },
  approved: { label: "Aprobado", tone: "success" },
  rejected: { label: "Rechazado", tone: "danger" },
};

export const paymentMethodLabel: Record<string, string> = {
  cash: "Efectivo",
  transfer: "Transferencia",
  mercadopago: "Mercado Pago",
  other: "Otro",
};

export const attendanceStatusMeta: Record<string, StatusMeta> = {
  present: { label: "Presente", tone: "success" },
  absent: { label: "Ausente", tone: "danger" },
  late: { label: "Tarde", tone: "warning" },
  justified: { label: "Justificado", tone: "info" },
};

export const callupStatusMeta: Record<string, StatusMeta> = {
  invited: { label: "Invitado", tone: "warning" },
  confirmed: { label: "Confirmado", tone: "success" },
  declined: { label: "No asistirá", tone: "danger" },
};

export const tripStatusMeta: Record<string, StatusMeta> = {
  draft: { label: "Borrador", tone: "neutral" },
  open: { label: "Inscripción abierta", tone: "info" },
  confirmed: { label: "Confirmado", tone: "success" },
  closed: { label: "Cerrado", tone: "neutral" },
  cancelled: { label: "Cancelado", tone: "danger" },
};

export const trainingStatusMeta: Record<string, StatusMeta> = {
  scheduled: { label: "Programado", tone: "info" },
  completed: { label: "Realizado", tone: "success" },
  cancelled: { label: "Suspendido", tone: "danger" },
};

export const matchStatusMeta: Record<string, StatusMeta> = {
  scheduled: { label: "Programado", tone: "info" },
  played: { label: "Jugado", tone: "success" },
  cancelled: { label: "Suspendido", tone: "danger" },
};

export const playerStatusMeta: Record<string, StatusMeta> = {
  active: { label: "Activo", tone: "success" },
  inactive: { label: "Inactivo", tone: "neutral" },
};

export const clubStatusMeta: Record<string, StatusMeta> = {
  trial: { label: "Prueba", tone: "info" },
  active: { label: "Activo", tone: "success" },
  suspended: { label: "Suspendido", tone: "danger" },
  cancelled: { label: "Baja", tone: "neutral" },
};

export const subscriptionStatusMeta: Record<string, StatusMeta> = {
  trialing: { label: "En prueba", tone: "info" },
  active: { label: "Al día", tone: "success" },
  past_due: { label: "Pago pendiente", tone: "warning" },
  suspended: { label: "Suspendida", tone: "danger" },
  cancelled: { label: "Cancelada", tone: "neutral" },
};

export const audienceLabel: Record<string, string> = {
  all: "Todo el club",
  category: "Una categoría",
  families: "Familias",
  coaches: "Cuerpo técnico",
  players: "Jugadores",
};

export const roleTone: Record<Role, Tone> = {
  club_admin: "info",
  coach: "success",
  guardian: "warning",
  player: "neutral",
};

export type { Tone };
