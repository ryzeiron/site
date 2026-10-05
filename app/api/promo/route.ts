import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getFirstOrderPromoError } from "@/lib/first-order-promo";
import { getPromo } from "@/lib/promo";
import {
  diagnoseStripePromoCode,
  getStripePromoEffect,
} from "@/lib/stripe-promo";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { code?: string };
    const session = await auth().catch(() => null);

    const firstOrderPromoError = await getFirstOrderPromoError(body.code, {
      userId: session?.user?.id,
      email: session?.user?.email,
    });
    if (firstOrderPromoError) {
      return NextResponse.json(
        { error: firstOrderPromoError },
        { status: 403 },
      );
    }

    const promo = getPromo(body.code);
    if (promo) {
      return NextResponse.json({ promo: { ...promo, source: "local" } });
    }

    const stripePromo = await getStripePromoEffect(
      body.code,
      session?.user?.email,
    );
    if (stripePromo) {
      return NextResponse.json({ promo: stripePromo });
    }

    // Quatre refus distincts donnaient le meme message : impossible pour le
    // client de comprendre, impossible pour la boutique de diagnostiquer.
    const reason = await diagnoseStripePromoCode(
      body.code,
      session?.user?.email,
    ).catch(() => "unknown" as const);

    const messages = {
      needs_login:
        "Ce code est reserve a un compte. Connecte-toi avec l'adresse a laquelle il a ete attribue.",
      other_account:
        "Ce code est reserve a un autre compte que le tien.",
      expired: "Ce code a expire ou a deja ete utilise.",
      unknown: "Code promo inconnu.",
    };

    return NextResponse.json(
      { error: messages[reason], reason },
      { status: reason === "needs_login" ? 403 : 404 },
    );
  } catch {
    return NextResponse.json({ error: "Requête invalide." }, { status: 400 });
  }
}
