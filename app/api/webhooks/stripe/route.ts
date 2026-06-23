import { NextResponse } from "next/server";
import type Stripe from "stripe";
import { and, eq } from "drizzle-orm";
import { getStripe } from "@/lib/stripe";
import { getCard, resolveVariant, type VariantKey } from "@/lib/catalog";
import { getDb } from "@/lib/db/client";
import {
  favoriteCards,
  favoriteSleeves,
  cartSnapshots,
  orderAnalytics,
  orders,
  processedEvents,
  stockOverrides,
  users,
} from "@/lib/db/schema";
import {
  discordAdminUrl,
  sendDiscordErrorNotification,
  sendDiscordNotification,
} from "@/lib/discord";
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
import { decodeCompactMetadata } from "@/lib/stripe-order-metadata";

export const runtime = "nodejs";

type CompactItem = [string, VariantKey, number, number?];
type CompactSleeveItem = [string, number, number?];

const LOW_STOCK_ALERT_THRESHOLD = Math.max(
  0,
  Number.parseInt(process.env.LOW_STOCK_ALERT_THRESHOLD ?? "1", 10) || 1,
);

function decodeItems(metadata: Stripe.Metadata | null): CompactItem[] {
  return decodeCompactMetadata(metadata, "items").filter(
    (item): item is CompactItem =>
      Array.isArray(item) &&
      typeof item[0] === "string" &&
      typeof item[1] === "string" &&
      typeof item[2] === "number" &&
      (typeof item[3] === "undefined" ||
        item[3] === null ||
        typeof item[3] === "number"),
  );
}

function decodeSleeves(metadata: Stripe.Metadata | null): CompactSleeveItem[] {
  return decodeCompactMetadata(metadata, "sleeves").filter(
    (item): item is CompactSleeveItem =>
      Array.isArray(item) &&
      typeof item[0] === "string" &&
      typeof item[1] === "number" &&
      (typeof item[2] === "undefined" ||
        item[2] === null ||
        typeof item[2] === "number"),
  );
}

function metadataValue(value: string | null | undefined): string | null {
  return value && value.trim() ? value : null;
}

async function removeCartSnapshotFromSession(session: Stripe.Checkout.Session) {
  const cartId = metadataValue(session.metadata?.cart_id);
  if (!cartId) return;

  await getDb().delete(cartSnapshots).where(eq(cartSnapshots.cartId, cartId));
}

function formatAmount(cents: number | null) {
  return new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency: "EUR",
  }).format((cents ?? 0) / 100);
}

async function saveOrderAnalyticsFromSession(session: Stripe.Checkout.Session) {
  const values = {
    orderId: session.id,
    stripeSessionId: session.id,
    amountSubtotalCents: session.amount_subtotal ?? null,
    amountTotalCents: session.amount_total ?? null,
    shippingTotalCents: session.shipping_cost?.amount_total ?? null,
    discountTotalCents: session.total_details?.amount_discount ?? 0,
    currency: session.currency ?? "eur",
  };

  await getDb()
    .insert(orderAnalytics)
    .values(values)
    .onConflictDoUpdate({
      target: orderAnalytics.orderId,
      set: values,
    });
}

