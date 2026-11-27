"use client";

import { useState } from "react";
import { formatMoney } from "@/lib/format";
import { Icon } from "@/components/ui/icon";
import { Field, Input, Select, Textarea } from "@/components/ui/form";
import { SubmitButton } from "@/components/ui/submit";
import type { Overdue90Charge } from "@/server/data/finance";

interface RefinancingCalculatorProps {
  familyId: string;
  familyName: string;
  initialCharges: Overdue90Charge[];
  action: (formData: FormData) => void;
}

export function RefinancingCalculator({
  familyId,
  familyName,
  initialCharges,
  action,
}: RefinancingCalculatorProps) {
  const [selectedIds, setSelectedIds] = useState<string[]>(
    initialCharges.map((c) => c.id),
  );
  const [installments, setInstallments] = useState<number>(3);
  const [discountPct, setDiscountPct] = useState<number>(10); // 10% de incentivo por defecto
  
  // Fecha primer vencimiento por defecto: 10 del mes siguiente
  const today = new Date();
  const nextMonth = new Date(today.getFullYear(), today.getMonth() + 1, 10);
  const defaultFirstDue = nextMonth.toISOString().slice(0, 10);
  const [firstDueDate, setFirstDueDate] = useState<string>(defaultFirstDue);

  const toggleCharge = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id],
    );
  };

  const selectAll = () => setSelectedIds(initialCharges.map((c) => c.id));
  const selectOnlyCritical = () =>
    setSelectedIds(initialCharges.filter((c) => c.isCritical).map((c) => c.id));

  // Cálculos dinámicos
  const selectedCharges = initialCharges.filter((c) => selectedIds.includes(c.id));
  const originalDebtCents = selectedCharges.reduce(
    (sum, c) => sum + c.balanceCents,
    0,
  );
  const discountCents = Math.round((originalDebtCents * discountPct) / 100);
  const financedCents = Math.max(0, originalDebtCents - discountCents);

  const baseInstallment = Math.floor(financedCents / installments);
  const remainder = financedCents % installments;

  // Cronograma proyectado
  const schedule: Array<{ number: number; dueDate: string; amountCents: number }> = [];
  if (firstDueDate && /^\d{4}-\d{2}-\d{2}$/.test(firstDueDate)) {
    const [y, m, d] = firstDueDate.split("-").map(Number);
    for (let i = 1; i <= installments; i++) {
      const dateObj = new Date(Date.UTC(y, m - 1 + (i - 1), d));
      const yStr = dateObj.getUTCFullYear();
      const mStr = String(dateObj.getUTCMonth() + 1).padStart(2, "0");
      const dStr = String(dateObj.getUTCDate()).padStart(2, "0");
      schedule.push({
        number: i,
        dueDate: `${dStr}/${mStr}/${yStr}`,
        amountCents: baseInstallment + (i === installments ? remainder : 0),
      });
    }
  }

  return (
    <form action={action} className="space-y-6">
      <input type="hidden" name="familyId" value={familyId} />
      <input type="hidden" name="chargeIds" value={JSON.stringify(selectedIds)} />
      <input type="hidden" name="installments" value={installments} />
      <input type="hidden" name="discountPct" value={discountPct} />
      <input type="hidden" name="firstDueDate" value={firstDueDate} />

      <div className="grid gap-6 lg:grid-cols-12">
        {/* Panel izquierdo: Selección de cuotas a refinanciar */}
        <div className="lg:col-span-7 space-y-4">
          <div className="rounded-xl border border-ink-200 bg-white p-5 shadow-xs">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-ink-100 pb-3">
              <div>
                <h2 className="text-sm font-bold text-ink-900">
                  Cuotas de la {familyName} a incluir en el plan
                </h2>
                <p className="text-xs text-ink-500">
                  {selectedCharges.length} de {initialCharges.length} cuotas seleccionadas
                </p>
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={selectOnlyCritical}
                  className="rounded bg-rose-50 px-2 py-1 text-[11px] font-medium text-rose-700 hover:bg-rose-100"
                >
                  Solo mora &gt;90d
                </button>
                <button
                  type="button"
                  onClick={selectAll}
                  className="rounded bg-ink-100 px-2 py-1 text-[11px] font-medium text-ink-700 hover:bg-ink-200"
                >
                  Todas las vencidas
                </button>
              </div>
            </div>

            <div className="mt-3 divide-y divide-ink-100 max-h-80 overflow-y-auto">
              {initialCharges.map((ch) => {
                const isChecked = selectedIds.includes(ch.id);
                return (
                  <label
                    key={ch.id}
                    className={`flex items-start gap-3 py-3 px-2 rounded-lg cursor-pointer transition ${
                      isChecked ? "bg-brand-50/40" : "hover:bg-ink-50"
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={isChecked}
                      onChange={() => toggleCharge(ch.id)}
                      className="mt-1 h-4 w-4 rounded border-ink-300 text-brand-700 focus:ring-brand-500"
                    />
                    <div className="flex-1 text-xs">
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-ink-900">
                          {ch.concept} {ch.period ? `(${ch.period})` : ""}
                        </span>
                        <span className="font-mono font-bold text-ink-900">
                          {formatMoney(ch.balanceCents)}
                        </span>
                      </div>
                      <div className="mt-0.5 flex flex-wrap items-center gap-2 text-ink-500">
                        <span>{ch.playerName || "Sin asignar"}</span>
                        <span>·</span>
                        <span>Venció: {ch.dueDate}</span>
                        {ch.isCritical ? (
                          <span className="rounded-full bg-rose-100 px-1.5 py-0.2 text-[10px] font-bold text-rose-800">
                            ⚠ {ch.daysOverdue} días de mora
                          </span>
                        ) : (
                          <span className="text-[10px] text-amber-700 font-medium">
                            {ch.daysOverdue} días de mora
                          </span>
                        )}
                      </div>
                    </div>
                  </label>
                );
              })}
            </div>
          </div>

          {/* Configuración de Cuotas y Quita */}
          <div className="rounded-xl border border-ink-200 bg-white p-5 shadow-xs space-y-4">
            <h3 className="text-sm font-bold text-ink-900">Condiciones del Acuerdo</h3>

            <div className="grid gap-4 sm:grid-cols-2">
              <Field
                label="Cantidad de cuotas mensuales"
                hint="Plazo para financiar la deuda consolidada"
              >
                <Select
                  value={installments}
                  onChange={(e) => setInstallments(Number(e.target.value))}
                >
                  <option value={2}>2 cuotas mensuales</option>
                  <option value={3}>3 cuotas mensuales (Recomendado)</option>
                  <option value={4}>4 cuotas mensuales</option>
                  <option value={6}>6 cuotas mensuales</option>
                  <option value={12}>12 cuotas mensuales</option>
                </Select>
              </Field>

              <Field
                label="Quita de regularización institucional"
                hint="Incentivo del club para cancelar la deuda"
              >
                <Select
                  value={discountPct}
                  onChange={(e) => setDiscountPct(Number(e.target.value))}
                >
                  <option value={0}>Sin quita (0%)</option>
                  <option value={10}>Quita del 10% (Recomendado)</option>
                  <option value={15}>Quita del 15%</option>
                  <option value={20}>Quita del 20%</option>
                  <option value={30}>Quita del 30%</option>
                </Select>
              </Field>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <Field
                label="Fecha de la primera cuota"
                hint="Día en que vence el primer pago"
              >
                <Input
                  type="date"
                  value={firstDueDate}
                  onChange={(e) => setFirstDueDate(e.target.value)}
                  required
                />
              </Field>

              <Field
                label="Observaciones del convenio"
                hint="Ej: Aprobado por tesorería"
              >
                <Input
                  name="notes"
                  placeholder="Ej: Plan de regularización acordado en secretaría."
                />
              </Field>
            </div>
          </div>
        </div>

        {/* Panel derecho: Simulador en vivo y acción */}
        <div className="lg:col-span-5 space-y-4">
          <div className="rounded-xl border-2 border-brand-800 bg-white p-5 shadow-sm">
            <span className="text-[10px] font-bold uppercase tracking-wider text-brand-800">
              Simulador del Plan de Facilidades
            </span>
            <h3 className="text-lg font-black text-ink-950 font-serif">
              Resumen Económico del Acuerdo
            </h3>

            {/* Comparativa Deuda vs Financiación */}
            <div className="mt-4 space-y-2.5 rounded-lg bg-ink-50 p-4 text-xs">
              <div className="flex justify-between items-center text-ink-600">
                <span>Deuda original acumulada:</span>
                <span className="font-mono font-medium">{formatMoney(originalDebtCents)}</span>
              </div>
              {discountPct > 0 ? (
                <div className="flex justify-between items-center text-emerald-700 font-medium">
                  <span>Bonificación ({discountPct}%):</span>
                  <span className="font-mono">-{formatMoney(discountCents)}</span>
                </div>
              ) : null}
              <div className="pt-2 border-t border-ink-200 flex justify-between items-baseline">
                <span className="font-bold text-ink-900 text-sm">Total financiado:</span>
                <span className="font-mono font-black text-brand-900 text-xl">
                  {formatMoney(financedCents)}
                </span>
              </div>
            </div>

            {/* Cronograma Proyectado */}
            <div className="mt-5">
              <h4 className="text-xs font-bold uppercase tracking-wider text-ink-600 mb-2">
                Cronograma de Cuotas ({installments} pagos)
              </h4>
              <div className="divide-y divide-ink-100 rounded-lg border border-ink-200 overflow-hidden text-xs">
                {schedule.map((item) => (
                  <div
                    key={item.number}
                    className="flex justify-between items-center p-2.5 bg-white hover:bg-ink-50/50"
                  >
                    <div>
                      <span className="font-semibold text-ink-900">
                        Cuota {item.number}/{installments}
                      </span>
                      <span className="block text-[11px] text-ink-500">
                        Vence: {item.dueDate}
                      </span>
                    </div>
                    <span className="font-mono font-bold text-ink-900">
                      {formatMoney(item.amountCents)}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Botón de Confirmación */}
            <div className="mt-6 pt-4 border-t border-ink-100">
              <button
                type="submit"
                disabled={selectedCharges.length === 0}
                className="w-full rounded-lg bg-brand-700 py-3 text-center text-xs font-bold uppercase tracking-wider text-white shadow-xs hover:bg-brand-800 disabled:opacity-50 transition active:scale-[0.99]"
              >
                🤝 Confirmar y Emitir Convenio de Pago
              </button>
              <p className="mt-2 text-center text-[11px] text-ink-400">
                Al confirmar, se anulan las cuotas anteriores y se generan las nuevas cuotas del plan con el convenio oficial.
              </p>
            </div>
          </div>

          <div className="rounded-lg bg-sky-50 border border-sky-200 p-4 text-xs text-sky-900 space-y-1">
            <div className="flex items-center gap-1.5 font-bold text-sky-950">
              <Icon name="sparkles" size={14} /> Inteligencia de Morosidad
            </div>
            <p>
              El sistema detecta automáticamente deudas superiores a 90 días para evitar la desafiliación deportiva del jugador, permitiendo regularizar mediante un convenio formal con firma de autoridades del club.
            </p>
          </div>
        </div>
      </div>
    </form>
  );
}
