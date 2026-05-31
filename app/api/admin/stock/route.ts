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
import { revalidatePublicStockCache } from "@/lib/stock";
import { and, eq, sql } from "drizzle-orm";

type Body = {
  cardId?: string;
  variant?: string;
  stock?: number;
  price?: number;
  rarity?: string;
  condition?: string;
};

class AdminStockError extends Error {
  status: number;

  constructor(message: string, status = 400) {
    super(message);
    this.status = status;
  }
}

function validateVariantKey(value: unknown) {
  if (typeof value !== "string" || !isValidVariantKey(value)) {
    throw new AdminStockError("Variante invalide");
  }
  return value;
}

async function saveStockUpdate(body: Body) {
  if (!body.cardId) {
    throw new AdminStockError("Carte manquante");
  }

  const variant = validateVariantKey(body.variant);

  const stockInput = body.stock;
  const priceInput = body.price;
  const rarityInput = body.rarity;
  const conditionInput = body.condition;
  const hasStock = typeof stockInput !== "undefined";
  const hasPrice = typeof priceInput !== "undefined";
  const hasRarity = typeof rarityInput !== "undefined";
  const hasCondition = typeof conditionInput !== "undefined";

  if (!hasStock && !hasPrice && !hasRarity && !hasCondition) {
    throw new AdminStockError("Aucune modification");
  }

  if (hasStock && (!Number.isInteger(stockInput) || Number(stockInput) < 0)) {
    throw new AdminStockError("Stock invalide");
  }

  if (hasPrice && (typeof priceInput !== "number" || !Number.isFinite(priceInput) || priceInput < 0)) {
    throw new AdminStockError("Prix invalide");
  }

  if (hasRarity && !isRarity(rarityInput)) {
    throw new AdminStockError("Rarete invalide");
  }

  if (hasCondition && !isCondition(conditionInput)) {
    throw new AdminStockError("Etat invalide");
  }

  const card = getCard(body.cardId);
  if (!card) {
    throw new AdminStockError("Carte introuvable", 404);
  }

  const resolvedVariant = resolveVariant(card, variant);
  let creatingNew = !resolvedVariant;

  if (creatingNew) {
    try {
      const existing = await getDb()
        .select({ variant: stockOverrides.variant })
        .from(stockOverrides)
        .where(and(eq(stockOverrides.cardId, card.id), eq(stockOverrides.variant, variant)))
        .limit(1);
      if (existing.length > 0) {
        creatingNew = false;
      }
    } catch {
      // If this check fails, keep the catalog-based value.
    }
  }

  if (creatingNew && !hasRarity) {
    throw new AdminStockError("Rarete obligatoire pour creer une variante");
  }

  const previousStock = resolvedVariant?.stock ?? 0;
  const currentStock = resolvedVariant?.stock ?? card.stock;
  const currentPrice = resolvedVariant?.price ?? card.price;
  const currentRarity = resolvedVariant?.rarity ?? card.rarity;
  const currentCondition = resolvedVariant?.condition ?? card.condition;

  const stockValue: number = hasStock ? Number(stockInput) : creatingNew ? 0 : currentStock;
  const priceCentsValue = hasPrice ? Math.round(Number(priceInput) * 100) : undefined;
  const insertPriceCents = hasPrice
    ? Math.round(Number(priceInput) * 100)
    : creatingNew
      ? Math.round(currentPrice * 100)
      : null;
  const rarityValue = (hasRarity ? rarityInput : currentRarity) as Rarity;
  const conditionValue = (hasCondition ? conditionInput : currentCondition) as Condition;

  try {
    await getDb()
      .insert(stockOverrides)
      .values({
        cardId: card.id,
        variant,
        stock: stockValue,
        priceCents: insertPriceCents,
        rarity: rarityValue,
        condition: conditionValue,
      })
      .onConflictDoUpdate({
        target: [stockOverrides.cardId, stockOverrides.variant],
        set: {
          stock: hasStock ? stockValue : sql`${stockOverrides.stock}`,
          priceCents: hasPrice ? priceCentsValue : sql`${stockOverrides.priceCents}`,
          rarity: hasRarity ? rarityValue : sql`${stockOverrides.rarity}`,
          condition: hasCondition ? conditionValue : sql`${stockOverrides.condition}`,
          updatedAt: new Date(),
        },
      });
  } catch (error) {
    const message = error instanceof Error ? error.message : "";

    if (message.includes("condition") || message.includes("stock_overrides_condition")) {
      await getDb()
        .execute(sql`
          INSERT INTO stock_overrides (
            card_id,
            variant,
            stock,
            price_cents,
            rarity,
            updated_at
          )
          VALUES (
            ${card.id},
            ${variant},
            ${stockValue},
            ${insertPriceCents},
            ${rarityValue},
            ${new Date()}
          )
          ON CONFLICT (card_id, variant) DO UPDATE SET
            stock = CASE WHEN ${hasStock} THEN EXCLUDED.stock ELSE stock_overrides.stock END,
            price_cents = CASE WHEN ${hasPrice} THEN EXCLUDED.price_cents ELSE stock_overrides.price_cents END,
            rarity = CASE WHEN ${hasRarity} THEN EXCLUDED.rarity ELSE stock_overrides.rarity END,
            updated_at = ${new Date()}
        `);
    } else {
      throw new AdminStockError(message || "Erreur base de donnees", 500);
    }
  }

  const nextStock = hasStock ? stockValue : currentStock;
  let restockNotifications = 0;

  if (previousStock <= 0 && nextStock > 0) {
    const result = await notifyRestockSubscribers({ cardId: card.id, variant });
    restockNotifications = result.sent;
  }

  return {
    cardId: card.id,
    variant,
    restockNotifications,
  };
}

