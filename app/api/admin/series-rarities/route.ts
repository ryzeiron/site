import { NextResponse } from "next/server";
import { isAdmin } from "@/lib/admin/auth";
import { CARDS, getSerie, isRarity, listVariants, type Rarity } from "@/lib/catalog";
import { getDb } from "@/lib/db/client";
import { stockOverrides } from "@/lib/db/schema";
import { applyStockOverrides } from "@/lib/stock";

type Body = {
  serieId?: string;
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

  const { serieId, rarity } = body;

  if (!serieId || !getSerie(serieId)) {
    return NextResponse.json({ error: "Série introuvable." }, { status: 404 });
  }

  if (!rarity || !isRarity(rarity)) {
    return NextResponse.json({ error: "Rareté inconnue." }, { status: 400 });
  }

  const targetRarity: Rarity = rarity;
  const serieCards = CARDS.filter((card) => card.serieId === serieId);
  const cardsWithOverrides = await applyStockOverrides(serieCards);
  const rows = cardsWithOverrides.flatMap((card) =>
    listVariants(card, { includeHidden: true }).map(({ key, variant }) => ({
      cardId: card.id,
      variant: key,
      stock: variant.stock,
      priceCents: null,
      rarity: targetRarity,
    })),
  );

  if (rows.length === 0) {
    return NextResponse.json({ ok: true, updated: 0, rarity: targetRarity });
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
    rarity: targetRarity,
  });
}
