import "server-only";

import { desc } from "drizzle-orm";
import { unstable_cache } from "next/cache";
import {
  CARDS,
  getCard,
  listVariants,
  type Card,
  type Rarity,
  type VariantKey,
} from "@/lib/catalog";
import { getDb } from "@/lib/db/client";
import { stockOverrides } from "@/lib/db/schema";
import {
  applyStockOverrides,
  PUBLIC_STOCK_CACHE_SECONDS,
  PUBLIC_STOCK_CACHE_TAG,
} from "@/lib/stock";

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

type RecentCardsOptions = {
  rarities?: readonly Rarity[];
};

async function getRecentStockRows(fetchLimit: number): Promise<RecentRow[]> {
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
      .limit(fetchLimit);

    return rows.filter((row) => row.stock > 0);
  } catch {
    return [];
  }
}

const getCachedRecentStockRows = unstable_cache(
  (fetchLimit: number) => getRecentStockRows(fetchLimit),
  ["recent-stock-rows-v1"],
  {
    revalidate: PUBLIC_STOCK_CACHE_SECONDS,
    tags: [PUBLIC_STOCK_CACHE_TAG],
  },
);

function matchesRarity(rarity: Rarity, allowedRarities?: readonly Rarity[]) {
  return !allowedRarities || allowedRarities.includes(rarity);
}

function uniqByCard(cards: Card[]) {
  const seen = new Set<string>();
  return cards.filter((card) => {
    if (seen.has(card.id)) return false;
    seen.add(card.id);
    return true;
  });
}

async function getFallbackCards(
  limit: number,
  options: RecentCardsOptions = {},
): Promise<RecentCard[]> {
  const liveCards = await applyStockOverrides(CARDS, { cache: true });

  return liveCards
    .flatMap((card) =>
      listVariants(card)
        .filter(
          ({ variant }) =>
            variant.stock > 0 &&
            matchesRarity(variant.rarity, options.rarities),
        )
        .map(({ key }) => ({
          card,
          variant: key,
          updatedAt: new Date(0),
        })),
    )
    .slice(0, limit);
}

export async function getRecentCards(
  limit = 48,
  options: RecentCardsOptions = {},
): Promise<RecentCard[]> {
  const fetchLimit = options.rarities
    ? Math.max(limit * 25, 500)
    : Math.max(limit * 4, 60);
  const rows = await getCachedRecentStockRows(fetchLimit);

  if (rows.length === 0) {
    return getFallbackCards(limit, options);
  }

  const baseCards = uniqByCard(
    rows.map((row) => getCard(row.cardId)).filter((card): card is Card => !!card),
  );
  const liveCards = await applyStockOverrides(baseCards, { cache: true });
  const liveById = new Map(liveCards.map((card) => [card.id, card]));
  const seen = new Set<string>();
  const entries: RecentCard[] = [];

  for (const row of rows) {
    const card = liveById.get(row.cardId);
    if (!card) continue;

    const liveVariant = listVariants(card).find(({ key }) => key === row.variant);
    if (!liveVariant || liveVariant.variant.stock <= 0) continue;
    if (!matchesRarity(liveVariant.variant.rarity, options.rarities)) continue;

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
