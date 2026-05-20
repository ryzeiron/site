import "server-only";

import { desc, inArray, sql } from "drizzle-orm";
import { getDb } from "@/lib/db/client";
import { sleeves } from "@/lib/db/schema";

export type SleeveProduct = typeof sleeves.$inferSelect;

export async function getSleeves(options: { activeOnly?: boolean } = {}) {
  try {
    const rows = await getDb()
      .select()
      .from(sleeves)
      .orderBy(desc(sleeves.updatedAt));

    return options.activeOnly ? rows.filter((row) => row.active) : rows;
  } catch {
    return [];
  }
}

export async function getSleevesByIds(ids: string[]) {
  const cleanIds = Array.from(new Set(ids.map((id) => id.trim()).filter(Boolean)));
  if (cleanIds.length === 0) return [];

  try {
    return await getDb()
      .select()
      .from(sleeves)
      .where(inArray(sleeves.id, cleanIds));
  } catch {
    return [];
  }
}

export async function decrementSleeveStock(
  items: { sleeveId: string; quantity: number }[],
) {
  if (items.length === 0) return;

  const db = getDb();

  for (const item of items) {
    if (!item.sleeveId || item.quantity <= 0) continue;

    await db
      .update(sleeves)
      .set({
        stock: sql`GREATEST(${sleeves.stock} - ${item.quantity}, 0)`,
        updatedAt: new Date(),
      })
      .where(sql`${sleeves.id} = ${item.sleeveId}`);
  }
}
