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

// Sleeve cree depuis l'admin : il n'a aucune contrepartie dans le catalogue,
// toutes ses donnees viennent donc de la ligne de surcharge.
function overrideToSleeveProduct(override: SleeveOverride): SleeveProduct {
  return {
    id: override.sleeveId,
    name: override.name?.trim() || override.sleeveId,
    description: override.description ?? null,
    image: override.image ?? null,
    priceCents: override.priceCents,
    stock: override.stock,
    active: override.active,
    hasOverride: true,
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
  // Toutes les lignes sont chargees, pas seulement celles du catalogue : sinon
  // les sleeves crees depuis l'admin seraient invisibles.
  const overrideRows = options.cache
    ? await getCachedSleeveOverrideRows()
    : await getOverrideRows();
  const overrides = rowsToOverrideMap(overrideRows);
  const catalogIds = new Set(catalog.map((sleeve) => sleeve.id));
  const products = catalog.map((sleeve) =>
    toSleeveProduct(sleeve, overrides.get(sleeve.id)),
  );

  for (const row of overrideRows) {
    if (!catalogIds.has(row.sleeveId)) {
      products.push(overrideToSleeveProduct(row));
    }
  }

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
      if (sleeve) return toSleeveProduct(sleeve, overrides.get(id));

      const override = overrides.get(id);
      return override ? overrideToSleeveProduct(override) : null;
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
    const [existing] = await getOverrideRows([item.sleeveId]);

    // Un sleeve cree depuis l'admin n'existe que dans la base : sans ce garde-fou
    // il serait ignore ici et son stock ne descendrait jamais apres une vente.
    if (!catalogSleeve && !existing) continue;

    const currentStock = existing?.stock ?? catalogSleeve?.defaultStock ?? 0;
    const nextStock = Math.max(0, currentStock - item.quantity);
    updatedItems.push({
      sleeveId: item.sleeveId,
      name: existing?.name?.trim() || catalogSleeve?.name || item.sleeveId,
      stock: nextStock,
    });

    await db
      .insert(sleeveOverrides)
      .values({
        sleeveId: item.sleeveId,
        priceCents: existing?.priceCents ?? catalogSleeve?.defaultPriceCents ?? 0,
        stock: nextStock,
        active: existing?.active ?? catalogSleeve?.active ?? true,
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
