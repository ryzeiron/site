import { NextResponse } from "next/server";
import { getPromo } from "@/lib/promo";
import { getStripePromoEffect } from "@/lib/stripe-promo";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { code?: string };

    const promo = getPromo(body.code);
    if (promo) {
      return NextResponse.json({ promo: { ...promo, source: "local" } });
    }

    const stripePromo = await getStripePromoEffect(body.code);
    if (stripePromo) {
      return NextResponse.json({ promo: stripePromo });
    }

    return NextResponse.json(
      { error: "Code promo invalide." },
      { status: 404 },
    );
  } catch {
    return NextResponse.json({ error: "Requête invalide." }, { status: 400 });
  }
}
