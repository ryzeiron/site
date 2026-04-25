import { NextResponse } from "next/server";
import { isAdmin } from "@/lib/admin/auth";
import {
  getCard,
  isRarity,
  isValidVariantKey,
  resolveVariant,
  type Rarity,
} from "@/lib/catalog";
import { getDb } from "@/lib/db/client";
import { stockOverrides } from "@/lib/db/schema";
import { and, eq } from "drizzle-orm";

type Body = {
  cardId?: string;
  variant?: string;
  stock?: number;
  price?: number;
  rarity?: string;
};

function validateVariantKey(variant: string | undefined): string | null {
  if (!variant || typeof variant !== "string") return null;
  if (variant === "base" || variant === "alt") return variant;
  if (!isValidVariantKey(variant)) return null;
  return variant;
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

  const { cardId, variant, stock, price, rarity } = body;
  const variantKey = validateVariantKey(variant);
  if (!cardId || !variantKey) {
    return NextResponse.json(
      { error: "Cle de variante invalide (lettres minuscules, chiffres, tirets)." },
      { status: 400 },
    );
  }

  const card = getCard(cardId);
  if (!card) {
    return NextResponse.json({ error: "Carte introuvable." }, { status: 404 });
  }

  const hasStock = typeof stock === "number";
  const hasPrice = typeof price === "number";
  const hasRarity = typeof rarity === "string" && rarity.length > 0;

  if (!hasStock && !hasPrice && !hasRarity) {
    return NextResponse.json(
      { error: "Aucune modification a enregistrer." },
      { status: 400 },
    );
  }

  if (hasStock && (!Number.isInteger(stock) || stock < 0)) {
    return NextResponse.json(
      { error: "Stock invalide (entier >= 0)." },
      { status: 400 },
    );
  }

  if (hasPrice && (!Number.isFinite(price) || price < 0)) {
    return NextResponse.json({ error: "Prix invalide." }, { status: 400 });
  }

  let rarityValue: Rarity | undefined;
  if (hasRarity) {
    if (!isRarity(rarity)) {
      return NextResponse.json(
        { error: "Rarete inconnue." },
        { status: 400 },
      );
    }
    rarityValue = rarity;
  }

  const priceCentsValue = hasPrice ? Math.round(price * 100) : undefined;

  // Determiner s'il s'agit d'une nouvelle variante (sans correspondance dans le catalogue)
  const isAltCreatingNew = variantKey === "alt" && !card.altVariant;
  const isExtraCreatingNew =
    variantKey !== "base" &&
    variantKey !== "alt" &&
    !(card.extraVariants ?? []).some((v) => v.key === variantKey);
  const creatingNew = isAltCreatingNew || isExtraCreatingNew;

  if (creatingNew && !hasRarity) {
    return NextResponse.json(
      { error: "Rarete obligatoire pour creer une nouvelle variante." },
      { status: 400 },
    );
  }

  // Stock initial (si on cree, on n'a pas de fallback catalogue)
  let currentStock = 0;
  let currentPrice = card.price;
  if (variantKey === "base") {
    currentStock = card.stock;
    currentPrice = card.price;
  } else if (variantKey === "alt" && card.altVariant) {
    currentStock = card.altVariant.stock;
    currentPrice = card.altVariant.price;
  } else if (variantKey !== "alt" && variantKey !== "base") {
    const v = card.extraVariants?.find((x) => x.key === variantKey);
    if (v) {
      currentStock = v.stock;
      currentPrice = v.price;
    }
  } else {
    const r = resolveVariant(card, variantKey);
    currentStock = r.stock;
    currentPrice = r.price;
  }

  const insertStock = hasStock ? stock : currentStock;
  const insertPriceCents = hasPrice
    ? Math.round(price * 100)
    : creatingNew
      ? Math.round(currentPrice * 100)
      : null;
  const insertRarity = rarityValue ?? null;

  try {
    const db = getDb();
    await db
      .insert(stockOverrides)
      .values({
        cardId,
        variant: variantKey,
        stock: insertStock,
        priceCents: insertPriceCents,
        rarity: insertRarity,
      })
      .onConflictDoUpdate({
        target: [stockOverrides.cardId, stockOverrides.variant],
        set: {
          ...(hasStock ? { stock } : {}),
          ...(hasPrice ? { priceCents: priceCentsValue } : {}),
          ...(hasRarity ? { rarity: rarityValue } : {}),
          updatedAt: new Date(),
        },
      });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Erreur base de donnees.";
    return NextResponse.json({ error: message }, { status: 500 });
  }

  return NextResponse.json({
    ok: true,
    stock: insertStock,
    price: priceCentsValue !== undefined ? priceCentsValue / 100 : undefined,
    rarity: rarityValue,
  });
}

export async function DELETE(request: Request) {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: "Non autorise." }, { status: 401 });
  }

  let body: Body;
  try {
    body = (await request.json()) as Body;
  } catch {
    return NextResponse.json({ error: "Requete invalide." }, { status: 400 });
  }

  const { cardId, variant } = body;
  const variantKey = validateVariantKey(variant);
  if (!cardId || !variantKey) {
    return NextResponse.json({ error: "Champs invalides." }, { status: 400 });
  }

  try {
    const db = getDb();
    await db
      .delete(stockOverrides)
      .where(
        and(
          eq(stockOverrides.cardId, cardId),
          eq(stockOverrides.variant, variantKey),
        ),
      );
  } catch (e) {
    const message = e instanceof Error ? e.message : "Erreur base de donnees.";
    return NextResponse.json({ error: message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
