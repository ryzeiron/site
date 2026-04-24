import "server-only";
import { inArray } from "drizzle-orm";
import { getDb } from "./db/client";
import { stockOverrides } from "./db/schema";
import { isRarity, type Card, type Rarity } from "./catalog";

type OverrideData = {
  stock: number;
  priceCents: number | null;
  rarity: Rarity | null;
};

export async function applyStockOverrides<T extends Card>(
  cards: T[],
): Promise<T[]> {
  if (cards.length === 0) return cards;

  const ids = Array.from(new Set(cards.map((c) => c.id)));
  let rows: {
    cardId: string;
    variant: string;
    stock: number;
    priceCents: number | null;
    rarity: string | null;
  }[] = [];
  try {
    rows = await getDb()
      .select({
        cardId: stockOverrides.cardId,
        variant: stockOverrides.variant,
        stock: stockOverrides.stock,
        priceCents: stockOverrides.priceCents,
        rarity: stockOverrides.rarity,
      })
      .from(stockOverrides)
      .where(inArray(stockOverrides.cardId, ids));
  } catch {
    return cards;
  }

  if (rows.length === 0) return cards;

  const map = new Map<string, OverrideData>();
  for (const r of rows) {
    map.set(`${r.cardId}__${r.variant}`, {
      stock: r.stock,
      priceCents: r.priceCents,
      rarity: r.rarity && isRarity(r.rarity) ? r.rarity : null,
    });
  }

  return cards.map((c) => {
    const baseOverride = map.get(`${c.id}__base`);
    const altOverride = map.get(`${c.id}__alt`);
    if (!baseOverride && !altOverride) return c;

    const next: T = { ...c };

    if (baseOverride) {
      next.stock = baseOverride.stock;
      if (baseOverride.priceCents !== null) {
        next.price = baseOverride.priceCents / 100;
      }
      if (baseOverride.rarity !== null) {
        next.rarity = baseOverride.rarity;
      }
    }

    if (altOverride) {
      if (next.altVariant) {
        next.altVariant = {
          ...next.altVariant,
          stock: altOverride.stock,
          price:
            altOverride.priceCents !== null
              ? altOverride.priceCents / 100
              : next.altVariant.price,
          rarity: altOverride.rarity ?? next.altVariant.rarity,
        };
      } else if (altOverride.rarity !== null) {
        next.altVariant = {
          rarity: altOverride.rarity,
          stock: altOverride.stock,
          price:
            altOverride.priceCents !== null
              ? altOverride.priceCents / 100
              : next.price,
        };
      }
    }

    return next;
  });
}
