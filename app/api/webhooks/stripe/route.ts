import { NextResponse } from "next/server";
import type Stripe from "stripe";
import { and, eq } from "drizzle-orm";
import { getStripe } from "@/lib/stripe";
import { getCard, resolveVariant, type VariantKey } from "@/lib/catalog";
import { getDb } from "@/lib/db/client";
import {
  favoriteCards,
  favoriteSleeves,
  orders,
  processedEvents,
  stockOverrides,
  users,
} from "@/lib/db/schema";
import {
  customerOrderEmail,
  orderAdminEmail,
  sendMail,
  sendToAdmin,
} from "@/lib/mail";
import { normalizeSiteUrl } from "@/lib/site-url";
import { decrementSleeveStock } from "@/lib/sleeves";
import {
  confirmStockReservation,
  releaseStockReservation,
} from "@/lib/stock-reservations";
import { revalidatePublicStockCache } from "@/lib/stock";

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

function formatAmount(cents: number | null) {
  return new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency: "EUR",
  }).format((cents ?? 0) / 100);
}

function discordValue(value: string | null | undefined, fallback = "-") {
  const cleaned = value?.trim();
  if (!cleaned) return fallback;
  return cleaned.length > 1000 ? `${cleaned.slice(0, 997)}...` : cleaned;
}

async function sendDiscordOrderNotification({
  session,
  amount,
  customerEmail,
  customerName,
  customerPhone,
  country,
  metadata,
}: {
  session: Stripe.Checkout.Session;
  amount: string;
  customerEmail: string;
  customerName: string;
  customerPhone: string;
  country: string;
  metadata: Stripe.Metadata;
}) {
  const webhookUrl = process.env.DISCORD_ORDER_WEBHOOK_URL?.trim();
  if (!webhookUrl) return;

  const siteUrl = normalizeSiteUrl(
    process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000",
  );
  const adminOrdersUrl = `${siteUrl}/admin/commandes`;
  const relayLine = [
    metadataValue(metadata.relay_name),
    metadataValue(metadata.relay_address),
    [metadataValue(metadata.relay_postcode), metadataValue(metadata.relay_city)]
      .filter(Boolean)
      .join(" "),
    metadataValue(metadata.relay_code)
      ? `Code relais : ${metadataValue(metadata.relay_code)}`
      : null,
  ]
    .filter(Boolean)
    .join("\n");

  const response = await fetch(webhookUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      username: "PokeDel62",
      embeds: [
        {
          title: "Nouvelle commande payee",
          color: 0x7c3aed,
          description: `[Ouvrir les commandes admin](${adminOrdersUrl})`,
          fields: [
            { name: "Montant", value: amount, inline: true },
            { name: "Client", value: discordValue(customerName), inline: true },
            { name: "Email", value: discordValue(customerEmail), inline: false },
            {
              name: "Telephone",
              value: discordValue(customerPhone),
              inline: true,
            },
            { name: "Pays", value: discordValue(country), inline: true },
            {
              name: "Point relais",
              value: discordValue(relayLine),
              inline: false,
            },
            { name: "ID Stripe", value: `\`${session.id}\``, inline: false },
          ],
          timestamp: new Date().toISOString(),
        },
      ],
    }),
  });

  if (!response.ok) {
    throw new Error(`Discord webhook error ${response.status}`);
  }
}

async function removePurchasedFavorites({
  userId,
  customerEmail,
  items,
  sleeveItems,
}: {
  userId: string | null;
  customerEmail?: string | null;
  items: CompactItem[];
  sleeveItems: CompactSleeveItem[];
}) {
  const db = getDb();
  let favoriteUserId = userId;

  if (!favoriteUserId && customerEmail?.trim()) {
    const [matchedUser] = await db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.email, customerEmail.trim().toLowerCase()))
      .limit(1);

    favoriteUserId = matchedUser?.id ?? null;
  }

  if (!favoriteUserId) return;

  for (const [cardId, variant] of items) {
    if (!cardId || !variant) continue;

    await db.delete(favoriteCards).where(
      and(
        eq(favoriteCards.userId, favoriteUserId),
        eq(favoriteCards.cardId, cardId),
        eq(favoriteCards.variant, variant),
      ),
    );
  }

  for (const [sleeveId] of sleeveItems) {
    if (!sleeveId) continue;

    await db.delete(favoriteSleeves).where(
      and(
        eq(favoriteSleeves.userId, favoriteUserId),
        eq(favoriteSleeves.sleeveId, sleeveId),
      ),
    );
  }
}

async function removePurchasedFavoritesFromSession(
  session: Stripe.Checkout.Session,
) {
  const metadata = session.metadata ?? {};
  await removePurchasedFavorites({
    userId: metadataValue(metadata.user_id),
    customerEmail: session.customer_details?.email ?? null,
    items: decodeItems(metadata),
    sleeveItems: decodeSleeves(metadata),
  });
}

