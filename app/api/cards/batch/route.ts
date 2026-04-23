import { NextResponse } from "next/server";
import { db } from "@/lib/db/client";
import { cards as cardsTable, type DbCard } from "@/lib/db/schema";
import { inArray } from "drizzle-orm";
import type { Card, Rarity } from "@/lib/catalog";

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

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { ids?: string[] };
    const ids = Array.isArray(body.ids) ? body.ids.filter(Boolean) : [];
    if (ids.length === 0) {
      return NextResponse.json({ cards: [] });
    }
    const rows = await db
      .select()
      .from(cardsTable)
      .where(inArray(cardsTable.id, ids));
    return NextResponse.json({ cards: rows.map(rowToCard) });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Erreur inconnue.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
