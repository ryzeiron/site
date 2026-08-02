import { NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { getStripe } from "@/lib/stripe";
import { auth } from "@/lib/auth";
import { getCard, resolveVariant, type VariantKey } from "@/lib/catalog";
import { getFirstOrderPromoError } from "@/lib/first-order-promo";
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
import { getPointsBalance } from "@/lib/loyalty";
import { getTierByPoints } from "@/lib/loyalty-tiers";
import {
  attachStockReservationSession,
  getReservedStockReservationSessionIds,
  releaseStockReservation,
  reserveStockItems,
} from "@/lib/stock-reservations";
import { encodeCompactMetadata } from "@/lib/stripe-order-metadata";

type Country = "FR" | "BE" | "LU" | "NL" | "ES" | "PT" | "DE" | "IT" | "AT";

type Body = {
  items?: { cardId: string; variant: VariantKey; quantity: number }[];
  sleeveItems?: { sleeveId: string; quantity: number }[];
  cartId?: string;
  promoCode?: string;
  loyaltyTierPoints?: number;
  country?: Country;
  relay?: {
    code: string;
    name?: string;
    address?: string;
    postcode?: string;
    city?: string;
  };
};

type PricedCardItem = {
  cardId: string;
  variant: VariantKey;
  quantity: number;
  unitAmountCents: number;
};

type PricedSleeveItem = {
  sleeveId: string;
  quantity: number;
  unitAmountCents: number;
};

type CheckoutLineItem = {
  price_data: {
    currency: "eur";
    unit_amount: number;
    product_data: {
      name: string;
      description?: string;
    };
  };
  quantity: number;
};

const MIN_STRIPE_TOTAL_CENTS = 50;
const STRIPE_GROUPED_LINE_ITEM_THRESHOLD = 95;
const CART_ID_RE = /^[a-z0-9-]{8,64}$/i;

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

function normalizeCartId(value: unknown) {
  const cartId = typeof value === "string" ? value.trim() : "";
  return CART_ID_RE.test(cartId) ? cartId : null;
}

async function expirePreviousCheckoutForCart(
  stripe: ReturnType<typeof getStripe>,
  cartId: string,
) {
  const sessionIds = await getReservedStockReservationSessionIds(cartId);

  for (const sessionId of sessionIds) {
    const session = await stripe.checkout.sessions
      .retrieve(sessionId)
      .catch(() => null);

    if (!session) continue;

    if (session.payment_status === "paid" || session.status === "complete") {
      throw new Error(
        "Un paiement est deja valide pour ce panier. Si la commande n'apparait pas, attends quelques secondes puis actualise.",
      );
    }

    if (session.status === "open") {
      await stripe.checkout.sessions.expire(sessionId).catch((error) => {
        const message =
          error instanceof Error ? error.message.toLowerCase() : "";
        if (!message.includes("expired")) {
          throw error;
        }
      });
    }
  }

  return releaseStockReservation(cartId);
}

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
  return encodeCompactMetadata("items", compact);
}

function encodeSleeves(
  items: { sleeveId: string; quantity: number; unitAmountCents?: number }[],
): Record<string, string> {
  const compact = items.map((i) => [
    i.sleeveId,
    i.quantity,
    i.unitAmountCents,
  ]);
  return encodeCompactMetadata("sleeves", compact);
}

function getItemsTotalCents(
  cardItems: PricedCardItem[],
  sleeveItems: PricedSleeveItem[],
) {
  const cardsTotal = cardItems.reduce(
    (total, item) => total + item.unitAmountCents * item.quantity,
    0,
  );
  const sleevesTotal = sleeveItems.reduce(
    (total, item) => total + item.unitAmountCents * item.quantity,
    0,
  );

  return cardsTotal + sleevesTotal;
}

