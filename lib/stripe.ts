import Stripe from "stripe";

let stripeSingleton: Stripe | null = null;

export function getStripe(): Stripe {
  if (!stripeSingleton) {
    const key = process.env.STRIPE_SECRET_KEY;
    if (!key) {
      throw new Error(
        "STRIPE_SECRET_KEY manquante. Ajoute-la dans .env.local ou sur ton hebergeur.",
      );
    }
    stripeSingleton = new Stripe(key, { apiVersion: "2026-03-25.dahlia" });
  }
  return stripeSingleton;
}
