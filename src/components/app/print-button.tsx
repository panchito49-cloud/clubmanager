"use client";

import { Icon } from "@/components/ui/icon";

export function PrintButton() {
  return (
    <button
      type="button"
      onClick={() => window.print()}
      className="inline-flex items-center gap-1.5 rounded-lg bg-brand-700 px-3.5 py-1.5 text-xs font-semibold text-white shadow-xs hover:bg-brand-800 transition"
    >
      <Icon name="file" size={14} /> Imprimir Comprobante
    </button>
  );
}
