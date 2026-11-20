import "server-only";
import { eq } from "drizzle-orm";
import { revalidateTag, unstable_cache } from "next/cache";
import { getDb } from "./db/client";
import { siteSettings } from "./db/schema";
import {
  DEFAULT_FREE_SHIPPING_PROMO,
  sanitizeFreeShippingPromo,
  type FreeShippingPromo,
} from "./free-shipping-promo-shared";

export * from "./free-shipping-promo-shared";

const SETTING_KEY = "free_shipping_promo";
export const FREE_SHIPPING_PROMO_CACHE_TAG = "free-shipping-promo";

// Table absente (migration pas encore passee dans Neon) : code Postgres 42P01.
function isMissingTableError(error: unknown) {
  const codes = [
    (error as { code?: unknown })?.code,
    (error as { cause?: { code?: unknown } })?.cause?.code,
  ];
  return codes.includes("42P01");
}

async function loadFreeShippingPromo(): Promise<FreeShippingPromo> {
  try {
    const [row] = await getDb()
      .select({ value: siteSettings.value })
      .from(siteSettings)
      .where(eq(siteSettings.key, SETTING_KEY))
      .limit(1);

    return row ? sanitizeFreeShippingPromo(row.value) : { ...DEFAULT_FREE_SHIPPING_PROMO };
  } catch (error) {
    if (isMissingTableError(error)) return { ...DEFAULT_FREE_SHIPPING_PROMO };
    // Autre erreur : on la laisse remonter pour que le cache ne la memorise pas.
    throw error;
  }
}

const loadCachedFreeShippingPromo = unstable_cache(
  loadFreeShippingPromo,
  ["free-shipping-promo-v1"],
  { revalidate: 86_400, tags: [FREE_SHIPPING_PROMO_CACHE_TAG] },
);

// Les dates sont comparees a chaque appel : le cache ne garde que le reglage,
// donc la promo demarre / s'arrete a l'heure exacte meme avec le cache.
// En cas de panne base de donnees : promo consideree inactive (le client paie
// la livraison normale plutot que de bloquer le paiement).
export async function getFreeShippingPromo(
  options: { cache?: boolean } = {},
): Promise<FreeShippingPromo> {
  try {
    return options.cache
      ? await loadCachedFreeShippingPromo()
      : await loadFreeShippingPromo();
  } catch {
    return { ...DEFAULT_FREE_SHIPPING_PROMO };
  }
}

export async function saveFreeShippingPromo(promo: FreeShippingPromo) {
  const value = sanitizeFreeShippingPromo(promo);

  await getDb()
    .insert(siteSettings)
    .values({ key: SETTING_KEY, value, updatedAt: new Date() })
    .onConflictDoUpdate({
      target: siteSettings.key,
      set: { value, updatedAt: new Date() },
    });

  revalidateTag(FREE_SHIPPING_PROMO_CACHE_TAG);
  return value;
}
