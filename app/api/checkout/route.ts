import { NextResponse } from "next/server";
import { getStripe } from "@/lib/stripe";
import { getCard, resolveVariant, type VariantKey } from "@/lib/catalog";
import { getDb } from "@/lib/db/client";
import { stockOverrides } from "@/lib/db/schema";
import { inArray } from "drizzle-orm";

type Body = {
  items: { cardId: string; variant: VariantKey; quantity: number }[];
};

const META_VALUE_MAX = 450;

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

    const keys = body.items.map((i) => `${i.cardId}__${i.variant}`);
    const overrides = await getDb()
      .select()
      .from(stockOverrides)
      .where(
        inArray(
          stockOverrides.cardId,
          Array.from(new Set(body.items.map((i) => i.cardId))),
        ),
      );
    const overrideMap = new Map<string, number>();
    for (const o of overrides) {
      overrideMap.set(`${o.cardId}__${o.variant}`, o.stock);
    }

    const lineItems = body.items.map((item, idx) => {
      const card = getCard(item.cardId);
      if (!card) throw new Error(`Carte introuvable : ${item.cardId}`);
      if (item.quantity <= 0) throw new Error("Quantite invalide.");
      const v = resolveVariant(card, item.variant);
      const liveStock = overrideMap.get(keys[idx]) ?? v.stock;
      if (item.quantity > liveStock) {
        throw new Error(`Stock insuffisant pour ${card.name}.`);
      }
      return {
        price_data: {
          currency: "eur",
          unit_amount: Math.round(v.price * 100),
          product_data: {
            name: `${card.name} (${card.number}) - ${v.rarity}`,
            description: `${v.rarity} - Etat: ${card.condition} - ${card.language}`,
          },
        },
        quantity: item.quantity,
      };
    });

    const origin =
      process.env.NEXT_PUBLIC_SITE_URL ??
      request.headers.get("origin") ??
      "http://localhost:3000";

    const stripe = getStripe();
    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      payment_method_types: ["card"],
      line_items: lineItems,
      metadata: encodeItems(body.items),
      success_url: `${origin}/succes?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/annule`,
      shipping_address_collection: { allowed_countries: ["FR", "BE", "LU", "CH"] },
      shipping_options: [
        {
          shipping_rate_data: {
            type: "fixed_amount",
            fixed_amount: { amount: 350, currency: "eur" },
            display_name: "Lettre suivie (France)",
            delivery_estimate: {
              minimum: { unit: "business_day", value: 2 },
              maximum: { unit: "business_day", value: 5 },
            },
          },
        },
        {
          shipping_rate_data: {
            type: "fixed_amount",
            fixed_amount: { amount: 490, currency: "eur" },
            display_name: "Mondial Relay",
            delivery_estimate: {
              minimum: { unit: "business_day", value: 3 },
              maximum: { unit: "business_day", value: 6 },
            },
          },
        },
      ],
    });

    return NextResponse.json({ url: session.url });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Erreur inconnue.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
