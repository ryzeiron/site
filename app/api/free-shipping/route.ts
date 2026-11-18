import { NextResponse } from "next/server";
import {
  getFreeShippingPromo,
  isFreeShippingPromoLive,
} from "@/lib/free-shipping-promo";

export const dynamic = "force-dynamic";

// Etat public de la promo livraison offerte (bandeau + panier).
export async function GET() {
  const promo = await getFreeShippingPromo({ cache: true });
  const live = isFreeShippingPromoLive(promo);

  return NextResponse.json(
    {
      live,
      insuranceIncluded: live ? promo.insuranceIncluded : false,
      endsAt: live ? promo.endsAt : null,
    },
    { headers: { "Cache-Control": "public, s-maxage=30, stale-while-revalidate=30" } },
  );
}
