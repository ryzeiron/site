import { NextResponse } from "next/server";
import { isAdmin } from "@/lib/admin/auth";
import {
  CARDS,
  getSerie,
  isRarity,
  listVariants,
  type Rarity,
} from "@/lib/catalog";
import { getDb } from "@/lib/db/client";
import { stockOverrides } from "@/lib/db/schema";
import { applyStockOverrides } from "@/lib/stock";

type Body = {
  serieId?: string;
  fromRarity?: string;
  rarity?: string;
};

export async function POST(request: Request) {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: "Non autorisé." }, { status: 401 });
  }

  let body: Body;

  try {
    body = (await request.json()) as Body;
  } catch {
    return NextResponse.json({ error: "Requête invalide." }, { status: 400 });
  }

  const { serieId, fromRarity, rarity } = body;

  if (!serieId || !getSerie(serieId)) {
    return NextResponse.json({ error: "Série introuvable." }, { status: 404 });
  }

  if (fromRarity && !isRarity(fromRarity)) {
    return NextResponse.json({ error: "Rareté source inconnue." }, { status: 400 });
  }

  if (!rarity || !isRarity(rarity)) {
    return NextResponse.json({ error: "Rareté inconnue." }, { status: 400 });
  }

  const sourceRarity: Rarity | null = fromRarity && isRarity(fromRarity) ? fromRarity : null;
  const targetRarity: Rarity = rarity;

  if (sourceRarity && sourceRarity === targetRarity) {
    return NextResponse.json({
      ok: true,
      updated: 0,
      fromRarity: sourceRarity,
      rarity: targetRarity,
    });
  }

  const serieCards = CARDS.filter((card) => card.serieId === serieId);
  const cardsWithOverrides = await applyStockOverrides(serieCards);
  const rows = cardsWithOverrides.flatMap((card) =>
    listVariants(card, { includeHidden: true })
      .filter(({ variant }) => !sourceRarity || variant.rarity === sourceRarity)
      .map(({ key, variant }) => ({
        cardId: card.id,
        variant: key,
        stock: variant.stock,
        priceCents: null,
        rarity: targetRarity,
      })),
  );

  if (rows.length === 0) {
    return NextResponse.json({
      ok: true,
      updated: 0,
      fromRarity: sourceRarity,
      rarity: targetRarity,
    });
  }

  try {
    const db = getDb();
    await db
      .insert(stockOverrides)
      .values(rows)
      .onConflictDoUpdate({
        target: [stockOverrides.cardId, stockOverrides.variant],
        set: {
          rarity: targetRarity,
          updatedAt: new Date(),
        },
      });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Erreur base de données.";
    return NextResponse.json({ error: message }, { status: 500 });
  }

  return NextResponse.json({
    ok: true,
    updated: rows.length,
    fromRarity: sourceRarity,
    rarity: targetRarity,
  });
}
