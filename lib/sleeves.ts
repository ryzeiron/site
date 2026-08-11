import "server-only";

import { inArray, sql } from "drizzle-orm";
import { revalidateTag, unstable_cache } from "next/cache";
import {
  getCatalogSleeve,
  getCatalogSleeves,
  type CatalogSleeve,
} from "@/lib/catalog/sleeves";
import { getDb } from "@/lib/db/client";
import { sleeveOverrides } from "@/lib/db/schema";

type SleeveOverride = typeof sleeveOverrides.$inferSelect;

type GetSleevesOptions = {
  activeOnly?: boolean;
  cache?: boolean;
};

export const PUBLIC_SLEEVE_CACHE_SECONDS = 3600;
export const PUBLIC_SLEEVE_CACHE_TAG = "public-sleeve-overrides";

export type SleeveProduct = {
  id: string;
  name: string;
  description: string | null;
  image: string | null;
  priceCents: number;
  stock: number;
  active: boolean;
  hasOverride: boolean;
};

function toSleeveProduct(
  sleeve: CatalogSleeve,
  override?: SleeveOverride,
): SleeveProduct {
  return {
    id: sleeve.id,
    // Le nom du catalogue peut etre corrige depuis l'admin sans toucher au code.
    name: override?.name?.trim() || sleeve.name,
    description: sleeve.description ?? null,
    image: override?.image ?? sleeve.image ?? null,
    priceCents: override?.priceCents ?? sleeve.defaultPriceCents,
    stock: override?.stock ?? sleeve.defaultStock,
    active: override?.active ?? sleeve.active ?? true,
    hasOverride: Boolean(override),
  };
}

function withIds<T>(query: T, ids?: string[]) {
  if (!ids) return query;
  return (query as { where: (condition: unknown) => T }).where(
    inArray(sleeveOverrides.sleeveId, ids),
  );
}

async function getOverrideRows(ids?: string[]) {
  if (ids && ids.length === 0) return [];

  try {
    return await withIds(getDb().select().from(sleeveOverrides), ids);
  } catch {
    try {
      const query = getDb()
        .select({
          sleeveId: sleeveOverrides.sleeveId,
          priceCents: sleeveOverrides.priceCents,
          stock: sleeveOverrides.stock,
          active: sleeveOverrides.active,
          updatedAt: sleeveOverrides.updatedAt,
        })
        .from(sleeveOverrides);
      const rows = await withIds(query, ids);
      return rows.map((row) => ({
        ...row,
        image: null,
        name: null,
      })) as SleeveOverride[];
    } catch {
      return [];
    }
  }
}

const getCachedSleeveOverrideRows = unstable_cache(
  () => getOverrideRows(),
  ["public-sleeve-overrides-v2"],
  {
    revalidate: PUBLIC_SLEEVE_CACHE_SECONDS,
    tags: [PUBLIC_SLEEVE_CACHE_TAG],
  },
);

function rowsToOverrideMap(rows: SleeveOverride[]) {
  return new Map(rows.map((row) => [row.sleeveId, row]));
}

export function revalidatePublicSleeveCache() {
  revalidateTag(PUBLIC_SLEEVE_CACHE_TAG);
}

export async function getSleeves(options: GetSleevesOptions = {}) {
  const catalog = getCatalogSleeves();
  const overrideRows = options.cache
    ? await getCachedSleeveOverrideRows()
    : await getOverrideRows(catalog.map((sleeve) => sleeve.id));
  const overrides = rowsToOverrideMap(overrideRows);
  const products = catalog.map((sleeve) =>
    toSleeveProduct(sleeve, overrides.get(sleeve.id)),
  );

  return options.activeOnly
    ? products.filter((product) => product.active)
    : products;
}

export async function getSleevesByIds(ids: string[]) {
  const cleanIds = Array.from(new Set(ids.map((id) => id.trim()).filter(Boolean)));
  if (cleanIds.length === 0) return [];

  const catalogById = new Map(
    getCatalogSleeves().map((sleeve) => [sleeve.id, sleeve]),
  );
  const overrides = rowsToOverrideMap(await getOverrideRows(cleanIds));

  return cleanIds
    .map((id) => {
      const sleeve = catalogById.get(id);
      return sleeve ? toSleeveProduct(sleeve, overrides.get(id)) : null;
    })
    .filter((sleeve): sleeve is SleeveProduct => Boolean(sleeve));
}

export async function decrementSleeveStock(
  items: { sleeveId: string; quantity: number }[],
) {
  if (items.length === 0) return [];

  const db = getDb();
  let changed = false;
  const updatedItems: { sleeveId: string; name: string; stock: number }[] = [];

  for (const item of items) {
    if (!item.sleeveId || item.quantity <= 0) continue;

    const catalogSleeve = getCatalogSleeve(item.sleeveId);
    if (!catalogSleeve) continue;

    const [existing] = await getOverrideRows([item.sleeveId]);

    const currentStock = existing?.stock ?? catalogSleeve.defaultStock;
    const nextStock = Math.max(0, currentStock - item.quantity);
    updatedItems.push({
      sleeveId: item.sleeveId,
      name: catalogSleeve.name,
      stock: nextStock,
    });

    await db
      .insert(sleeveOverrides)
      .values({
        sleeveId: item.sleeveId,
        priceCents: existing?.priceCents ?? catalogSleeve.defaultPriceCents,
        stock: nextStock,
        active: existing?.active ?? catalogSleeve.active ?? true,
        updatedAt: new Date(),
      })
      .onConflictDoUpdate({
        target: sleeveOverrides.sleeveId,
        set: {
          stock: sql`GREATEST(${sleeveOverrides.stock} - ${item.quantity}, 0)`,
          updatedAt: new Date(),
        },
      });

    changed = true;
  }

  if (changed) {
    revalidatePublicSleeveCache();
  }

  return updatedItems;
}
