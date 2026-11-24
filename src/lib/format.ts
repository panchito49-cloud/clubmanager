export const TZ_AR = "America/Argentina/Buenos_Aires";

const money = new Intl.NumberFormat("es-AR", {
  style: "currency",
  currency: "ARS",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

/** Centavos -> "$ 12.345,00" */
export function formatMoney(cents: number | null | undefined): string {
  return money.format((cents ?? 0) / 100);
}

/** Centavos -> "12345,00" (para inputs de formulario) */
export function centsToInput(cents: number | null | undefined): string {
  return ((cents ?? 0) / 100).toFixed(2).replace(".", ",");
}

/**
 * Acepta "12.345,50", "12345.5", "$ 12345" o "12345".
 * Devuelve centavos enteros. Lanza error si no es un numero valido.
 */
export function parseMoneyToCents(raw: FormDataEntryValue | null): number {
  const text = String(raw ?? "").trim();
  if (!text) return 0;

  let normalized = text.replace(/[^\d.,-]/g, "");
  if (!normalized || normalized === "-") throw new Error("Importe invalido");

  const hasComma = normalized.includes(",");
  const hasDot = normalized.includes(".");

  if (hasComma && hasDot) {
    normalized = normalized.replace(/\./g, "").replace(",", ".");
  } else if (hasComma) {
    normalized = normalized.replace(",", ".");
  } else if (hasDot) {
    // En Argentina el punto suele ser separador de miles: 12.345 => 12345
    const decimals = normalized.split(".").pop() ?? "";
    if (decimals.length === 3) normalized = normalized.replace(/\./g, "");
  }

  const value = Number(normalized);
  if (!Number.isFinite(value)) throw new Error("Importe invalido");

  return Math.round(value * 100);
}

/** "YYYY-MM-DD" -> "12/03/2026" (sin corrimientos de zona horaria) */
export function formatDate(value: string | Date | null | undefined): string {
  if (!value) return "—";
  if (typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value)) {
    const [y, m, d] = value.split("-");
    return `${d}/${m}/${y}`;
  }
  const date = typeof value === "string" ? new Date(value) : value;
  if (Number.isNaN(date.getTime())) return "—";
  return new Intl.DateTimeFormat("es-AR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    timeZone: TZ_AR,
  }).format(date);
}

/** Fecha y hora en horario argentino: "sáb 14/03 · 18:30" */
export function formatDateTime(
  value: string | Date | null | undefined,
  opts: { withWeekday?: boolean; withTime?: boolean } = {},
): string {
  if (!value) return "—";
  const date = typeof value === "string" ? new Date(value) : value;
  if (Number.isNaN(date.getTime())) return "—";

  const { withWeekday = true, withTime = true } = opts;
  const datePart = new Intl.DateTimeFormat("es-AR", {
    ...(withWeekday ? { weekday: "short" as const } : {}),
    day: "2-digit",
    month: "2-digit",
    timeZone: TZ_AR,
  }).format(date);

  if (!withTime) return datePart;

  const timePart = new Intl.DateTimeFormat("es-AR", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    timeZone: TZ_AR,
  }).format(date);

  return `${datePart} · ${timePart}`;
}

export function formatTime(value: string | Date): string {
  const date = typeof value === "string" ? new Date(value) : value;
  return new Intl.DateTimeFormat("es-AR", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    timeZone: TZ_AR,
  }).format(date);
}

/** Fecha actual en Argentina como "YYYY-MM-DD". */
export function todayISO(): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: TZ_AR,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

/** Periodo actual "YYYY-MM". */
export function currentPeriod(): string {
  return todayISO().slice(0, 7);
}

export function monthLabel(period: string): string {
  const [year, month] = period.split("-").map(Number);
  if (!year || !month) return period;
  return new Intl.DateTimeFormat("es-AR", {
    month: "long",
    year: "numeric",
    timeZone: TZ_AR,
  }).format(new Date(Date.UTC(year, month - 1, 15)));
}

export function shiftMonth(period: string, delta: number): string {
  const [year, month] = period.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1 + delta, 1));
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}`;
}

export function daysLate(dueDate: string, reference = todayISO()): number {
  const due = Date.parse(`${dueDate}T00:00:00Z`);
  const now = Date.parse(`${reference}T00:00:00Z`);
  return Math.floor((now - due) / 86_400_000);
}

export function isOverdue(
  dueDate: string,
  status: string,
  graceDays = 0,
): boolean {
  if (status === "paid" || status === "void") return false;
  return daysLate(dueDate) > graceDays;
}

export function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}

export function ageFrom(birthDate: string | null | undefined): number | null {
  if (!birthDate) return null;
  const birth = new Date(`${birthDate}T00:00:00Z`);
  if (Number.isNaN(birth.getTime())) return null;
  const now = new Date();
  let age = now.getUTCFullYear() - birth.getUTCFullYear();
  const beforeBirthday =
    now.getUTCMonth() < birth.getUTCMonth() ||
    (now.getUTCMonth() === birth.getUTCMonth() &&
      now.getUTCDate() < birth.getUTCDate());
  if (beforeBirthday) age -= 1;
  return age;
}
