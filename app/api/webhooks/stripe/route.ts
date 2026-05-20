import { NextResponse } from "next/server";
import type Stripe from "stripe";
import { and, eq } from "drizzle-orm";
import { getStripe } from "@/lib/stripe";
import { getCard, resolveVariant, type VariantKey } from "@/lib/catalog";
import { getDb } from "@/lib/db/client";
import { orders, processedEvents, stockOverrides } from "@/lib/db/schema";
import { decrementSleeveStock } from "@/lib/sleeves";
import {
  confirmStockReservation,
  releaseStockReservation,
} from "@/lib/stock-reservations";

export const runtime = "nodejs";

type CompactItem = [string, VariantKey, number];
type CompactSleeveItem = [string, number];

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

function decodeSleeves(metadata: Stripe.Metadata | null): CompactSleeveItem[] {
  if (!metadata) return [];
  const partsCount = Number(metadata.sleeves_parts ?? "0");
  let json = "";

  if (metadata.sleeves) {
    json = metadata.sleeves;
  } else if (partsCount > 0) {
    for (let i = 0; i < partsCount; i++) {
      const chunk = metadata[`sleeves_${i}`];
      if (!chunk) return [];
      json += chunk;
    }
  }

  if (!json) return [];

  try {
    const parsed = JSON.parse(json);
    if (!Array.isArray(parsed)) return [];
    return parsed as CompactSleeveItem[];
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
  const sleeveItems = decodeSleeves(session.metadata);
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
      userId: metadataValue(metadata.user_id),
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
      status: "paid",
    })
    .onConflictDoNothing();

  if (items.length === 0 || reservationId) {
    await decrementSleeveStock(
      sleeveItems.map(([sleeveId, quantity]) => ({ sleeveId, quantity })),
    );

    return NextResponse.json({
      received: true,
      items: items.length,
      sleeves: sleeveItems.length,
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

  await decrementSleeveStock(
    sleeveItems.map(([sleeveId, quantity]) => ({ sleeveId, quantity })),
  );

  return NextResponse.json({
    received: true,
    decremented: items.length,
    sleevesDecremented: sleeveItems.length,
    labelCreated: Boolean(mondialRelayLabelUrl),
    labelError: mondialRelayError,
  });
}
