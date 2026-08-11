import { NextResponse } from "next/server";
import { isAdmin } from "@/lib/admin/auth";
import { deleteManagedPhoto } from "@/lib/media";
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
import { discordAdminUrl, sendDiscordNotification } from "@/lib/discord";
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
  image?: string | null;
  imageBack?: string | null;
};

class AdminStockError extends Error {
  status: number;

  constructor(message: string, status = 400) {
    super(message);
    this.status = status;
  }
}

const LOW_STOCK_ALERT_THRESHOLD = Math.max(
  0,
  Number.parseInt(process.env.LOW_STOCK_ALERT_THRESHOLD ?? "1", 10) || 1,
);

function validateVariantKey(value: unknown) {
  if (typeof value !== "string" || !isValidVariantKey(value)) {
    throw new AdminStockError("Variante invalide");
  }
  return value;
}

function cleanImageUrl(value: unknown): string | null | undefined {
  if (value === undefined) return undefined;
  if (value === null) return null;
  if (typeof value !== "string") {
    throw new AdminStockError("Image invalide");
  }

  const trimmed = value.trim();
  if (trimmed === "") return null;
  if (trimmed.startsWith("data:")) {
    throw new AdminStockError("Image invalide");
  }

  return trimmed;
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
  const imageInput = cleanImageUrl(body.image);
  const imageBackInput = cleanImageUrl(body.imageBack);
  const hasStock = typeof stockInput !== "undefined";
  const hasPrice = typeof priceInput !== "undefined";
  const hasRarity = typeof rarityInput !== "undefined";
  const hasCondition = typeof conditionInput !== "undefined";
  const hasImage = typeof imageInput !== "undefined";
  const hasImageBack = typeof imageBackInput !== "undefined";

  if (!hasStock && !hasPrice && !hasRarity && !hasCondition && !hasImage && !hasImageBack) {
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
  let previousImages:
    | { image: string | null; imageBack: string | null }
    | undefined;

  if (hasImage || hasImageBack) {
    try {
      previousImages = (
        await getDb()
          .select({
            image: stockOverrides.image,
            imageBack: stockOverrides.imageBack,
          })
          .from(stockOverrides)
          .where(and(eq(stockOverrides.cardId, card.id), eq(stockOverrides.variant, variant)))
          .limit(1)
      )[0];
    } catch {
      throw new AdminStockError(
        "Colonnes photo manquantes dans la base. Ajoute le SQL fourni.",
        500,
      );
    }
  }

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
        ...(hasImage ? { image: imageInput } : {}),
        ...(hasImageBack ? { imageBack: imageBackInput } : {}),
      })
      .onConflictDoUpdate({
        target: [stockOverrides.cardId, stockOverrides.variant],
        set: {
          stock: hasStock ? stockValue : sql`${stockOverrides.stock}`,
          priceCents: hasPrice ? priceCentsValue : sql`${stockOverrides.priceCents}`,
          rarity: hasRarity ? rarityValue : sql`${stockOverrides.rarity}`,
          condition: hasCondition ? conditionValue : sql`${stockOverrides.condition}`,
          ...(hasImage ? { image: imageInput } : {}),
          ...(hasImageBack ? { imageBack: imageBackInput } : {}),
          updatedAt: new Date(),
        },
      });
  } catch (error) {
    const message = error instanceof Error ? error.message : "";

    if (
      (hasImage || hasImageBack) &&
      (message.includes("image") || message.includes("stock_overrides_image"))
    ) {
      throw new AdminStockError(
        "Colonnes photo manquantes dans la base. Ajoute le SQL fourni.",
        500,
      );
    }

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

  await Promise.all([
    hasImage && imageInput !== previousImages?.image
      ? deleteManagedPhoto(previousImages?.image)
      : Promise.resolve(),
    hasImageBack && imageBackInput !== previousImages?.imageBack
      ? deleteManagedPhoto(previousImages?.imageBack)
      : Promise.resolve(),
  ]);

  const nextStock = hasStock ? stockValue : currentStock;
  let restockNotifications = 0;

  if (previousStock <= 0 && nextStock > 0) {
    const result = await notifyRestockSubscribers({ cardId: card.id, variant });
    restockNotifications = result.sent;
  }

  return {
    cardId: card.id,
    cardName: card.name,
    cardNumber: card.number,
    variant,
    rarity: rarityValue,
    stock: nextStock,
    lowStock: hasStock && nextStock <= LOW_STOCK_ALERT_THRESHOLD,
    restockNotifications,
  };
}

async function notifyLowStockCards(
  results: Awaited<ReturnType<typeof saveStockUpdate>>[],
) {
  const lowStockResults = results.filter((result) => result.lowStock);
  if (lowStockResults.length === 0) return;

  const visible = lowStockResults.slice(0, 10);
  const hiddenCount = lowStockResults.length - visible.length;

  await sendDiscordNotification("stock", {
    title:
      lowStockResults.length === 1
        ? "Stock faible carte"
        : "Stocks faibles cartes",
    description: `[Ouvrir l'admin stock](${discordAdminUrl("/admin")})`,
    fields: [
      ...visible.map((result) => ({
        name: `${result.cardName} ${result.cardNumber}`,
        value: `${result.rarity} - variante ${result.variant} - stock ${result.stock}`,
        inline: false,
      })),
      ...(hiddenCount > 0
        ? [
            {
              name: "Autres alertes",
              value: `${hiddenCount} autre(s) stock(s) faible(s) dans ce lot.`,
              inline: false,
            },
          ]
        : []),
    ],
  }).catch(() => false);
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
      await notifyLowStockCards(results);

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
    await notifyLowStockCards([result]);

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

  const db = getDb();
  let previousImages:
    | { image: string | null; imageBack: string | null }
    | undefined;

  try {
    previousImages = (
      await db
        .select({
          image: stockOverrides.image,
          imageBack: stockOverrides.imageBack,
        })
        .from(stockOverrides)
        .where(and(eq(stockOverrides.cardId, card.id), eq(stockOverrides.variant, variant)))
        .limit(1)
    )[0];
  } catch {
    previousImages = undefined;
  }

  await db
    .delete(stockOverrides)
    .where(and(eq(stockOverrides.cardId, card.id), eq(stockOverrides.variant, variant)));

  await Promise.all([
    deleteManagedPhoto(previousImages?.image),
    deleteManagedPhoto(previousImages?.imageBack),
  ]);

  revalidatePublicStockCache();

  return NextResponse.json({ ok: true });
}
