import { NextResponse } from "next/server";
import {
  DEFAULT_FREE_SHIPPING_PROMO,
  getFreeShippingPromo,
  getFreeShippingPromoStatus,
} from "@/lib/free-shipping-promo";

export const dynamic = "force-dynamic";

// Reglage public de la promo livraison offerte (bandeau + panier).
// Les dates sont renvoyees pour que le navigateur bascule tout seul a l'heure
// de debut / fin. Pas de cache CDN : ce reglage decide d'un prix.
export async function GET() {
  try {
    const promo = await getFreeShippingPromo({ cache: true });
    const status = getFreeShippingPromoStatus(promo);
    const visible = status === "live" || status === "scheduled";

    return NextResponse.json(
      visible ? promo : { ...DEFAULT_FREE_SHIPPING_PROMO, minItemsCents: promo.minItemsCents },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch {
    return NextResponse.json(DEFAULT_FREE_SHIPPING_PROMO, {
      headers: { "Cache-Control": "no-store" },
    });
  }
}
