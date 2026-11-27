/**
 * Utilidades para el Apto Médico / Certificado de Aptitud Física (EMDAP)
 */

export type MedicalCertificateStatus = "valid" | "warning" | "expired" | "missing";

export interface MedicalCertificateInfo {
  status: MedicalCertificateStatus;
  label: string;
  badgeClass: string;
  description: string;
  daysRemaining: number | null;
}

export function getMedicalCertificateInfo(expiresAt?: string | null): MedicalCertificateInfo {
  if (!expiresAt) {
    return {
      status: "missing",
      label: "Sin Apto Médico",
      badgeClass: "bg-rose-100 text-rose-800 border-rose-300",
      description: "No tiene certificado registrado en el club.",
      daysRemaining: null,
    };
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const [year, month, day] = expiresAt.split("-").map(Number);
  const expiration = new Date(year, month - 1, day);
  expiration.setHours(0, 0, 0, 0);

  const diffTime = expiration.getTime() - today.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  if (diffDays < 0) {
    return {
      status: "expired",
      label: "Apto Vencido",
      badgeClass: "bg-rose-100 text-rose-800 border-rose-300 font-semibold",
      description: `Venció hace ${Math.abs(diffDays)} día(s). No habilitado para partidos.`,
      daysRemaining: diffDays,
    };
  }

  if (diffDays <= 30) {
    return {
      status: "warning",
      label: `Vence en ${diffDays}d`,
      badgeClass: "bg-amber-100 text-amber-800 border-amber-300 font-semibold",
      description: `Por vencer en ${diffDays} día(s). Solicitar renovación.`,
      daysRemaining: diffDays,
    };
  }

  return {
    status: "valid",
    label: "Apto Vigente",
    badgeClass: "bg-emerald-100 text-emerald-800 border-emerald-300",
    description: `Vigente hasta el ${expiresAt}. Habilitado deportivamente.`,
    daysRemaining: diffDays,
  };
}
