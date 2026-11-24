import { type NextRequest, NextResponse } from "next/server";
import mercadopago from "@/lib/mercadopago";
import { db } from "@/db/client";
import * as schema from "@/db/schema";

/**
 * POST /api/payments/create
 *
 * Payload:
 *   {
 *     clubId: string;
 *     planId?: string;           // ID de suscripcion de SaaS
 *     chargeId?: string;         // ID de obligacion de cuota del club (charges)
 *     amountCents: number;
 *     description: string;
 *   }
 */
export async function POST(req: NextRequest): Promise<NextResponse> {
  const body = await req.json();
  const { clubId, planId, chargeId, amountCents, description } = body;

  if (!clubId || !amountCents || !description) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  const accessToken = process.env.MERCADO_PAGO_ACCESS_TOKEN;
  if (!accessToken) {
    return NextResponse.json(
      { error: "Mercado Pago token not configured" },
      { status: 500 }
    );
  }

  mercadopago.configure({ access_token: accessToken });

  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000";

  const preferencePayload = {
    items: [
      {
        title: description,
        unit_price: amountCents / 100,
        quantity: 1,
        currency_id: "ARS",
      },
    ],
    metadata: {
      clubId,
      ...(planId ? { planId } : {}),
      ...(chargeId ? { chargeId } : {}),
    },
    back_urls: {
      success: `${baseUrl}/app/cuotas?status=approved`,
      failure: `${baseUrl}/app/cuotas?status=failure`,
      pending: `${baseUrl}/app/cuotas?status=pending`,
    },
    auto_return: "approved",
  };

  try {
    const response = await mercadopago.preferences.create(preferencePayload);
    const { id, init_point } = response.body;

    // Registramos la intencion de pago en payments con referencia al id de la preferencia
    const [insertedPayment] = await db
      .insert(schema.payments)
      .values({
        clubId,
        amountCents,
        method: "mercadopago",
        status: "declared",
        reference: id as string,
        notes: `Mercado Pago Preference: ${id} - ${description}`,
      })
      .returning({ id: schema.payments.id });

    // Si viene asociado a una obligacion de cuota (charge), generamos el vinculo de imputacion
    if (chargeId && insertedPayment) {
      await db.insert(schema.paymentApplications).values({
        clubId,
        paymentId: insertedPayment.id,
        chargeId,
        amountCents,
      });
    }

    return NextResponse.json({ init_point, preferenceId: id });
  } catch (error: unknown) {
    console.error("Mercado Pago create preference error", error);
    return NextResponse.json(
      { error: "Failed to create checkout session" },
      { status: 500 }
    );
  }
}
