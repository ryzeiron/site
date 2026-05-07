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
@@ -97,105 +96,91 @@ export async function POST(request: Request) {
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

    const shippingOptions: Array<{
      shipping_rate_data: {
        type: "fixed_amount";
        fixed_amount: { amount: number; currency: string };
        display_name: string;
        delivery_estimate?: {
          minimum: { unit: "business_day"; value: number };
          maximum: { unit: "business_day"; value: number };
        };
      };
    }> = [
      {
        shipping_rate_data: {
          type: "fixed_amount",
          fixed_amount: { amount: relayCents, currency: "eur" },
          display_name: relayDisplayName.slice(0, 100),
          delivery_estimate: {
            minimum: { unit: "business_day", value: 3 },
            maximum: { unit: "business_day", value: isFrance ? 6 : 10 },
          },
        },

    ];

    const stripe = getStripe();
    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      payment_method_types: ["card"],
      line_items: lineItems,
      metadata: { ...itemsMeta, ...relayMeta, country },
      success_url: `${origin}/succes?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/annule`,
      shipping_address_collection: { allowed_countries: [country] },
      shipping_options: shippingOptions,
    });

    return NextResponse.json({ url: session.url });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Erreur inconnue.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
