import "server-only";
import { inArray } from "drizzle-orm";
import { revalidateTag, unstable_cache } from "next/cache";
import { getDb } from "./db/client";
import { cardOverrides, hiddenVariants, stockOverrides } from "./db/schema";
import {
  isCondition,
  isRarity,
  type Condition,
  type Card,
  type NamedVariant,
  type Rarity,
} from "./catalog";

type OverrideData = {
  stock: number;
  priceCents: number | null;
  rarity: Rarity | null;
  condition: Condition | null;
};

type StockOverrideRow = {
  cardId: string;
  variant: string;
  stock: number;
  priceCents: number | null;
  rarity: string | null;
  condition: string | null;
};

type CardOverrideRow = {
  cardId: string;
  name: string | null;
  condition: string | null;
  image: string | null;
  imageBack: string | null;
  description: string | null;
  weightGrams: number | null;
};

type HiddenVariantRow = {
  cardId: string;
  variant: string;
};

type OverrideRows = {
  rows: StockOverrideRow[];
  metaRows: CardOverrideRow[];
  hiddenRows: HiddenVariantRow[];
};

type ApplyStockOverridesOptions = {
  cache?: boolean;
};

export const PUBLIC_STOCK_CACHE_SECONDS = 3600;
export const PUBLIC_STOCK_CACHE_TAG = "public-stock-overrides";
const PUBLIC_STOCK_CACHE_CHUNK_SIZE = 200;

const emptyOverrideRows = (): OverrideRows => ({
  rows: [],
  metaRows: [],
  hiddenRows: [],
});

async function loadStockRows(ids?: string[]): Promise<StockOverrideRow[]> {
  const db = getDb();

  try {
    if (ids) {
      return await db
        .select({
          cardId: stockOverrides.cardId,
          variant: stockOverrides.variant,
          stock: stockOverrides.stock,
          priceCents: stockOverrides.priceCents,
          rarity: stockOverrides.rarity,
          condition: stockOverrides.condition,
        })
        .from(stockOverrides)
        .where(inArray(stockOverrides.cardId, ids));
    }

    return await db
      .select({
        cardId: stockOverrides.cardId,
        variant: stockOverrides.variant,
        stock: stockOverrides.stock,
        priceCents: stockOverrides.priceCents,
        rarity: stockOverrides.rarity,
        condition: stockOverrides.condition,
      })
      .from(stockOverrides);
  } catch {
    if (ids) {
      const fallbackRows = await db
        .select({
          cardId: stockOverrides.cardId,
          variant: stockOverrides.variant,
          stock: stockOverrides.stock,
          priceCents: stockOverrides.priceCents,
          rarity: stockOverrides.rarity,
        })
        .from(stockOverrides)
        .where(inArray(stockOverrides.cardId, ids));

      return fallbackRows.map((row) => ({ ...row, condition: null }));
    }

    const fallbackRows = await db
      .select({
        cardId: stockOverrides.cardId,
        variant: stockOverrides.variant,
        stock: stockOverrides.stock,
        priceCents: stockOverrides.priceCents,
        rarity: stockOverrides.rarity,
      })
      .from(stockOverrides);

    return fallbackRows.map((row) => ({ ...row, condition: null }));
  }
}

async function loadMetaRows(ids?: string[]): Promise<CardOverrideRow[]> {
  const db = getDb();

  if (ids) {
    return db
      .select({
        cardId: cardOverrides.cardId,
        name: cardOverrides.name,
        condition: cardOverrides.condition,
        image: cardOverrides.image,
        imageBack: cardOverrides.imageBack,
        description: cardOverrides.description,
        weightGrams: cardOverrides.weightGrams,
      })
      .from(cardOverrides)
      .where(inArray(cardOverrides.cardId, ids));
  }

  return db
    .select({
      cardId: cardOverrides.cardId,
      name: cardOverrides.name,
      condition: cardOverrides.condition,
      image: cardOverrides.image,
      imageBack: cardOverrides.imageBack,
      description: cardOverrides.description,
      weightGrams: cardOverrides.weightGrams,
    })
    .from(cardOverrides);
}

async function loadHiddenRows(ids?: string[]): Promise<HiddenVariantRow[]> {
  const db = getDb();

  try {
    if (ids) {
      return await db
        .select({
          cardId: hiddenVariants.cardId,
          variant: hiddenVariants.variant,
        })
        .from(hiddenVariants)
        .where(inArray(hiddenVariants.cardId, ids));
    }

    return await db
      .select({
        cardId: hiddenVariants.cardId,
        variant: hiddenVariants.variant,
      })
      .from(hiddenVariants);
  } catch {
    return [];
  }
}

