import "server-only";

import { eq, inArray, sql } from "drizzle-orm";
import {
  getCatalogSleeve,
  getCatalogSleeves,
  type CatalogSleeve,
} from "@/lib/catalog/sleeves";
import { getDb } from "@/lib/db/client";
import { sleeveOverrides } from "@/lib/db/schema";

type SleeveOverride = typeof sleeveOverrides.$inferSelect;

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
    name: sleeve.name,
    description: sleeve.description ?? null,
    image: sleeve.image ?? null,
    priceCents: override?.priceCents ?? sleeve.defaultPriceCents,
    stock: override?.stock ?? sleeve.defaultStock,
    active: override?.active ?? sleeve.active ?? true,
    hasOverride: Boolean(override),
  };
}

async function getOverrides(ids: string[]) {
  if (ids.length === 0) return new Map<string, SleeveOverride>();

  try {
    const rows = await getDb()
      .select()
      .from(sleeveOverrides)
      .where(inArray(sleeveOverrides.sleeveId, ids));

    return new Map(rows.map((row) => [row.sleeveId, row]));
  } catch {
    return new Map<string, SleeveOverride>();
  }
}

export async function getSleeves(options: { activeOnly?: boolean } = {}) {
  const catalog = getCatalogSleeves();
  const overrides = await getOverrides(catalog.map((sleeve) => sleeve.id));
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
  const overrides = await getOverrides(cleanIds);

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
  if (items.length === 0) return;

  const db = getDb();

  for (const item of items) {
    if (!item.sleeveId || item.quantity <= 0) continue;

    const catalogSleeve = getCatalogSleeve(item.sleeveId);
    if (!catalogSleeve) continue;

    const [existing] = await db
      .select()
      .from(sleeveOverrides)
      .where(eq(sleeveOverrides.sleeveId, item.sleeveId))
      .limit(1);

    const currentStock = existing?.stock ?? catalogSleeve.defaultStock;
    const nextStock = Math.max(0, currentStock - item.quantity);

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
  }
}
