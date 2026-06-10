import { NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { getStripe } from "@/lib/stripe";
import { auth } from "@/lib/auth";
import { getCard, resolveVariant, type VariantKey } from "@/lib/catalog";
import { applyStockOverrides, revalidatePublicStockCache } from "@/lib/stock";
import { getPromo } from "@/lib/promo";
import { sendDiscordErrorNotification } from "@/lib/discord";
import { getStripePromotionCodeMatch } from "@/lib/stripe-promo";
import { getRequestOrigin } from "@/lib/site-url";
import { getSleevesByIds } from "@/lib/sleeves";
import {
  MONDIAL_RELAY_MAX_INSURANCE_CENTS,
  getMondialRelayInsurance,
} from "@/lib/mondial-relay-shipping";
import { isPromoExcludedCard } from "@/lib/promo-exclusions";
import {
  releaseStockReservation,
  reserveStockItems,
} from "@/lib/stock-reservations";

type Country = "FR" | "BE" | "LU" | "NL" | "ES" | "PT" | "DE" | "IT" | "AT";

type Body = {
  items?: { cardId: string; variant: VariantKey; quantity: number }[];
  sleeveItems?: { sleeveId: string; quantity: number }[];
  promoCode?: string;
  country?: Country;
  relay?: {
    code: string;
    name?: string;
    address?: string;
    postcode?: string;
    city?: string;
  };
};

const META_VALUE_MAX = 450;
const MIN_STRIPE_TOTAL_CENTS = 50;

const MR_PRICE_BY_COUNTRY: Record<Country, number> = {
  FR: 490,
  BE: 690,
  LU: 690,
  NL: 850,
  ES: 690,
  PT: 790,
  DE: 990,
  IT: 990,
  AT: 1190,
};

const ALLOWED_COUNTRIES: Country[] = [
  "FR",
  "BE",
  "LU",
  "NL",
  "ES",
  "PT",
  "DE",
  "IT",
  "AT",
];

function encodeItems(
  items: {
    cardId: string;
    variant: VariantKey;
    quantity: number;
    unitAmountCents?: number;
  }[],
): Record<string, string> {
  const compact = items.map((i) => [
    i.cardId,
    i.variant,
    i.quantity,
    i.unitAmountCents,
  ]);
  const json = JSON.stringify(compact);

  if (json.length <= META_VALUE_MAX) {
    return { items: json, items_parts: "1" };
  }

  const parts: Record<string, string> = {};
  let i = 0;

  for (let offset = 0; offset < json.length; offset += META_VALUE_MAX, i++) {
    parts[`items_${i}`] = json.slice(offset, offset + META_VALUE_MAX);
  }

  parts.items_parts = String(i);
  return parts;
}

function encodeSleeves(
  items: { sleeveId: string; quantity: number; unitAmountCents?: number }[],
): Record<string, string> {
  const compact = items.map((i) => [
    i.sleeveId,
    i.quantity,
    i.unitAmountCents,
  ]);
  const json = JSON.stringify(compact);

  if (json.length <= META_VALUE_MAX) {
    return { sleeves: json, sleeves_parts: "1" };
  }

  const parts: Record<string, string> = {};
  let i = 0;

  for (let offset = 0; offset < json.length; offset += META_VALUE_MAX, i++) {
    parts[`sleeves_${i}`] = json.slice(offset, offset + META_VALUE_MAX);
  }

  parts.sleeves_parts = String(i);
  return parts;
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as Body;
    const cardItems = Array.isArray(body.items) ? body.items : [];
    const rawSleeveItems = Array.isArray(body.sleeveItems)
      ? body.sleeveItems
      : [];

    if (cardItems.length === 0 && rawSleeveItems.length === 0) {
      return NextResponse.json({ error: "Panier vide." }, { status: 400 });
    }

    const sessionUser = await auth().catch(() => null);

    if (!body.relay?.code?.trim()) {
      return NextResponse.json(
        { error: "Choisis un point relais Mondial Relay avant de payer." },
        { status: 400 },
      );
    }

    let promo = null;
    let stripePromotionCodeId: string | null = null;
    let stripeCustomerId: string | null = null;

    if (body.promoCode && body.promoCode.trim()) {
      promo = getPromo(body.promoCode);

      if (!promo) {
        const stripePromotionCodeMatch = await getStripePromotionCodeMatch(
          body.promoCode,
          sessionUser?.user?.email,
        );
        if (stripePromotionCodeMatch) {
          stripePromotionCodeId =
            stripePromotionCodeMatch.promotionCode.id;
          stripeCustomerId = stripePromotionCodeMatch.restrictedCustomerId;
        }
      }

      if (!stripePromotionCodeId && !promo) {
        return NextResponse.json(
          { error: "Code promo invalide ou reserve a un autre compte." },
          { status: 400 },
        );
      }
    }

    const percentMultiplier =
      promo?.type === "percent_off" ? 1 - promo.percent / 100 : 1;
    const shippingMultiplier = promo?.type === "free_shipping" ? 0 : 1;

    const rawCards = cardItems
      .map((i) => getCard(i.cardId))
      .filter((c): c is NonNullable<typeof c> => !!c);

    const liveCards = await applyStockOverrides(rawCards);
    const cardMap = new Map(liveCards.map((c) => [c.id, c]));

    const reservationItemsByKey = new Map<
      string,
      {
        cardId: string;
        variant: VariantKey;
        quantity: number;
        initialStock: number;
      }
    >();

    const pricedCardItems: Array<{
      cardId: string;
      variant: VariantKey;
      quantity: number;
      unitAmountCents: number;
    }> = [];

    const lineItems = cardItems.map((item) => {
      const card = cardMap.get(item.cardId);

      if (!card) {
        throw new Error(`Carte introuvable : ${item.cardId}`);
      }

      if (item.quantity <= 0) {
        throw new Error("Quantite invalide.");
      }

      const v = resolveVariant(card, item.variant);
      const itemPercentMultiplier =
        promo?.type === "percent_off" && !isPromoExcludedCard(card.id)
          ? percentMultiplier
          : 1;

      if (item.quantity > v.stock) {
        throw new Error(`Stock insuffisant pour ${card.name}.`);
      }

      const reservationKey = `${item.cardId}:${item.variant}`;
      const existingReservation = reservationItemsByKey.get(reservationKey);

      if (existingReservation) {
        existingReservation.quantity += item.quantity;
      } else {
        reservationItemsByKey.set(reservationKey, {
          cardId: item.cardId,
          variant: item.variant,
          quantity: item.quantity,
          initialStock: v.stock,
        });
      }

      const unitAmountCents = Math.max(
        0,
        Math.round(v.price * 100 * itemPercentMultiplier),
      );

      pricedCardItems.push({
        cardId: item.cardId,
        variant: item.variant,
        quantity: item.quantity,
        unitAmountCents,
      });

      return {
        price_data: {
          currency: "eur",
          unit_amount: unitAmountCents,
          product_data: {
            name: `${card.name} (${card.number}) - ${v.rarity}`,
            description: `${v.rarity} - État : ${v.condition ?? card.condition} - ${card.language}`,
          },
        },
        quantity: item.quantity,
      };
    });

    const sleeveItemsById = new Map<
      string,
      { sleeveId: string; quantity: number }
    >();

    for (const item of rawSleeveItems) {
      if (!item?.sleeveId) continue;
      if (!Number.isInteger(item.quantity) || item.quantity <= 0) {
        throw new Error("Quantité invalide.");
      }

      const existing = sleeveItemsById.get(item.sleeveId);
      if (existing) {
        existing.quantity += item.quantity;
      } else {
        sleeveItemsById.set(item.sleeveId, {
          sleeveId: item.sleeveId,
          quantity: item.quantity,
        });
      }
    }

    const sleeveItems = Array.from(sleeveItemsById.values());
    const sleeveRows = await getSleevesByIds(
      sleeveItems.map((item) => item.sleeveId),
    );
    const sleeveMap = new Map(sleeveRows.map((sleeve) => [sleeve.id, sleeve]));

    const pricedSleeveItems: Array<{
      sleeveId: string;
      quantity: number;
      unitAmountCents: number;
    }> = [];

    for (const item of sleeveItems) {
      const sleeve = sleeveMap.get(item.sleeveId);
      if (!sleeve || !sleeve.active) {
        throw new Error("Sleeve introuvable.");
      }

      if (item.quantity > sleeve.stock) {
        throw new Error(`Stock insuffisant pour ${sleeve.name}.`);
      }

      const unitAmountCents = Math.max(
        0,
        Math.round(sleeve.priceCents * percentMultiplier),
      );

      pricedSleeveItems.push({
        sleeveId: item.sleeveId,
        quantity: item.quantity,
        unitAmountCents,
      });

      lineItems.push({
        price_data: {
          currency: "eur",
          unit_amount: unitAmountCents,
          product_data: {
            name: sleeve.name,
            description: sleeve.description ?? "Sleeve",
          },
        },
        quantity: item.quantity,
      });
    }

    const country: Country =
      body.country && ALLOWED_COUNTRIES.includes(body.country)
        ? body.country
        : "FR";

    const isFrance = country === "FR";

    const relayBase = MR_PRICE_BY_COUNTRY[country];
    const relayCents = Math.round(relayBase * shippingMultiplier);
    const itemsTotalCents = lineItems.reduce(
      (total, item) => total + item.price_data.unit_amount * item.quantity,
      0,
    );
    const insurance = getMondialRelayInsurance(itemsTotalCents);
    const insuranceFeeCents = insurance?.feeCents ?? 0;

    if (itemsTotalCents > MONDIAL_RELAY_MAX_INSURANCE_CENTS) {
      return NextResponse.json(
        {
          error:
            "Pour une commande supérieure à 500 €, contacte-nous afin d'organiser une livraison assurée adaptée.",
        },
        { status: 400 },
      );
    }

    const chargedInsuranceFeeCents = Math.round(
      insuranceFeeCents * shippingMultiplier,
    );
    const checkoutTotalCents =
      itemsTotalCents + relayCents + chargedInsuranceFeeCents;

    if (checkoutTotalCents < MIN_STRIPE_TOTAL_CENTS) {
      return NextResponse.json(
        {
          error:
            "Stripe demande un minimum de 0,50 € pour payer. Augmente le panier ou retire la réduction.",
        },
        { status: 400 },
      );
    }

    const origin = getRequestOrigin(request);

    const itemsMeta = encodeItems(pricedCardItems);
    const sleeveMeta = encodeSleeves(pricedSleeveItems);
    const reservationId = randomUUID();
    const relayMeta: Record<string, string> = {};

    relayMeta.relay_code = body.relay.code.trim();

    if (body.relay.name) {
      relayMeta.relay_name = body.relay.name.slice(0, 200);
    }

    if (body.relay.address) {
      relayMeta.relay_address = body.relay.address.slice(0, 200);
    }

    if (body.relay.postcode) {
      relayMeta.relay_postcode = body.relay.postcode.slice(0, 20);
    }

    if (body.relay.city) {
      relayMeta.relay_city = body.relay.city.slice(0, 100);
    }

    if (insurance) {
      relayMeta.mr_insurance_coverage_cents = String(insurance.coverageCents);
      relayMeta.mr_insurance_fee_cents = String(insurance.feeCents);
      relayMeta.mr_insurance_charged_cents = String(chargedInsuranceFeeCents);
    }

    const relayDisplayName = body.relay.name
      ? `Mondial Relay${insurance ? " assure" : ""} - ${body.relay.name}`
      : `Mondial Relay${insurance ? " assure" : ""} (${country})`;

    const relayShippingOption = {
      shipping_rate_data: {
        type: "fixed_amount" as const,
        fixed_amount: {
          amount: relayCents + chargedInsuranceFeeCents,
          currency: "eur",
        },
        display_name: relayDisplayName.slice(0, 100),
        delivery_estimate: {
          minimum: { unit: "business_day" as const, value: 3 },
          maximum: { unit: "business_day" as const, value: isFrance ? 6 : 10 },
        },
      },
    };

    const stripe = getStripe();

    const reservationItems = Array.from(reservationItemsByKey.values());

    for (const item of reservationItems) {
      if (item.quantity > item.initialStock) {
        throw new Error("Stock insuffisant pour une carte du panier.");
      }
    }

    await reserveStockItems(reservationId, reservationItems);
    if (reservationItems.length > 0) {
      revalidatePublicStockCache();
    }

    let session;

    try {
      session = await stripe.checkout.sessions.create({
        mode: "payment",
        payment_method_types: ["card"],
        line_items: lineItems,
        metadata: {
          ...itemsMeta,
          ...sleeveMeta,
          ...relayMeta,
          country,
          reservation_id: reservationId,
          ...(sessionUser?.user?.id ? { user_id: sessionUser.user.id } : {}),
        },
        success_url: `${origin}/suivi-commande/{CHECKOUT_SESSION_ID}`,
        cancel_url: `${origin}/annule`,
        expires_at: Math.floor(Date.now() / 1000) + 31 * 60,
        ...(stripeCustomerId ? { customer: stripeCustomerId } : {}),
        shipping_address_collection: { allowed_countries: [country] },
        phone_number_collection: { enabled: true },
        shipping_options: [relayShippingOption],
        ...(stripePromotionCodeId
          ? { discounts: [{ promotion_code: stripePromotionCodeId }] }
          : promo
            ? {}
            : { allow_promotion_codes: true }),
      });
    } catch (e) {
      await releaseStockReservation(reservationId);
      if (reservationItems.length > 0) {
        revalidatePublicStockCache();
      }
      throw e;
    }

    return NextResponse.json({ url: session.url });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Erreur inconnue.";
    await sendDiscordErrorNotification({
      title: "Erreur checkout",
      message,
      route: "/api/checkout",
    }).catch(() => false);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
