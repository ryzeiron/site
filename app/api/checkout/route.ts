import { NextResponse } from "next/server";
import { getStripe } from "@/lib/stripe";
import { getCard, resolveVariant, type VariantKey } from "@/lib/catalog";
import { applyStockOverrides } from "@/lib/stock";
import { getPromo } from "@/lib/promo";

type Country = "FR" | "BE" | "LU" | "NL" | "ES" | "PT" | "DE" | "IT" | "AT";

type Body = {
  items: { cardId: string; variant: VariantKey; quantity: number }[];
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

    const lineItems = body.items.map((item) => {
      const card = cardMap.get(item.cardId);
      if (!card) throw new Error(`Carte introuvable : ${item.cardId}`);
      if (item.quantity <= 0) throw new Error("Quantite invalide.");
      const v = resolveVariant(card, item.variant);
      if (item.quantity > v.stock) {
        throw new Error(`Stock insuffisant pour ${card.name}.`);
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
    const relayMeta: Record<string, string> = {};
    if (body.relay && body.relay.code) {
      relayMeta.relay_code = body.relay.code;
      if (body.relay.name) relayMeta.relay_name = body.relay.name.slice(0, 200);
      if (body.relay.address)
        relayMeta.relay_address = body.relay.address.slice(0, 200);
      if (body.relay.postcode)
        relayMeta.relay_postcode = body.relay.postcode.slice(0, 20);
      if (body.relay.city) relayMeta.relay_city = body.relay.city.slice(0, 100);
    }

    const relayDisplayName = body.relay?.name
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
    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      payment_method_types: ["card"],
      line_items: lineItems,
      metadata: { ...itemsMeta, ...relayMeta, country },
      success_url: `${origin}/succes?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/annule`,
      shipping_address_collection: { allowed_countries: [country] },
      shipping_options: [relayShippingOption],
    });

    return NextResponse.json({ url: session.url });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Erreur inconnue.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
