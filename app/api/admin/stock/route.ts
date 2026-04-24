import { NextResponse } from "next/server";
import { isAdmin } from "@/lib/admin/auth";
import { getCard, isRarity, resolveVariant, type Rarity } from "@/lib/catalog";
import { getDb } from "@/lib/db/client";
import { stockOverrides } from "@/lib/db/schema";
import { and, eq } from "drizzle-orm";

type Body = {
  cardId?: string;
  variant?: "base" | "alt";
  stock?: number;
  price?: number;
  rarity?: string;
};

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
  if (!cardId || (variant !== "base" && variant !== "alt")) {
    return NextResponse.json({ error: "Champs invalides." }, { status: 400 });
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

  const creatingNewAlt =
    variant === "alt" && !card.altVariant;

  if (creatingNewAlt && !hasRarity) {
    return NextResponse.json(
      {
        error:
          "Rarete obligatoire pour creer une nouvelle variante alt.",
      },
      { status: 400 },
    );
  }

  const current =
    variant === "alt" && !card.altVariant
      ? { stock: 0, price: card.price }
      : resolveVariant(card, variant);

  const insertStock = hasStock ? stock : current.stock;
  const insertPriceCents = priceCentsValue ?? null;
  const insertRarity = rarityValue ?? null;

  try {
    const db = getDb();
    await db
      .insert(stockOverrides)
      .values({
        cardId,
        variant,
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
  if (!cardId || (variant !== "base" && variant !== "alt")) {
    return NextResponse.json({ error: "Champs invalides." }, { status: 400 });
  }

  try {
    const db = getDb();
    await db
      .delete(stockOverrides)
      .where(
        and(
          eq(stockOverrides.cardId, cardId),
          eq(stockOverrides.variant, variant),
        ),
      );
  } catch (e) {
    const message = e instanceof Error ? e.message : "Erreur base de donnees.";
    return NextResponse.json({ error: message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
