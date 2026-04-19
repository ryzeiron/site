import { NextResponse } from "next/server";
import { getStripe } from "@/lib/stripe";
import { getCard } from "@/lib/catalog";

type Body = { items: { cardId: string; quantity: number }[] };

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as Body;
    if (!body.items || body.items.length === 0) {
      return NextResponse.json({ error: "Panier vide." }, { status: 400 });
    }

    const lineItems = body.items.map((item) => {
      const card = getCard(item.cardId);
      if (!card) throw new Error(`Carte introuvable : ${item.cardId}`);
      if (item.quantity <= 0) throw new Error("Quantite invalide.");
      if (item.quantity > card.stock) {
        throw new Error(`Stock insuffisant pour ${card.name}.`);
      }
      return {
        price_data: {
          currency: "eur",
          unit_amount: card.priceCents,
          product_data: {
            name: `${card.name} (${card.number})`,
            description: `${card.rarity} - Etat: ${card.condition} - ${card.language}`,
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
            fixed_amount: { amount: 690, currency: "eur" },
            display_name: "Colissimo suivi",
            delivery_estimate: {
              minimum: { unit: "business_day", value: 1 },
              maximum: { unit: "business_day", value: 3 },
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
