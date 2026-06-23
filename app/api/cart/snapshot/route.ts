import { NextResponse } from "next/server";
import { eq, lt, sql } from "drizzle-orm";
import { auth } from "@/lib/auth";
import {
  getCard,
  getSerie,
  resolveVariant,
  type Card,
  type VariantKey,
} from "@/lib/catalog";
import { getDb } from "@/lib/db/client";
import { cartSnapshots, type CartSnapshotItem } from "@/lib/db/schema";
import { getSleevesByIds } from "@/lib/sleeves";
import { applyStockOverrides } from "@/lib/stock";

type CardInput = {
  type?: "card";
  cardId?: string;
  variant?: VariantKey;
  quantity?: number;
};

type SleeveInput = {
  type: "sleeve";
  sleeveId?: string;
  quantity?: number;
};

type Body = {
  cartId?: string;
  items?: (CardInput | SleeveInput)[];
};

const CART_ID_RE = /^[a-z0-9-]{8,64}$/i;
const MAX_LINES = 500;
const MAX_QUANTITY = 999;

export async function POST(request: Request) {
  let body: Body;

  try {
    body = (await request.json()) as Body;
  } catch {
    return NextResponse.json({ error: "Requête invalide." }, { status: 400 });
  }

  const cartId = cleanCartId(body.cartId);
  if (!cartId) {
    return NextResponse.json({ error: "Panier invalide." }, { status: 400 });
  }

  const rawItems = Array.isArray(body.items) ? body.items.slice(0, MAX_LINES) : [];

  if (rawItems.length === 0) {
    await deleteSnapshot(cartId);
    return NextResponse.json({ ok: true });
  }

  const session = await auth().catch(() => null);
  const cardInputs = cleanCardInputs(rawItems);
  const sleeveInputs = cleanSleeveInputs(rawItems);

  const items = [
    ...(await buildCardSnapshotItems(cardInputs)),
    ...(await buildSleeveSnapshotItems(sleeveInputs)),
  ];

  if (items.length === 0) {
    await deleteSnapshot(cartId);
    return NextResponse.json({ ok: true });
  }

  const itemCount = items.reduce((total, item) => total + item.quantity, 0);
  const totalCents = items.reduce((total, item) => total + item.lineTotalCents, 0);

  try {
    await getDb()
      .insert(cartSnapshots)
      .values({
        cartId,
        userId: session?.user?.id ?? null,
        userEmail: session?.user?.email ?? null,
        userName: session?.user?.name ?? null,
        itemCount,
        totalCents,
        items,
        updatedAt: new Date(),
      })
      .onConflictDoUpdate({
        target: cartSnapshots.cartId,
        set: {
          userId: session?.user?.id ?? null,
          userEmail: session?.user?.email ?? null,
          userName: session?.user?.name ?? null,
          itemCount,
          totalCents,
          items,
          updatedAt: new Date(),
        },
      });

    if (Math.random() < 0.05) {
      await cleanupOldSnapshots().catch(() => {});
    }
  } catch {
    return NextResponse.json({ ok: true, skipped: true });
  }

  return NextResponse.json({ ok: true });
}

export async function DELETE(request: Request) {
  let body: { cartId?: string };

  try {
    body = (await request.json()) as { cartId?: string };
  } catch {
    return NextResponse.json({ error: "Requête invalide." }, { status: 400 });
  }

  const cartId = cleanCartId(body.cartId);
  if (!cartId) {
    return NextResponse.json({ error: "Panier invalide." }, { status: 400 });
  }

  await deleteSnapshot(cartId);
  return NextResponse.json({ ok: true });
}

function cleanCartId(value?: string) {
  const cartId = value?.trim() ?? "";
  return CART_ID_RE.test(cartId) ? cartId : null;
}

function cleanQuantity(value: unknown) {
  const quantity = Number(value);
  if (!Number.isInteger(quantity) || quantity <= 0) return null;
  return Math.min(quantity, MAX_QUANTITY);
}

