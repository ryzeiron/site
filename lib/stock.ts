import "server-only";
import { inArray } from "drizzle-orm";
import { getDb } from "./db/client";
import { stockOverrides } from "./db/schema";
import type { Card } from "./catalog";

export async function applyStockOverrides<T extends Card>(
  cards: T[],
): Promise<T[]> {
  if (cards.length === 0) return cards;

  const ids = Array.from(new Set(cards.map((c) => c.id)));
  let rows: { cardId: string; variant: string; stock: number }[] = [];
  try {
    rows = await getDb()
      .select({
        cardId: stockOverrides.cardId,
        variant: stockOverrides.variant,
        stock: stockOverrides.stock,
      })
      .from(stockOverrides)
      .where(inArray(stockOverrides.cardId, ids));
  } catch {
    return cards;
  }

  if (rows.length === 0) return cards;

  const map = new Map<string, number>();
  for (const r of rows) map.set(`${r.cardId}__${r.variant}`, r.stock);

  return cards.map((c) => {
    const baseOverride = map.get(`${c.id}__base`);
    const altOverride = map.get(`${c.id}__alt`);
    if (baseOverride === undefined && altOverride === undefined) return c;
    const next: T = { ...c };
    if (baseOverride !== undefined) next.stock = baseOverride;
    if (altOverride !== undefined && next.altVariant) {
      next.altVariant = { ...next.altVariant, stock: altOverride };
    }
    return next;
  });
}
