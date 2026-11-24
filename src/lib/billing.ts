/**
 * Reglas de negocio economicas (puras, sin acceso a datos).
 * Se usan tanto en la app como en el seed y en las pruebas.
 */

export type IndividualDiscount = {
  type: "percentage" | "fixed";
  /** Porcentaje entero (0-100) o centavos fijos. */
  value: number;
};

export type ChargeAmounts = {
  amountCents: number;
  discountCents: number;
  totalCents: number;
};

/**
 * Calcula el importe de una cuota aplicando:
 * 1. Beca/descuento individual del jugador.
 * 2. Descuento por hermano (se aplica al segundo hermano y siguientes).
 * El descuento total nunca supera el importe base.
 */
export function computeChargeAmounts(input: {
  amountCents: number;
  discount?: IndividualDiscount | null;
  siblingIndex?: number;
  siblingDiscountPct?: number;
}): ChargeAmounts {
  const { amountCents, discount, siblingIndex = 0, siblingDiscountPct = 0 } = input;

  let discountCents = 0;

  if (discount && discount.value > 0) {
    if (discount.type === "percentage") {
      const pct = Math.min(100, Math.max(0, discount.value));
      discountCents += Math.round((amountCents * pct) / 100);
    } else {
      discountCents += Math.max(0, discount.value);
    }
  }

  if (siblingIndex > 0 && siblingDiscountPct > 0) {
    const pct = Math.min(100, Math.max(0, siblingDiscountPct));
    discountCents += Math.round((amountCents * pct) / 100);
  }

  discountCents = Math.min(amountCents, discountCents);

  return {
    amountCents,
    discountCents,
    totalCents: amountCents - discountCents,
  };
}

export type AllocatableCharge = {
  id: string;
  dueDate: string;
  totalCents: number;
  paidCents: number;
};

export type Allocation = {
  chargeId: string;
  amountCents: number;
};

/**
 * Imputa un pago a las obligaciones mas antiguas primero.
 * Nunca imputa mas que el saldo de cada cuota ni mas que el importe del pago.
 */
export function allocateOldestFirst(
  charges: AllocatableCharge[],
  amountCents: number,
): { applications: Allocation[]; unappliedCents: number } {
  const applications: Allocation[] = [];
  let remaining = Math.max(0, amountCents);

  const sorted = [...charges].sort((a, b) =>
    a.dueDate === b.dueDate ? a.id.localeCompare(b.id) : a.dueDate < b.dueDate ? -1 : 1,
  );

  for (const charge of sorted) {
    if (remaining <= 0) break;
    const balance = Math.max(0, charge.totalCents - charge.paidCents);
    if (balance === 0) continue;

    const amount = Math.min(balance, remaining);
    applications.push({ chargeId: charge.id, amountCents: amount });
    remaining -= amount;
  }

  return { applications, unappliedCents: remaining };
}

/** Estado persistido de una cuota despues de imputar pagos. */
export function chargeStatusFor(
  totalCents: number,
  paidCents: number,
): "pending" | "partial" | "paid" {
  if (paidCents <= 0) return "pending";
  if (paidCents >= totalCents) return "paid";
  return "partial";
}

export function safeCents(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.round(value));
}