function cleanCardInputs(rawItems: (CardInput | SleeveInput)[]) {
  return rawItems
    .filter((item): item is CardInput => item.type !== "sleeve")
    .map((item) => ({
      cardId: item.cardId?.trim() ?? "",
      variant: (item.variant || "base") as VariantKey,
      quantity: cleanQuantity(item.quantity),
    }))
    .filter(
      (item): item is { cardId: string; variant: VariantKey; quantity: number } =>
        Boolean(item.cardId) && Boolean(item.quantity),
    );
}

function cleanSleeveInputs(rawItems: (CardInput | SleeveInput)[]) {
  return rawItems
    .filter((item): item is SleeveInput => item.type === "sleeve")
    .map((item) => ({
      sleeveId: item.sleeveId?.trim() ?? "",
      quantity: cleanQuantity(item.quantity),
    }))
    .filter(
      (item): item is { sleeveId: string; quantity: number } =>
        Boolean(item.sleeveId) && Boolean(item.quantity),
    );
}

async function buildCardSnapshotItems(
  inputs: { cardId: string; variant: VariantKey; quantity: number }[],
) {
  if (inputs.length === 0) return [];

  const uniqueCards = Array.from(
    new Map(
      inputs
        .map((item) => [item.cardId, getCard(item.cardId)] as const)
        .filter((entry): entry is readonly [string, Card] => Boolean(entry[1])),
    ).values(),
  );

  let liveCards = uniqueCards;
  try {
    liveCards = await applyStockOverrides(uniqueCards);
  } catch {
    liveCards = uniqueCards;
  }

  const cardMap = new Map(liveCards.map((card) => [card.id, card]));

  return inputs
    .map((item): CartSnapshotItem | null => {
      const card = cardMap.get(item.cardId);
      if (!card) return null;

      const variant = resolveVariant(card, item.variant);
      const serie = getSerie(card.serieId);
      const unitPriceCents = Math.round(variant.price * 100);

      return {
        type: "card",
        id: card.id,
        variant: item.variant,
        name: card.name,
        number: card.number,
        serieName: serie?.name ?? card.serieId,
        image: variant.image ?? card.image ?? null,
        rarity: variant.rarity,
        condition: variant.condition,
        quantity: item.quantity,
        unitPriceCents,
        lineTotalCents: unitPriceCents * item.quantity,
        href: `/carte/${card.id}`,
      };
    })
    .filter((item): item is CartSnapshotItem => Boolean(item));
}

async function buildSleeveSnapshotItems(
  inputs: { sleeveId: string; quantity: number }[],
) {
  if (inputs.length === 0) return [];

  const sleeves = await getSleevesByIds(inputs.map((item) => item.sleeveId));
  const sleeveMap = new Map(sleeves.map((sleeve) => [sleeve.id, sleeve]));

  return inputs
    .map((item): CartSnapshotItem | null => {
      const sleeve = sleeveMap.get(item.sleeveId);
      if (!sleeve) return null;

      return {
        type: "sleeve",
        id: sleeve.id,
        name: sleeve.name,
        image: sleeve.image,
        quantity: item.quantity,
        unitPriceCents: sleeve.priceCents,
        lineTotalCents: sleeve.priceCents * item.quantity,
        href: "/sleeve",
      };
    })
    .filter((item): item is CartSnapshotItem => Boolean(item));
}

async function deleteSnapshot(cartId: string) {
  try {
    await getDb().delete(cartSnapshots).where(eq(cartSnapshots.cartId, cartId));
  } catch {
    // Le suivi panier ne doit jamais bloquer le client.
  }
}

async function cleanupOldSnapshots() {
  await getDb()
    .delete(cartSnapshots)
    .where(lt(cartSnapshots.updatedAt, sql`now() - interval '7 days'`));
}