export async function POST(request: Request) {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: "Non autorise" }, { status: 401 });
  }

  let body: Body & { updates?: Body[] };
  try {
    body = (await request.json()) as Body & { updates?: Body[] };
  } catch {
    return NextResponse.json({ error: "Requete invalide" }, { status: 400 });
  }

  try {
    if (Array.isArray(body.updates)) {
      if (body.updates.length === 0) {
        throw new AdminStockError("Aucune modification");
      }

      if (body.updates.length > 500) {
        throw new AdminStockError("Trop de modifications a envoyer d'un coup");
      }

      const results = [];
      try {
        for (const update of body.updates) {
          results.push(await saveStockUpdate(update));
        }
      } catch (error) {
        if (results.length > 0) {
          revalidatePublicStockCache();
        }
        throw error;
      }

      revalidatePublicStockCache();

      return NextResponse.json({
        ok: true,
        count: results.length,
        restockNotifications: results.reduce(
          (total, result) => total + result.restockNotifications,
          0,
        ),
        results,
      });
    }

    const result = await saveStockUpdate(body);
    revalidatePublicStockCache();

    return NextResponse.json({
      ok: true,
      restockNotifications: result.restockNotifications,
    });
  } catch (error) {
    if (error instanceof AdminStockError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }

    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: "Non autorise" }, { status: 401 });
  }

  let body: Pick<Body, "cardId" | "variant">;
  try {
    body = (await request.json()) as Pick<Body, "cardId" | "variant">;
  } catch {
    return NextResponse.json({ error: "Requete invalide" }, { status: 400 });
  }

  if (!body.cardId) {
    return NextResponse.json({ error: "Carte manquante" }, { status: 400 });
  }

  let variant: string;
  try {
    variant = validateVariantKey(body.variant);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Variante invalide";
    return NextResponse.json({ error: message }, { status: 400 });
  }

  const card = getCard(body.cardId);
  if (!card) {
    return NextResponse.json({ error: "Carte introuvable" }, { status: 404 });
  }

  await getDb()
    .delete(stockOverrides)
    .where(and(eq(stockOverrides.cardId, card.id), eq(stockOverrides.variant, variant)));

  revalidatePublicStockCache();

  return NextResponse.json({ ok: true });
}
