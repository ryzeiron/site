import { NextResponse } from "next/server";  
import type Stripe from "stripe";
import { and, eq } from "drizzle-orm";
import { getStripe } from "@/lib/stripe";
import { getCard, resolveVariant, type VariantKey } from "@/lib/catalog";
import { getDb } from "@/lib/db/client";
import { orders, processedEvents, stockOverrides } from "@/lib/db/schema";
import {
  confirmStockReservation,
  releaseStockReservation,
} from "@/lib/stock-reservations";
import {
  customerOrderEmail,
  orderAdminEmail,
  sendMail,
  sendToAdmin,
} from "@/lib/mail";

export const runtime = "nodejs";

type CompactItem = [string, VariantKey, number];

function decodeItems(metadata: Stripe.Metadata | null): CompactItem[] {
  if (!metadata) return [];
  const partsCount = Number(metadata.items_parts ?? "0");
  let json = "";
  if (metadata.items) {
    json = metadata.items;
  } else if (partsCount > 0) {
    for (let i = 0; i < partsCount; i++) {
      const chunk = metadata[`items_${i}`];
      if (!chunk) return [];
      json += chunk;
    }
  }
  if (!json) return [];
  try {
    const parsed = JSON.parse(json);
    if (!Array.isArray(parsed)) return [];
    return parsed as CompactItem[];
  } catch {
    return [];
  }
}

function metadataValue(value: string | null | undefined): string | null {
  return value && value.trim() ? value : null;
}

export async function POST(request: Request) {
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!secret) {
    return NextResponse.json(
      { error: "STRIPE_WEBHOOK_SECRET manquante." },
      { status: 500 },
    );
  }

  const signature = request.headers.get("stripe-signature");
  if (!signature) {
    return NextResponse.json({ error: "Signature manquante." }, { status: 400 });
  }

  const payload = await request.text();
  const stripe = getStripe();

  let event: Stripe.Event;
  try {
    event = await stripe.webhooks.constructEventAsync(payload, signature, secret);
  } catch (e) {
    const message = e instanceof Error ? e.message : "Signature invalide.";
    return NextResponse.json({ error: message }, { status: 400 });
  }

  if (
    event.type !== "checkout.session.completed" &&
    event.type !== "checkout.session.expired"
  ) {
    return NextResponse.json({ received: true, ignored: event.type });
  }

  const db = getDb();

  const seen = await db
    .insert(processedEvents)
    .values({ eventId: event.id })
    .onConflictDoNothing()
    .returning({ eventId: processedEvents.eventId });
  if (seen.length === 0) {
    return NextResponse.json({ received: true, duplicate: true });
  }

  const session = event.data.object as Stripe.Checkout.Session;
  const metadata = session.metadata ?? {};
  const reservationId = metadata.reservation_id;

  if (event.type === "checkout.session.expired") {
    if (reservationId) {
      await releaseStockReservation(reservationId);
    }

    return NextResponse.json({
      received: true,
      expired: true,
      reservationReleased: Boolean(reservationId),
    });
  }

  const items = decodeItems(session.metadata);
  const shippingDetails = session.collected_information?.shipping_details;
  const customerName =
    session.customer_details?.name ?? shippingDetails?.name ?? "Client";
  const customerEmail = session.customer_details?.email ?? "";
  const customerPhone = session.customer_details?.phone ?? "";
  const country = metadata.country ?? "FR";

  const mondialRelayExpeditionNumber: string | null = null;
  const mondialRelayLabelUrl: string | null = null;
  const mondialRelayError: string | null = null;

  if (reservationId) {
    await confirmStockReservation(reservationId, session.id);
  }

  await db
    .insert(orders)
    .values({
      id: session.id,
      stripeSessionId: session.id,
      customerEmail: metadataValue(customerEmail),
      customerName: metadataValue(customerName),
      customerPhone: metadataValue(customerPhone),
      country: metadataValue(country),
      relayCode: metadataValue(metadata.relay_code),
      relayName: metadataValue(metadata.relay_name),
      relayAddress: metadataValue(metadata.relay_address),
      relayPostcode: metadataValue(metadata.relay_postcode),
      relayCity: metadataValue(metadata.relay_city),
      mondialRelayExpeditionNumber,
      mondialRelayLabelUrl,
      mondialRelayError,
      status: metadata.relay_code ? "label_to_create" : "paid",
    })
    .onConflictDoNothing();

  // Notifications email (best-effort)
  try {
    const amountEuros = ((session.amount_total ?? 0) / 100).toFixed(2) + " EUR";
    const adminMail = orderAdminEmail({
      orderId: session.id,
      amount: amountEuros,
      customerEmail: customerEmail || null,
      customerName: customerName || null,
      customerPhone: customerPhone || null,
      country,
      relayName: metadataValue(metadata.relay_name),
      relayAddress: metadataValue(metadata.relay_address),
      relayPostcode: metadataValue(metadata.relay_postcode),
      relayCity: metadataValue(metadata.relay_city),
      relayCode: metadataValue(metadata.relay_code),
    });
    await sendToAdmin({
      subject: `[Commande PokeDel] ${customerName || customerEmail || session.id} - ${amountEuros}`,
      text: adminMail.text,
    });
    if (customerEmail) {
      const origin =
        process.env.NEXT_PUBLIC_SITE_URL ?? "https://site-self-eta-31.vercel.app";
      const customerMail = customerOrderEmail({
        orderId: session.id,
        amount: amountEuros,
        relayName: metadataValue(metadata.relay_name),
        relayAddress: metadataValue(metadata.relay_address),
        relayPostcode: metadataValue(metadata.relay_postcode),
        relayCity: metadataValue(metadata.relay_city),
        trackUrl: `${origin}/commande/${session.id}`,
      });
      await sendMail({
        to: customerEmail,
        subject: "Confirmation de votre commande PokeDel",
        text: customerMail.text,
      });
    }
  } catch {
    // ne pas faire echouer le webhook si l'email plante
  }

  if (items.length === 0 || reservationId) {
    return NextResponse.json({
      received: true,
      items: items.length,
      reservationConfirmed: Boolean(reservationId),
    });
  }

  for (const [cardId, variant, quantity] of items) {
    if (!cardId || !variant || !quantity || quantity <= 0) continue;
    const card = getCard(cardId);
    if (!card) continue;
    const v = resolveVariant(card, variant);

    const existing = await db
      .select()
      .from(stockOverrides)
      .where(
        and(
          eq(stockOverrides.cardId, cardId),
          eq(stockOverrides.variant, variant),
        ),
      )
      .limit(1);

    const currentStock = existing[0]?.stock ?? v.stock;
    const nextStock = Math.max(0, currentStock - quantity);

    await db
      .insert(stockOverrides)
      .values({ cardId, variant, stock: nextStock })
      .onConflictDoUpdate({
        target: [stockOverrides.cardId, stockOverrides.variant],
        set: { stock: nextStock, updatedAt: new Date() },
      });
  }
  return NextResponse.json({
    received: true,
    decremented: items.length,
    labelCreated: Boolean(mondialRelayLabelUrl),
    labelError: mondialRelayError,
  });
  
}