async function loadOverrideRows(ids?: string[]): Promise<OverrideRows> {
  if (ids && ids.length === 0) return emptyOverrideRows();

  const [rows, metaRows, hiddenRows] = await Promise.all([
    loadStockRows(ids),
    loadMetaRows(ids),
    loadHiddenRows(ids),
  ]);

  return { rows, metaRows, hiddenRows };
}

const loadCachedPublicOverrideRowsByIds = unstable_cache(
  (cacheKey: string) => loadOverrideRows(cacheKey.split("|").filter(Boolean)),
  ["public-stock-overrides-by-id-v1"],
  {
    revalidate: PUBLIC_STOCK_CACHE_SECONDS,
    tags: [PUBLIC_STOCK_CACHE_TAG],
  },
);

function mergeOverrideRows(chunks: OverrideRows[]): OverrideRows {
  return {
    rows: chunks.flatMap((chunk) => chunk.rows),
    metaRows: chunks.flatMap((chunk) => chunk.metaRows),
    hiddenRows: chunks.flatMap((chunk) => chunk.hiddenRows),
  };
}

async function loadCachedOverrideRows(ids: string[]) {
  const cleanIds = Array.from(new Set(ids)).sort();
  if (cleanIds.length === 0) return emptyOverrideRows();

  const chunks: string[] = [];
  for (let i = 0; i < cleanIds.length; i += PUBLIC_STOCK_CACHE_CHUNK_SIZE) {
    chunks.push(cleanIds.slice(i, i + PUBLIC_STOCK_CACHE_CHUNK_SIZE).join("|"));
  }

  return mergeOverrideRows(
    await Promise.all(chunks.map((chunk) => loadCachedPublicOverrideRowsByIds(chunk))),
  );
}

export function revalidatePublicStockCache() {
  revalidateTag(PUBLIC_STOCK_CACHE_TAG);
}

export async function applyStockOverrides<T extends Card>(
  cards: T[],
  options: ApplyStockOverridesOptions = {},
): Promise<T[]> {
  if (cards.length === 0) return cards;

  const ids = Array.from(new Set(cards.map((c) => c.id)));
  let data = emptyOverrideRows();

  try {
    data = options.cache ? await loadCachedOverrideRows(ids) : await loadOverrideRows(ids);
  } catch {
    return cards;
  }

  const { rows, metaRows, hiddenRows } = data;

  if (rows.length === 0 && metaRows.length === 0 && hiddenRows.length === 0) {
    return cards;
  }

  const metaByCard = new Map<string, (typeof metaRows)[number]>();
  for (const m of metaRows) metaByCard.set(m.cardId, m);

  const hiddenByCard = new Map<string, string[]>();
  for (const row of hiddenRows) {
    const variants = hiddenByCard.get(row.cardId) ?? [];
    variants.push(row.variant);
    hiddenByCard.set(row.cardId, variants);
  }

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
      condition: r.condition && isCondition(r.condition) ? r.condition : null,
    });
  }

  return cards.map((c) => {
    const overrides = byCard.get(c.id);
    const meta = metaByCard.get(c.id);
    const hidden = hiddenByCard.get(c.id);
    if (!overrides && !meta && !hidden) return c;

    const next: T = { ...c };

    if (hidden) {
      next.hiddenVariants = hidden;
    }

    if (meta) {
      if (meta.name) next.name = meta.name;
      if (meta.condition && isCondition(meta.condition)) {
        next.condition = meta.condition;
      }
      if (meta.image) next.image = meta.image;
      if (meta.imageBack) next.imageBack = meta.imageBack;
      if (meta.description) next.description = meta.description;
      if (meta.weightGrams !== null && meta.weightGrams !== undefined) {
        next.weightGrams = meta.weightGrams;
      }
    }

    if (!overrides) return next;

    const baseOverride = overrides.get("base");
    if (baseOverride) {
      next.stock = baseOverride.stock;
      if (baseOverride.priceCents !== null) {
        next.price = baseOverride.priceCents / 100;
      }
      if (baseOverride.rarity !== null) {
        next.rarity = baseOverride.rarity;
      }
      if (baseOverride.condition !== null) {
        next.condition = baseOverride.condition;
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
          condition: altOverride.condition ?? next.altVariant.condition,
        };
      } else if (altOverride.rarity !== null) {
        next.altVariant = {
          rarity: altOverride.rarity,
          condition: altOverride.condition ?? next.condition,
          stock: altOverride.stock,
          price:
            altOverride.priceCents !== null
              ? altOverride.priceCents / 100
              : next.price,
        };
      }
    }

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
          condition: ov.condition ?? existing.condition,
        };
      } else if (ov.rarity !== null) {
        const created: NamedVariant = {
          key,
          rarity: ov.rarity,
          condition: ov.condition ?? next.condition,
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
