import "server-only";

import { desc } from "drizzle-orm";
import {
  CARDS,
  getCard,
  listVariants,
  type Card,
  type VariantKey,
} from "@/lib/catalog";
import { getDb } from "@/lib/db/client";
import { stockOverrides } from "@/lib/db/schema";
import { applyStockOverrides } from "@/lib/stock";

type RecentRow = {
  cardId: string;
  variant: VariantKey;
  stock: number;
  updatedAt: Date | string;
};

export type RecentCard = {
  card: Card;
  variant: VariantKey;
  updatedAt: Date | string;
};

async function getRecentStockRows(limit: number): Promise<RecentRow[]> {
  try {
    const rows = await getDb()
      .select({
        cardId: stockOverrides.cardId,
        variant: stockOverrides.variant,
        stock: stockOverrides.stock,
        updatedAt: stockOverrides.updatedAt,
      })
      .from(stockOverrides)
      .orderBy(desc(stockOverrides.updatedAt))
      .limit(Math.max(limit * 4, 60));

    return rows.filter((row) => row.stock > 0);
  } catch {
    return [];
  }
}

function uniqByCard(cards: Card[]) {
  const seen = new Set<string>();
  return cards.filter((card) => {
    if (seen.has(card.id)) return false;
    seen.add(card.id);
    return true;
  });
}

async function getFallbackCards(limit: number): Promise<RecentCard[]> {
  const liveCards = await applyStockOverrides(CARDS);

  return liveCards
    .flatMap((card) =>
      listVariants(card)
        .filter(({ variant }) => variant.stock > 0)
        .map(({ key }) => ({
          card,
          variant: key,
          updatedAt: new Date(0),
        })),
    )
    .slice(0, limit);
}

export async function getRecentCards(limit = 48): Promise<RecentCard[]> {
  const rows = await getRecentStockRows(limit);

  if (rows.length === 0) {
    return getFallbackCards(limit);
  }

  const baseCards = uniqByCard(
    rows.map((row) => getCard(row.cardId)).filter((card): card is Card => !!card),
  );
  const liveCards = await applyStockOverrides(baseCards);
  const liveById = new Map(liveCards.map((card) => [card.id, card]));
  const seen = new Set<string>();
  const entries: RecentCard[] = [];

  for (const row of rows) {
    const card = liveById.get(row.cardId);
    if (!card) continue;

    const liveVariant = listVariants(card).find(({ key }) => key === row.variant);
    if (!liveVariant || liveVariant.variant.stock <= 0) continue;

    const entryKey = `${row.cardId}:${row.variant}`;
    if (seen.has(entryKey)) continue;
    seen.add(entryKey);

    entries.push({
      card,
      variant: row.variant,
      updatedAt: row.updatedAt,
    });

    if (entries.length >= limit) break;
  }

  return entries;
}

export function formatRecentDate(value: Date | string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime()) || date.getTime() === 0) return null;

  return date.toLocaleDateString("fr-FR", {
    day: "2-digit",
    month: "short",
  });
}
