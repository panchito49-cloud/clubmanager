"use client";

import { useState } from "react";
import { Icon } from "@/components/ui/icon";

interface PayButtonProps {
  clubId: string;
  chargeId?: string;
  planId?: string;
  amountCents: number;
  description: string;
  className?: string;
}

export function PayButton({
  clubId,
  chargeId,
  planId,
  amountCents,
  description,
  className = "",
}: PayButtonProps) {
  const [loading, setLoading] = useState(false);

  const handlePay = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/payments/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          clubId,
          chargeId,
          planId,
          amountCents,
          description,
        }),
      });

      const data = await res.json();
      if (data.init_point) {
        window.location.href = data.init_point;
      } else {
        alert(data.error || "No se pudo iniciar el checkout");
      }
    } catch (err) {
      console.error(err);
      alert("Error al conectar con la pasarela de pagos");
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      onClick={handlePay}
      disabled={loading}
      className={`inline-flex items-center gap-1.5 rounded-lg bg-sky-600 px-2.5 py-1 text-xs font-medium text-white transition hover:bg-sky-700 disabled:opacity-50 ${className}`}
      title="Pagar con Mercado Pago"
    >
      <Icon name="wallet" size={14} />
      {loading ? "Iniciando..." : "Pagar"}
    </button>
  );
}
