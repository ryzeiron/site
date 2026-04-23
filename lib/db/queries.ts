import "server-only";
import { db } from "./client";
import { cards as cardsTable, type DbCard } from "./schema";
import { desc, eq, sql } from "drizzle-orm";
import type { Card, Rarity } from "../catalog";

function rowToCard(row: DbCard): Card {
  return {
    id: row.id,
    serieId: row.serieId,
    name: row.name,
    number: row.number,
    rarity: row.rarity as Rarity,
    condition: row.condition as Card["condition"],
    language: row.language as Card["language"],
    price: row.price,
    stock: row.stock,
    image: row.image ?? undefined,
    description: row.description ?? undefined,
    altVariant:
      row.altRarity && row.altPrice !== null && row.altStock !== null
        ? {
            rarity: row.altRarity as Rarity,
            price: row.altPrice,
            stock: row.altStock,
          }
        : undefined,
  };
}

export async function cardsForSerieDb(serieId: string): Promise<Card[]> {
  const rows = await db
    .select()
    .from(cardsTable)
    .where(eq(cardsTable.serieId, serieId));
  return rows.map(rowToCard);
}

export async function getCardDb(cardId: string): Promise<Card | undefined> {
  const rows = await db
    .select()
    .from(cardsTable)
    .where(eq(cardsTable.id, cardId))
    .limit(1);
  return rows[0] ? rowToCard(rows[0]) : undefined;
}

export async function featuredCardsDb(limit = 6): Promise<Card[]> {
  const rows = await db
    .select()
    .from(cardsTable)
    .orderBy(desc(cardsTable.price))
    .limit(limit);
  return rows.map(rowToCard);
}

export async function allCardsDb(): Promise<Card[]> {
  const rows = await db.select().from(cardsTable).orderBy(cardsTable.id);
  return rows.map(rowToCard);
}

export async function countsBySerieDb(): Promise<Record<string, number>> {
  const rows = await db
    .select({
      serieId: cardsTable.serieId,
      count: sql<number>`cast(count(*) as int)`,
    })
    .from(cardsTable)
    .groupBy(cardsTable.serieId);
  const counts: Record<string, number> = {};
  for (const r of rows) counts[r.serieId] = r.count;
  return counts;
}

