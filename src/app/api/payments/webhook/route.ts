import { type NextRequest, NextResponse } from "next/server";
import { db } from "@/db/client";
import * as schema from "@/db/schema";
import { eq, sql } from "drizzle-orm";

/**
 * POST /api/payments/webhook
 *
 * Webhook de notificaciones IPN / eventos de Mercado Pago
 */
export async function POST(req: NextRequest): Promise<NextResponse> {
  try {
    const payload = await req.json();
    const { type, data, metadata } = payload as {
      type?: string;
      data?: { id?: string; status?: string };
      metadata?: { clubId?: string; planId?: string; chargeId?: string };
    };

    if (type !== "payment" || !data?.id) {
      return NextResponse.json({ received: true, ignored: true }, { status: 200 });
    }

    const referenceId = data.id;
    const mpStatus = data.status; // "approved", "rejected", "pending", "in_process", etc.

    let paymentStatus: "declared" | "under_review" | "approved" | "rejected" = "declared";
    if (mpStatus === "approved") {
      paymentStatus = "approved";
    } else if (mpStatus === "rejected" || mpStatus === "cancelled") {
      paymentStatus = "rejected";
    } else {
      paymentStatus = "under_review";
    }

    // 1. Actualizar el pago asociado a la referencia de Mercado Pago
    await db
      .update(schema.payments)
      .set({
        status: paymentStatus,
        reviewedAt: paymentStatus === "approved" ? new Date() : null,
      })
      .where(eq(schema.payments.reference, referenceId));

    // 2. Si el pago fue aprobado y corresponde a una cuota (chargeId)
    if (paymentStatus === "approved" && metadata?.chargeId) {
      await db
        .update(schema.charges)
        .set({
          status: "paid",
          paidCents: sql`${schema.charges.totalCents}`,
        })
        .where(eq(schema.charges.id, metadata.chargeId));
    }

    // 3. Si corresponde a la suscripción del club (planId / SaaS)
    if (metadata?.planId) {
      const subStatus = paymentStatus === "approved" ? "active" : "past_due";
      await db
        .update(schema.subscriptions)
        .set({ status: subStatus })
        .where(eq(schema.subscriptions.id, metadata.planId));
    }

    return NextResponse.json({ received: true, status: paymentStatus });
  } catch (err: unknown) {
    console.error("Webhook processing error", err);
    return NextResponse.json({ error: "Processing failed" }, { status: 500 });
  }
}
