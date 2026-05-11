import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { isAdmin } from "@/lib/admin/auth";
import { getDb } from "@/lib/db/client";
import { orders } from "@/lib/db/schema";
import { sendOrderShippedEmail } from "@/lib/email";

type OrderStatus =
  | "paid"
  | "label_to_create"
  | "label_created"
  | "shipped";

type Body = {
  orderId?: string;
  status?: string;
  expeditionNumber?: string;
  labelUrl?: string;
  sendShippingEmail?: boolean;
};

const ALLOWED_STATUSES: OrderStatus[] = [
  "paid",
  "label_to_create",
  "label_created",
  "shipped",
];

export async function POST(request: Request) {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: "Non autorise." }, { status: 401 });
  }

  let body: Body;

  try {
    body = (await request.json()) as Body;
  } catch {
    return NextResponse.json({ error: "Requete invalide." }, { status: 400 });
  }

  const orderId = body.orderId?.trim();
  const status = body.status?.trim();
  const expeditionNumber = cleanOptional(body.expeditionNumber);
  const labelUrl = cleanOptional(body.labelUrl);

  if (!orderId) {
    return NextResponse.json({ error: "Commande invalide." }, { status: 400 });
  }

  if (!status || !isOrderStatus(status)) {
    return NextResponse.json({ error: "Statut invalide." }, { status: 400 });
  }

  if (labelUrl && !isValidUrl(labelUrl)) {
    return NextResponse.json(
      { error: "Lien de bordereau invalide." },
      { status: 400 },
    );
  }

  try {
    const db = getDb();

    const existingRows = await db
      .select()
      .from(orders)
      .where(eq(orders.id, orderId))
      .limit(1);

    const existingOrder = existingRows[0];

    if (!existingOrder) {
      return NextResponse.json(
        { error: "Commande introuvable." },
        { status: 404 },
      );
    }

    const shouldSendShippingEmail =
      status === "shipped" &&
      (body.sendShippingEmail === true || existingOrder.status !== "shipped");

    if (shouldSendShippingEmail) {
      if (!existingOrder.customerEmail) {
        return NextResponse.json(
          { error: "Email client introuvable pour cette commande." },
          { status: 400 },
        );
      }

      if (!expeditionNumber) {
        return NextResponse.json(
          { error: "Numero de suivi obligatoire pour expedier la commande." },
          { status: 400 },
        );
      }

      await sendOrderShippedEmail({
        to: existingOrder.customerEmail,
        customerName: existingOrder.customerName,
        orderId: existingOrder.stripeSessionId,
        trackingNumber: expeditionNumber,
        labelUrl,
      });
    }

    await db
      .update(orders)
      .set({
        status,
        mondialRelayExpeditionNumber: expeditionNumber,
        mondialRelayLabelUrl: labelUrl,
        mondialRelayError: null,
      })
      .where(eq(orders.id, orderId));

    return NextResponse.json({
      ok: true,
      emailSent: shouldSendShippingEmail,
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Erreur inconnue.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

function cleanOptional(value: string | undefined): string | null {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

function isOrderStatus(value: string): value is OrderStatus {
  return ALLOWED_STATUSES.includes(value as OrderStatus);
}

function isValidUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}
