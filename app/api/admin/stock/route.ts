import { NextResponse } from "next/server";
import { isAdmin } from "@/lib/admin/auth";
import {
  getCard,
  isCondition,
  isRarity,
  isValidVariantKey,
  resolveVariant,
  type Condition,
  type Rarity,
} from "@/lib/catalog";
import { getDb } from "@/lib/db/client";
import { stockOverrides } from "@/lib/db/schema";
import { notifyRestockSubscribers } from "@/lib/restock-alerts";
import { and, eq, sql } from "drizzle-orm";

type Body = {
  cardId?: string;
  variant?: string;
  stock?: number;
  price?: number;
  rarity?: string;
  condition?: string;
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
    return NextResponse.json({ error: "Requête invalide." }, { status: 400 });
  }

  const { cardId, variant, stock, price, rarity, condition } = body;
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
  const hasCondition = typeof condition === "string" && condition.length > 0;

  if (!hasStock && !hasPrice && !hasRarity && !hasCondition) {
    return NextResponse.json(
      { error: "Aucune modification à enregistrer." },
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
        { error: "Rareté inconnue." },
        { status: 400 },
      );
    }
    rarityValue = rarity;
  }

  let conditionValue: Condition | undefined;
  if (hasCondition) {
    if (!isCondition(condition)) {
      return NextResponse.json(
        { error: "État inconnu." },
        { status: 400 },
      );
    }
    conditionValue = condition;
  }

  const priceCentsValue = hasPrice ? Math.round(price * 100) : undefined;

  const isAltCreatingNew = variantKey === "alt" && !card.altVariant;
  const isExtraCreatingNew =
    variantKey !== "base" &&
    variantKey !== "alt" &&
    !(card.extraVariants ?? []).some((v) => v.key === variantKey);
  let creatingNew = isAltCreatingNew || isExtraCreatingNew;

  if (creatingNew) {
    try {
      const existing = await getDb()
        .select({ variant: stockOverrides.variant })
        .from(stockOverrides)
        .where(
          and(
            eq(stockOverrides.cardId, cardId),
            eq(stockOverrides.variant, variantKey),
          ),
        )
        .limit(1);
      if (existing.length > 0) {
        creatingNew = false;
      }
    } catch {
      // On garde la valeur calculee si la verification echoue.
    }
  }

  if (creatingNew && !hasRarity) {
    return NextResponse.json(
      { error: "Rareté obligatoire pour créer une nouvelle variante." },
      { status: 400 },
    );
  }

  let currentStock = 0;
  let currentPrice = card.price;
  let currentCondition = card.condition;

  if (variantKey === "base") {
    currentStock = card.stock;
    currentPrice = card.price;
    currentCondition = card.condition;
  } else if (variantKey === "alt" && card.altVariant) {
    currentStock = card.altVariant.stock;
    currentPrice = card.altVariant.price;
    currentCondition = card.altVariant.condition ?? card.condition;
  } else if (variantKey !== "alt" && variantKey !== "base") {
    const v = card.extraVariants?.find((x) => x.key === variantKey);
    if (v) {
      currentStock = v.stock;
      currentPrice = v.price;
      currentCondition = v.condition ?? card.condition;
    }
  } else {
    const r = resolveVariant(card, variantKey);
    currentStock = r.stock;
    currentPrice = r.price;
    currentCondition = r.condition ?? card.condition;
  }

  const insertStock = hasStock ? stock : currentStock;
  const insertPriceCents = hasPrice
    ? Math.round(price * 100)
    : creatingNew
      ? Math.round(currentPrice * 100)
      : null;
  const insertRarity = rarityValue ?? null;
  const insertCondition = conditionValue ?? (creatingNew ? currentCondition : null);

  let restockNotifications: { sent: number; failed: number } | null = null;

  try {
    const db = getDb();
    const saveOverrideWithoutConditionColumn = () =>
      db.execute(sql`
        insert into stock_overrides
          (card_id, variant, stock, price_cents, rarity, updated_at)
        values
          (${cardId}, ${variantKey}, ${insertStock}, ${insertPriceCents}, ${insertRarity}, ${new Date()})
        on conflict (card_id, variant) do update set
          stock = case
            when ${hasStock} then excluded.stock
            else stock_overrides.stock
          end,
          price_cents = case
            when ${hasPrice} then excluded.price_cents
            else stock_overrides.price_cents
          end,
          rarity = case
            when ${hasRarity} then excluded.rarity
            else stock_overrides.rarity
          end,
          updated_at = ${new Date()}
      `);

    const saveOverride = (includeCondition: boolean) =>
      db
        .insert(stockOverrides)
        .values({
          cardId,
          variant: variantKey,
          stock: insertStock,
          priceCents: insertPriceCents,
          rarity: insertRarity,
          ...(includeCondition ? { condition: insertCondition } : {}),
        })
        .onConflictDoUpdate({
          target: [stockOverrides.cardId, stockOverrides.variant],
          set: {
            ...(hasStock ? { stock } : {}),
            ...(hasPrice ? { priceCents: priceCentsValue } : {}),
            ...(hasRarity ? { rarity: rarityValue } : {}),
            ...(includeCondition && hasCondition
              ? { condition: conditionValue }
              : {}),
            updatedAt: new Date(),
          },
        });

    try {
      await saveOverride(true);
    } catch {
      if (hasCondition) {
        throw new Error(
          "La colonne SQL condition manque dans stock_overrides. Ajoute le SQL avant de modifier l'état d'une variante.",
        );
      }
      await saveOverrideWithoutConditionColumn();
    }

    if (hasStock && currentStock <= 0 && stock > 0) {
      restockNotifications = await notifyRestockSubscribers({
        cardId,
        variant: variantKey,
      });
    }
  } catch (e) {
    const message = e instanceof Error ? e.message : "Erreur base de données.";
    return NextResponse.json({ error: message }, { status: 500 });
  }

  return NextResponse.json({
    ok: true,
    stock: insertStock,
    price: priceCentsValue !== undefined ? priceCentsValue / 100 : undefined,
    rarity: rarityValue,
    condition: conditionValue,
    restockNotifications,
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
    return NextResponse.json({ error: "Requête invalide." }, { status: 400 });
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
    const message = e instanceof Error ? e.message : "Erreur base de données.";
    return NextResponse.json({ error: message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
