import { NextResponse } from "next/server";
import { isAdmin } from "@/lib/admin/auth";
import {
  CARDS,
  getSerie,
  isCondition,
  isRarity,
  listVariants,
  type Card,
  type Condition,
  type Rarity,
} from "@/lib/catalog";
import { getDb } from "@/lib/db/client";
import { stockOverrides } from "@/lib/db/schema";
import { applyStockOverrides } from "@/lib/stock";

type Body = {
  serieId?: string;
  rarity?: string;
  condition?: string;
  price?: number;
};

const PROTECTED_MAIN_RARITIES = new Set(["Ultra Rare", "Ultra rare", "Secrete"]);
const PROTECTED_TARGET_RARITIES = new Set<Rarity>(["Commune", "Reverse"]);

function slugifyValue(value: string) {
  return (
    value
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "")
      .slice(0, 24) || "variante"
  );
}

function pickVariantKey(card: Card, rarity: Rarity, condition: Condition) {
  const base = slugifyValue(`${rarity}-${condition}`);
  const usedKeys = new Set(
    listVariants(card, { includeHidden: true }).map(({ key }) => key),
  );
  let candidate = base;
  let i = 2;

  while (usedKeys.has(candidate) || candidate === "base" || candidate === "alt") {
    candidate = `${base}-${i++}`;
  }

  return candidate;
}

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

  const { serieId, rarity, condition, price } = body;

  if (!serieId || !getSerie(serieId)) {
    return NextResponse.json({ error: "Serie introuvable." }, { status: 404 });
  }

  if (!rarity || !isRarity(rarity)) {
    return NextResponse.json({ error: "Rarete inconnue." }, { status: 400 });
  }
  const targetRarity: Rarity = rarity;

  if (!condition || !isCondition(condition)) {
    return NextResponse.json({ error: "Etat inconnu." }, { status: 400 });
  }
  const targetCondition: Condition = condition;

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

  const existingUpdates: {
    cardId: string;
    variant: string;
    stock: number;
    priceCents: number;
    rarity: null;
    condition: null;
  }[] = [];

  const createdUpdates: {
    cardId: string;
    variant: string;
    stock: number;
    priceCents: number;
    rarity: Rarity;
    condition: Condition;
  }[] = [];

  for (const card of cardsWithOverrides) {
    const variants = listVariants(card, { includeHidden: true });

    const catalogRarity = catalogRarityById.get(card.id) ?? card.rarity;
    const isProtectedMainRarity =
      PROTECTED_MAIN_RARITIES.has(card.rarity) ||
      PROTECTED_MAIN_RARITIES.has(catalogRarity);

    if (PROTECTED_TARGET_RARITIES.has(targetRarity) && isProtectedMainRarity) {
      skippedProtected += 1;
      continue;
    }

    const matchingVariants = variants.filter(
      ({ variant }) =>
        variant.rarity === targetRarity &&
        (variant.condition ?? card.condition) === targetCondition,
    );

    if (matchingVariants.length > 0) {
      for (const { key, variant } of matchingVariants) {
        existingUpdates.push({
          cardId: card.id,
          variant: key,
          stock: variant.stock,
          priceCents,
          rarity: null,
          condition: null,
        });
      }
      continue;
    }

    createdUpdates.push({
      cardId: card.id,
      variant: pickVariantKey(card, targetRarity, targetCondition),
      stock: 0,
      priceCents,
      rarity: targetRarity,
      condition: targetCondition,
    });
  }

  const updated = existingUpdates.length + createdUpdates.length;

  if (updated === 0) {
    return NextResponse.json({
      ok: true,
      updated: 0,
      created: 0,
      existing: 0,
      skippedProtected,
    });
  }

  try {
    const db = getDb();

    if (existingUpdates.length > 0) {
      await db
        .insert(stockOverrides)
        .values(existingUpdates)
        .onConflictDoUpdate({
          target: [stockOverrides.cardId, stockOverrides.variant],
          set: {
            priceCents,
            updatedAt: new Date(),
          },
        });
    }

    if (createdUpdates.length > 0) {
      await db
        .insert(stockOverrides)
        .values(createdUpdates)
        .onConflictDoUpdate({
          target: [stockOverrides.cardId, stockOverrides.variant],
          set: {
            priceCents,
            rarity: targetRarity,
            condition: targetCondition,
            updatedAt: new Date(),
          },
        });
    }
  } catch (e) {
    const message = e instanceof Error ? e.message : "Erreur base de donnees.";
    return NextResponse.json({ error: message }, { status: 500 });
  }

  return NextResponse.json({
    ok: true,
    updated,
    created: createdUpdates.length,
    existing: existingUpdates.length,
    skippedProtected,
    rarity: targetRarity,
    condition: targetCondition,
    price: priceCents / 100,
  });
}