function buildGroupedLineItems(
  cardItems: PricedCardItem[],
  sleeveItems: PricedSleeveItem[],
): CheckoutLineItem[] {
  const lines: CheckoutLineItem[] = [];
  const cardsTotal = cardItems.reduce(
    (total, item) => total + item.unitAmountCents * item.quantity,
    0,
  );
  const cardsQuantity = cardItems.reduce(
    (total, item) => total + item.quantity,
    0,
  );
  const sleevesTotal = sleeveItems.reduce(
    (total, item) => total + item.unitAmountCents * item.quantity,
    0,
  );
  const sleevesQuantity = sleeveItems.reduce(
    (total, item) => total + item.quantity,
    0,
  );

  if (cardsQuantity > 0) {
    lines.push({
      price_data: {
        currency: "eur",
        unit_amount: cardsTotal,
        product_data: {
          name: "Cartes Pokemon a l'unite",
          description: `${cardsQuantity} carte(s) - detail complet dans la commande.`,
        },
      },
      quantity: 1,
    });
  }

  if (sleevesQuantity > 0) {
    lines.push({
      price_data: {
        currency: "eur",
        unit_amount: sleevesTotal,
        product_data: {
          name: "Sleeves Pokemon",
          description: `${sleevesQuantity} sleeve(s) - detail complet dans la commande.`,
        },
      },
      quantity: 1,
    });
  }

  return lines;
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

    const firstOrderPromoError = await getFirstOrderPromoError(body.promoCode, {
      userId: sessionUser?.user?.id,
      email: sessionUser?.user?.email,
    });
    if (firstOrderPromoError) {
      return NextResponse.json(
        { error: firstOrderPromoError },
        { status: 403 },
      );
    }

    const checkoutCartId = normalizeCartId(body.cartId);
    const stripe = getStripe();

    if (checkoutCartId) {
      const releasedPrevious = await expirePreviousCheckoutForCart(
        stripe,
        checkoutCartId,
      );
      if (releasedPrevious > 0) {
        revalidatePublicStockCache();
      }
    }

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

    const requestedTierPoints =
      typeof body.loyaltyTierPoints === "number" ? body.loyaltyTierPoints : 0;
    let loyaltyTier = null;

    if (requestedTierPoints > 0) {
      if (promo || stripePromotionCodeId) {
        return NextResponse.json(
          {
            error:
              "Les points de fidélité ne sont pas cumulables avec un code promo.",
          },
          { status: 400 },
        );
      }

      if (!sessionUser?.user?.id) {
        return NextResponse.json(
          { error: "Connecte-toi pour utiliser tes points de fidélité." },
          { status: 401 },
        );
      }

      loyaltyTier = getTierByPoints(requestedTierPoints);

      if (!loyaltyTier) {
        return NextResponse.json(
          { error: "Palier de fidélité invalide." },
          { status: 400 },
        );
      }

      const balance = await getPointsBalance(sessionUser.user.id);

      if (balance < loyaltyTier.points) {
        return NextResponse.json(
          { error: "Points de fidélité insuffisants." },
          { status: 400 },
        );
      }

      // Un palier en % sur un panier 100 % exclu des promos gaspillerait les points.
      if (loyaltyTier.type === "percent") {
        const hasEligibleItem =
          rawSleeveItems.length > 0 ||
          cardItems.some((item) => !isPromoExcludedCard(item.cardId));

        if (!hasEligibleItem) {
          return NextResponse.json(
            {
              error:
                "Aucun article du panier n'est éligible à une remise en pourcentage.",
            },
            { status: 400 },
          );
        }
      }
    }

    const loyaltyPercent =
      loyaltyTier?.type === "percent" ? loyaltyTier.percent : 0;
    const hasPercentDiscount =
      promo?.type === "percent_off" || loyaltyPercent > 0;

    const percentMultiplier =
      promo?.type === "percent_off"
        ? 1 - promo.percent / 100
        : loyaltyPercent > 0
          ? 1 - loyaltyPercent / 100
          : 1;
    const shippingMultiplier =
      promo?.type === "free_shipping" || loyaltyTier?.type === "free_shipping"
        ? 0
        : 1;

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

    const pricedCardItems: PricedCardItem[] = [];

    const detailedLineItems: CheckoutLineItem[] = cardItems.map((item) => {
      const card = cardMap.get(item.cardId);

      if (!card) {
        throw new Error(`Carte introuvable : ${item.cardId}`);
      }

      if (item.quantity <= 0) {
        throw new Error("Quantite invalide.");
      }

      const v = resolveVariant(card, item.variant);
      const itemPercentMultiplier =
        hasPercentDiscount && !isPromoExcludedCard(card.id)
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

    const pricedSleeveItems: PricedSleeveItem[] = [];

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

      detailedLineItems.push({
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

    // Palier "article offert" : ligne a 0 EUR ajoutee au panier. Elle entre dans
    // pricedSleeveItems pour que le webhook decremente bien le stock, et pour
    // que la version groupee des lignes Stripe la comptabilise aussi.
    if (loyaltyTier?.type === "free_product") {
      const [freeSleeve] = await getSleevesByIds([loyaltyTier.sleeveId]);

      // On n'exige pas active ici, contrairement aux sleeves achetees : un cadeau
      // peut etre un produit volontairement masque de la boutique.
      if (!freeSleeve) {
        return NextResponse.json(
          { error: "Le cadeau de fidélité est momentanément indisponible." },
          { status: 400 },
        );
      }

      // Le stock doit couvrir le cadeau en plus des exemplaires deja payes.
      const alreadyInCart =
        sleeveItemsById.get(loyaltyTier.sleeveId)?.quantity ?? 0;

      if (alreadyInCart + loyaltyTier.quantity > freeSleeve.stock) {
        return NextResponse.json(
          {
            error: `Stock insuffisant pour le cadeau de fidélité (${freeSleeve.name}).`,
          },
          { status: 400 },
        );
      }

      pricedSleeveItems.push({
        sleeveId: loyaltyTier.sleeveId,
        quantity: loyaltyTier.quantity,
        unitAmountCents: 0,
      });

      detailedLineItems.push({
        price_data: {
          currency: "eur",
          unit_amount: 0,
          product_data: {
            name: `${freeSleeve.name} (offert)`,
            description: "Cadeau fidélité",
          },
        },
        quantity: loyaltyTier.quantity,
      });
    }

    const country: Country =
      body.country && ALLOWED_COUNTRIES.includes(body.country)
        ? body.country
        : "FR";

    const isFrance = country === "FR";

    const relayBase = MR_PRICE_BY_COUNTRY[country];
    const relayCents = Math.round(relayBase * shippingMultiplier);
    const lineItems =
      detailedLineItems.length > STRIPE_GROUPED_LINE_ITEM_THRESHOLD
        ? buildGroupedLineItems(pricedCardItems, pricedSleeveItems)
        : detailedLineItems;
    const itemsTotalCents = getItemsTotalCents(
      pricedCardItems,
      pricedSleeveItems,
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
    // Seul le type "amount" passe par un coupon Stripe : le pourcentage est deja
    // applique sur les prix unitaires, et free_shipping sur les frais de port.
    // La remise ne peut pas rendre le total inferieur au minimum Stripe.
    const loyaltyDiscountCents =
      loyaltyTier?.type === "amount"
        ? Math.min(
            loyaltyTier.rewardCents,
            Math.max(
              0,
              itemsTotalCents +
                relayCents +
                chargedInsuranceFeeCents -
                MIN_STRIPE_TOTAL_CENTS,
            ),
          )
        : 0;

    if (loyaltyTier?.type === "amount" && loyaltyDiscountCents <= 0) {
      return NextResponse.json(
        {
          error:
            "Le panier est trop petit pour utiliser ce palier de fidélité.",
        },
        { status: 400 },
      );
    }

    const checkoutTotalCents =
      itemsTotalCents +
      relayCents +
      chargedInsuranceFeeCents -
      loyaltyDiscountCents;

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
    const reservationId = checkoutCartId ?? randomUUID();
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

    let loyaltyCouponId: string | null = null;

    if (loyaltyTier?.type === "amount" && loyaltyDiscountCents > 0) {
      const loyaltyCoupon = await stripe.coupons.create({
        amount_off: loyaltyDiscountCents,
        currency: "eur",
        duration: "once",
        name: `Fidélité - ${loyaltyTier.points} points`,
        max_redemptions: 1,
      });
      loyaltyCouponId = loyaltyCoupon.id;
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
          ...(checkoutCartId ? { cart_id: checkoutCartId } : {}),
          ...(sessionUser?.user?.id ? { user_id: sessionUser.user.id } : {}),
          ...(loyaltyTier
            ? { loyalty_redeem_points: String(loyaltyTier.points) }
            : {}),
        },
        success_url: `${origin}/suivi-commande/{CHECKOUT_SESSION_ID}`,
        cancel_url: `${origin}/annule`,
        expires_at: Math.floor(Date.now() / 1000) + 31 * 60,
        ...(stripeCustomerId
          ? { customer: stripeCustomerId }
          : sessionUser?.user?.email
            ? { customer_email: sessionUser.user.email }
            : {}),
        shipping_address_collection: { allowed_countries: [country] },
        phone_number_collection: { enabled: true },
        shipping_options: [relayShippingOption],
        ...(loyaltyCouponId
          ? { discounts: [{ coupon: loyaltyCouponId }] }
          : stripePromotionCodeId
            ? { discounts: [{ promotion_code: stripePromotionCodeId }] }
            : promo
              ? {}
              : { allow_promotion_codes: true }),
      });
      await attachStockReservationSession(reservationId, session.id);
    } catch (e) {
      if (session?.id) {
        await stripe.checkout.sessions.expire(session.id).catch(() => {});
      }
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
