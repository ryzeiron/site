import "server-only";
import { inArray } from "drizzle-orm";
import { getDb } from "./db/client";
import { stockOverrides } from "./db/schema";
import {
  isRarity,
  type Card,
  type NamedVariant,
  type Rarity,
} from "./catalog";

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

  // Group overrides by cardId
  const byCard = new Map<string, Map<string, OverrideData>>();
  for (const r of rows) {
    let inner = byCard.get(r.cardId);
    if (!inner) {
      inner = new Map();
      byCard.set(r.cardId, inner);
    }
    inner.set(r.variant, {
      stock: r.stock,
      priceCents: r.priceCents,
      rarity: r.rarity && isRarity(r.rarity) ? r.rarity : null,
    });
  }

  return cards.map((c) => {
    const overrides = byCard.get(c.id);
    if (!overrides) return c;

    const next: T = { ...c };

    const baseOverride = overrides.get("base");
    if (baseOverride) {
      next.stock = baseOverride.stock;
      if (baseOverride.priceCents !== null) {
        next.price = baseOverride.priceCents / 100;
      }
      if (baseOverride.rarity !== null) {
        next.rarity = baseOverride.rarity;
      }
    }

    const altOverride = overrides.get("alt");
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

    // Variantes custom (autres que base/alt)
    let extras = next.extraVariants ? [...next.extraVariants] : [];
    for (const [key, ov] of overrides.entries()) {
      if (key === "base" || key === "alt") continue;
      const idx = extras.findIndex((x) => x.key === key);
      if (idx >= 0) {
        const existing = extras[idx];
        extras[idx] = {
          ...existing,
          stock: ov.stock,
          price: ov.priceCents !== null ? ov.priceCents / 100 : existing.price,
          rarity: ov.rarity ?? existing.rarity,
        };
      } else if (ov.rarity !== null) {
        // Variante creee uniquement via la DB
        const created: NamedVariant = {
          key,
          rarity: ov.rarity,
          stock: ov.stock,
          price: ov.priceCents !== null ? ov.priceCents / 100 : next.price,
        };
        extras.push(created);
      }
    }
    if (extras.length > 0) {
      next.extraVariants = extras;
    }

    return next;
  });
}