async function sendOrderNotifications({
  session,
  customerEmail,
  customerName,
  customerPhone,
  country,
  metadata,
}: {
  session: Stripe.Checkout.Session;
  customerEmail: string;
  customerName: string;
  customerPhone: string;
  country: string;
  metadata: Stripe.Metadata;
}) {
  const amount = formatAmount(session.amount_total);
  const siteUrl = normalizeSiteUrl(
    process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000",
  );
  const trackUrl = `${siteUrl}/suivi-commande/${session.id}`;

  const adminEmail = orderAdminEmail({
    orderId: session.id,
    amount,
    customerEmail,
    customerName,
    customerPhone,
    country,
    relayName: metadataValue(metadata.relay_name),
    relayAddress: metadataValue(metadata.relay_address),
    relayPostcode: metadataValue(metadata.relay_postcode),
    relayCity: metadataValue(metadata.relay_city),
    relayCode: metadataValue(metadata.relay_code),
  });

  await sendToAdmin({
    subject: `[PokeDel] Nouvelle commande payée - ${amount}`,
    text: adminEmail.text,
  }).catch(() => ({ ok: false }));

  await sendDiscordOrderNotification({
    session,
    amount,
    customerEmail,
    customerName,
    customerPhone,
    country,
    metadata,
  }).catch(() => ({ ok: false }));

  if (customerEmail) {
    const customerEmailContent = customerOrderEmail({
      orderId: session.id,
      amount,
      relayName: metadataValue(metadata.relay_name),
      relayAddress: metadataValue(metadata.relay_address),
      relayPostcode: metadataValue(metadata.relay_postcode),
      relayCity: metadataValue(metadata.relay_city),
      trackUrl,
    });

    await sendMail({
      to: customerEmail,
      subject: "Merci pour votre commande PokeDel",
      text: customerEmailContent.text,
    }).catch(() => ({ ok: false }));
  }
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

  const session = event.data.object as Stripe.Checkout.Session;
  const metadata = session.metadata ?? {};
  const reservationId = metadata.reservation_id;
  const db = getDb();

  const seen = await db
    .insert(processedEvents)
    .values({ eventId: event.id })
    .onConflictDoNothing()
    .returning({ eventId: processedEvents.eventId });

  if (seen.length === 0) {
    if (event.type === "checkout.session.completed") {
      const existingOrder = await db
        .select({ id: orders.id })
        .from(orders)
        .where(eq(orders.id, session.id))
        .limit(1);

      if (existingOrder.length === 0) {
        // A previous webhook attempt marked the event as processed before the
        // order was saved. Continue so a manual Stripe resend can repair it.
      } else {
        await removePurchasedFavoritesFromSession(session).catch(() => {});
        return NextResponse.json({ received: true, duplicate: true });
      }
    } else {
      return NextResponse.json({ received: true, duplicate: true });
    }
  }

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
  const userId = metadataValue(metadata.user_id);

  const mondialRelayExpeditionNumber: string | null = null;
  const mondialRelayLabelUrl: string | null = null;
  const mondialRelayError: string | null = null;

  const insertedOrders = await db
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
    .onConflictDoNothing()
    .returning({ id: orders.id });

  if (insertedOrders.length > 0) {
    await sendOrderNotifications({
      session,
      customerEmail,
      customerName,
      customerPhone,
      country,
      metadata,
    });
  }

  let stockUpdateError: string | null = null;
  let favoritesCleanupError: string | null = null;

  try {
    if (reservationId) {
      await confirmStockReservation(reservationId, session.id);
    }

    await removePurchasedFavorites({
      userId,
      customerEmail,
      items,
      sleeveItems,
    }).catch((error) => {
      favoritesCleanupError =
        error instanceof Error
          ? error.message
          : "Erreur suppression favoris achetes.";
    });

    if (items.length === 0 || reservationId) {
      await decrementSleeveStock(
        sleeveItems.map(([sleeveId, quantity]) => ({ sleeveId, quantity })),
      );
      if (items.length > 0) {
        revalidatePublicStockCache();
      }

      return NextResponse.json({
        received: true,
        items: items.length,
        sleeves: sleeveItems.length,
        reservationConfirmed: Boolean(reservationId),
        favoritesCleanupError,
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
    if (items.length > 0) {
      revalidatePublicStockCache();
    }
  } catch (error) {
    stockUpdateError =
      error instanceof Error ? error.message : "Erreur mise a jour stock.";
  }

  return NextResponse.json({
    received: true,
    decremented: items.length,
    sleevesDecremented: sleeveItems.length,
    labelCreated: Boolean(mondialRelayLabelUrl),
    labelError: mondialRelayError,
    stockUpdateError,
    favoritesCleanupError,
  });
}