function countExpectedCardReservations(items: CompactItem[]) {
  const keys = new Set<string>();

  for (const [cardId, variant, quantity] of items) {
    if (!cardId || !variant || !quantity || quantity <= 0) continue;
    keys.add(`${cardId}:${variant}`);
  }

  return keys.size;
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
  const adminOrdersUrl = discordAdminUrl("/admin/commandes");
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
  const fields = [
    { name: "Montant", value: amount, inline: true },
    { name: "Client", value: customerName, inline: true },
    { name: "Email", value: customerEmail, inline: false },
    { name: "Telephone", value: customerPhone, inline: true },
    { name: "Pays", value: country, inline: true },
    { name: "Point relais", value: relayLine, inline: false },
    { name: "ID Stripe", value: `\`${session.id}\``, inline: false },
  ];

  await Promise.all([
    sendDiscordNotification("orders", {
      title: "Nouvelle commande payee",
      description: `[Ouvrir les commandes admin](${adminOrdersUrl})`,
      fields,
    }).catch(() => false),
    sendDiscordNotification("preparation", {
      title: "Commande a preparer",
      description: `[Ouvrir les commandes admin](${adminOrdersUrl})`,
      fields,
    }).catch(() => false),
  ]);
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

async function sendLowStockAfterOrder(
  alerts: {
    name: string;
    number: string;
    rarity: string;
    variant: string;
    stock: number;
  }[],
) {
  if (alerts.length === 0) return;

  await sendDiscordNotification("stock", {
    title: alerts.length === 1 ? "Stock faible apres commande" : "Stocks faibles apres commande",
    description: `[Ouvrir l'admin stock](${discordAdminUrl("/admin")})`,
    fields: alerts.slice(0, 10).map((alert) => ({
      name: `${alert.name} ${alert.number}`,
      value: `${alert.rarity} - variante ${alert.variant} - stock ${alert.stock}`,
      inline: false,
    })),
  }).catch(() => false);
}

async function sendLowStockSleevesAfterOrder(
  alerts: { sleeveId: string; name: string; stock: number }[],
) {
  const lowStock = alerts.filter(
    (alert) => alert.stock <= LOW_STOCK_ALERT_THRESHOLD,
  );
  if (lowStock.length === 0) return;

  await sendDiscordNotification("stock", {
    title:
      lowStock.length === 1
        ? "Stock faible sleeve apres commande"
        : "Stocks faibles sleeves apres commande",
    description: `[Ouvrir l'admin stock](${discordAdminUrl("/admin")})`,
    fields: lowStock.slice(0, 10).map((alert) => ({
      name: alert.name,
      value: `Stock ${alert.stock}`,
      inline: false,
    })),
  }).catch(() => false);
}

async function getCurrentLowStockAlerts(items: CompactItem[]) {
  const db = getDb();
  const alerts: {
    name: string;
    number: string;
    rarity: string;
    variant: string;
    stock: number;
  }[] = [];

  for (const [cardId, variant] of items) {
    if (!cardId || !variant) continue;

    const card = getCard(cardId);
    if (!card) continue;

    const resolvedVariant = resolveVariant(card, variant);
    const existing = await db
      .select({ stock: stockOverrides.stock })
      .from(stockOverrides)
      .where(
        and(
          eq(stockOverrides.cardId, cardId),
          eq(stockOverrides.variant, variant),
        ),
      )
      .limit(1);
    const currentStock = existing[0]?.stock ?? resolvedVariant.stock;

    if (currentStock <= LOW_STOCK_ALERT_THRESHOLD) {
      alerts.push({
        name: card.name,
        number: card.number,
        rarity: resolvedVariant.rarity,
        variant,
        stock: currentStock,
      });
    }
  }

  return alerts;
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
        await saveOrderAnalyticsFromSession(session).catch(() => {});
        await removePurchasedFavoritesFromSession(session).catch(() => {});
        await removeCartSnapshotFromSession(session).catch(() => {});
        return NextResponse.json({ received: true, duplicate: true });
      }
    } else {
      return NextResponse.json({ received: true, duplicate: true });
    }
  }

  if (event.type === "checkout.session.expired") {
    if (reservationId) {
      await releaseStockReservation(reservationId);
      revalidatePublicStockCache();
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
    await saveOrderAnalyticsFromSession(session).catch(() => {});

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
      const confirmedReservations = await confirmStockReservation(
        reservationId,
        session.id,
      );
      const expectedReservations = countExpectedCardReservations(items);

      if (
        expectedReservations > 0 &&
        confirmedReservations < expectedReservations
      ) {
        stockUpdateError = `Reservation stock incomplete : ${confirmedReservations}/${expectedReservations} ligne(s) confirmee(s) pour ${session.id}.`;
        await sendDiscordErrorNotification({
          title: "Verification stock apres paiement",
          message: stockUpdateError,
          route: "/api/webhooks/stripe",
        }).catch(() => false);
      }
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

    await removeCartSnapshotFromSession(session).catch(() => {});

    if (items.length === 0 || reservationId) {
      const sleeveStockUpdates = await decrementSleeveStock(
        sleeveItems.map(([sleeveId, quantity]) => ({ sleeveId, quantity })),
      );
      if (items.length > 0) {
        revalidatePublicStockCache();
      }
      if (reservationId) {
        await sendLowStockAfterOrder(await getCurrentLowStockAlerts(items));
      }
      await sendLowStockSleevesAfterOrder(sleeveStockUpdates);

      return NextResponse.json({
        received: true,
        items: items.length,
        sleeves: sleeveItems.length,
        reservationConfirmed: Boolean(reservationId),
        stockUpdateError,
        favoritesCleanupError,
      });
    }

    const lowStockAlerts: {
      name: string;
      number: string;
      rarity: string;
      variant: string;
      stock: number;
    }[] = [];

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

      if (
        currentStock > LOW_STOCK_ALERT_THRESHOLD &&
        nextStock <= LOW_STOCK_ALERT_THRESHOLD
      ) {
        lowStockAlerts.push({
          name: card.name,
          number: card.number,
          rarity: v.rarity,
          variant,
          stock: nextStock,
        });
      }

      await db
        .insert(stockOverrides)
        .values({ cardId, variant, stock: nextStock })
        .onConflictDoUpdate({
          target: [stockOverrides.cardId, stockOverrides.variant],
          set: { stock: nextStock, updatedAt: new Date() },
        });
    }

    const sleeveStockUpdates = await decrementSleeveStock(
      sleeveItems.map(([sleeveId, quantity]) => ({ sleeveId, quantity })),
    );
    if (items.length > 0) {
      revalidatePublicStockCache();
    }
    await sendLowStockAfterOrder(lowStockAlerts);
    await sendLowStockSleevesAfterOrder(sleeveStockUpdates);
  } catch (error) {
    stockUpdateError =
      error instanceof Error ? error.message : "Erreur mise a jour stock.";
    await sendDiscordErrorNotification({
      title: "Erreur apres commande Stripe",
      message: stockUpdateError,
      route: "/api/webhooks/stripe",
    }).catch(() => false);
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
