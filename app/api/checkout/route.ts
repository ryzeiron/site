import { NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { getStripe } from "@/lib/stripe";
import { getCard, resolveVariant, type VariantKey } from "@/lib/catalog";
import { applyStockOverrides } from "@/lib/stock";
import { getPromo } from "@/lib/promo";
import {
  getCartReservations,
  releaseStockReservation,
  reserveStockItems,
  upgradeCartToReserved,
} from "@/lib/stock-reservations";

type Country = "FR" | "BE" | "LU" | "NL" | "ES" | "PT" | "DE" | "IT" | "AT";

type Body = {
  items: { cardId: string; variant: VariantKey; quantity: number }[];
  promoCode?: string;
  country?: Country;
  cartId?: string;
  relay?: {
    code: string;
    name?: string;
    address?: string;
    postcode?: string;
    city?: string;
  };
};

const CART_ID_RE = /^[a-z0-9-]{8,64}$/i;

const META_VALUE_MAX = 450;

// Tarifs Mondial Relay par pays (centimes EUR, colis ~500g)
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
  items: { cardId: string; variant: VariantKey; quantity: number }[],
): Record<string, string> {
  const compact = items.map((i) => [i.cardId, i.variant, i.quantity]);
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

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as Body;

    if (!body.items || body.items.length === 0) {
      return NextResponse.json({ error: "Panier vide." }, { status: 400 });
    }

    if (!body.relay?.code?.trim()) {
      return NextResponse.json(
        { error: "Choisis un point relais Mondial Relay avant de payer." },
        { status: 400 },
      );
    }

    let promo = null;

    if (body.promoCode && body.promoCode.trim()) {
      promo = getPromo(body.promoCode);

      if (!promo) {
        return NextResponse.json(
          { error: "Code promo invalide." },
          { status: 400 },
        );
      }
    }

    const percentMultiplier =
      promo?.type === "percent_off" ? 1 - promo.percent / 100 : 1;
    const shippingMultiplier = promo?.type === "free_shipping" ? 0 : 1;

    const rawCards = body.items
      .map((i) => getCard(i.cardId))
      .filter((c): c is NonNullable<typeof c> => !!c);

    const liveCards = await applyStockOverrides(rawCards);
    const cardMap = new Map(liveCards.map((c) => [c.id, c]));

    // Le stock DB est deja decremente de la reservation 'cart' du user.
    // On la recupere pour la rajouter au stock dispo lors des checks.
    const cartIdFromBody =
      body.cartId && CART_ID_RE.test(body.cartId) ? body.cartId : null;
    const ownCartReserved = new Map<string, number>();
    if (cartIdFromBody) {
      try {
        const reservations = await getCartReservations(cartIdFromBody);
        for (const r of reservations) {
          ownCartReserved.set(`${r.cardId}:${r.variant}`, r.quantity);
        }
      } catch {
        // ignore : on fera le check sans, ca peut faire un faux negatif
      }
    }

    const reservationItemsByKey = new Map<string, {
      cardId: string;
      variant: VariantKey;
      quantity: number;
      initialStock: number;
    }>();

    const lineItems = body.items.map((item) => {
      const card = cardMap.get(item.cardId);

      if (!card) {
        throw new Error(`Carte introuvable : ${item.cardId}`);
      }

      if (item.quantity <= 0) {
        throw new Error("Quantite invalide.");
      }

      const v = resolveVariant(card, item.variant);
      const ownReserved = ownCartReserved.get(`${item.cardId}:${item.variant}`) ?? 0;
      const availableForUser = v.stock + ownReserved;

      if (item.quantity > availableForUser) {
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
          initialStock: availableForUser,
        });
      }

      return {
        price_data: {
          currency: "eur",
          unit_amount: Math.max(0, Math.round(v.price * 100 * percentMultiplier)),
          product_data: {
            name: `${card.name} (${card.number}) - ${v.rarity}`,
            description: `${v.rarity} - Etat: ${card.condition} - ${card.language}`,
          },
        },
        quantity: item.quantity,
      };
    });

    const country: Country =
      body.country && ALLOWED_COUNTRIES.includes(body.country)
        ? body.country
        : "FR";

    const isFrance = country === "FR";

    const relayBase = MR_PRICE_BY_COUNTRY[country];
    const relayCents = Math.round(relayBase * shippingMultiplier);

    const origin =
      process.env.NEXT_PUBLIC_SITE_URL ??
      request.headers.get("origin") ??
      "http://localhost:3000";

    const itemsMeta = encodeItems(body.items);
    const cartId =
      body.cartId && CART_ID_RE.test(body.cartId) ? body.cartId : null;
    const reservationId = cartId ?? randomUUID();
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

    const relayDisplayName = body.relay.name
      ? `Mondial Relay - ${body.relay.name}`
      : `Mondial Relay (${country})`;

    const relayShippingOption = {
      shipping_rate_data: {
        type: "fixed_amount" as const,
        fixed_amount: { amount: relayCents, currency: "eur" },
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

    let upgraded = 0;
    if (cartId) {
      // Le panier a deja reserve - on upgrade en attendant le paiement
      try {
        upgraded = await upgradeCartToReserved(cartId, "pending");
      } catch {
        upgraded = 0;
      }
    }

    if (upgraded === 0) {
      // Pas de reservation cart trouvee, on reserve from scratch
      await reserveStockItems(reservationId, reservationItems, "reserved");
    }

    let session;
    try {
      session = await stripe.checkout.sessions.create({
        mode: "payment",
        payment_method_types: ["card"],
        line_items: lineItems,
        metadata: {
          ...itemsMeta,
          ...relayMeta,
          country,
          reservation_id: reservationId,
        },
        success_url: `${origin}/succes?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${origin}/annule`,
        expires_at: Math.floor(Date.now() / 1000) + 31 * 60,
        shipping_address_collection: { allowed_countries: [country] },
        phone_number_collection: { enabled: true },
        shipping_options: [relayShippingOption],
      });
    } catch (e) {
      await releaseStockReservation(reservationId);
      throw e;
    }

    return NextResponse.json({ url: session.url });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Erreur inconnue.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
