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
  rarity?: string;
  price?: number;
};

const PROTECTED_MAIN_RARITIES = new Set<Rarity>(["Ultra Rare", "Secrete"]);
const PROTECTED_TARGET_RARITIES = new Set<Rarity>(["Commune", "Reverse"]);

export async function POST(request: Request) {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: "Non autorise." }, { status: 401 });
  }

  let body: Body;

  try {
    body = (await request.json()) as Body;
  } catch {
    return NextResponse.json({ error: "Requete invalide." }, { status: 400 });
  }

  const { serieId, rarity, price } = body;

  if (!serieId || !getSerie(serieId)) {
    return NextResponse.json({ error: "Serie introuvable." }, { status: 404 });
  }

  if (!rarity || !isRarity(rarity)) {
    return NextResponse.json({ error: "Rarete inconnue." }, { status: 400 });
  }
  const targetRarity: Rarity = rarity;

  if (typeof price !== "number" || !Number.isFinite(price) || price < 0) {
    return NextResponse.json({ error: "Prix invalide." }, { status: 400 });
  }

  const priceCents = Math.round(price * 100);
  const serieCards = CARDS.filter((card) => card.serieId === serieId);
  const catalogRarityById = new Map(
    serieCards.map((card) => [card.id, card.rarity]),
  );
  const cardsWithOverrides = await applyStockOverrides(serieCards);
  let skippedProtected = 0;

  const updates = cardsWithOverrides.flatMap((card) => {
    const matchingVariants = listVariants(card).filter(
      ({ variant }) => variant.rarity === targetRarity,
    );

    if (matchingVariants.length === 0) return [];

    const catalogRarity = catalogRarityById.get(card.id) ?? card.rarity;
    const isProtectedMainRarity =
      PROTECTED_MAIN_RARITIES.has(card.rarity) ||
      PROTECTED_MAIN_RARITIES.has(catalogRarity);

    if (
      PROTECTED_TARGET_RARITIES.has(targetRarity) &&
      isProtectedMainRarity
    ) {
      skippedProtected += 1;
      return [];
    }

    return matchingVariants.map(({ key, variant }) => ({
      cardId: card.id,
      variant: key,
      stock: variant.stock,
      priceCents,
      rarity: null,
    }));
  });

  if (updates.length === 0) {
    return NextResponse.json({ ok: true, updated: 0, skippedProtected });
  }

  try {
    const db = getDb();

    await db
      .insert(stockOverrides)
      .values(updates)
      .onConflictDoUpdate({
        target: [stockOverrides.cardId, stockOverrides.variant],
        set: {
          priceCents,
          updatedAt: new Date(),
        },
      });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Erreur base de donnees.";
    return NextResponse.json({ error: message }, { status: 500 });
  }

  return NextResponse.json({
    ok: true,
    updated: updates.length,
    skippedProtected,
    rarity: targetRarity,
    price: priceCents / 100,
  });
}
