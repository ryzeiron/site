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
