import { NextResponse } from "next/server";
import { getCard, resolveVariant, type VariantKey } from "@/lib/catalog";
import { applyStockOverrides } from "@/lib/stock";
import {
  cleanupExpiredCartReservations,
  releaseCartReservation,
  syncCartReservation,
} from "@/lib/stock-reservations";

type SyncBody = {
  cartId?: string;
  items?: { cardId: string; variant: VariantKey; quantity: number }[];
};

const CART_ID_RE = /^[a-z0-9-]{8,64}$/i;

export async function POST(request: Request) {
  let body: SyncBody;
  try {
    body = (await request.json()) as SyncBody;
  } catch {
    return NextResponse.json({ error: "Requête invalide." }, { status: 400 });
  }

  const cartId = (body.cartId ?? "").trim();
  if (!CART_ID_RE.test(cartId)) {
    return NextResponse.json({ error: "cartId invalide." }, { status: 400 });
  }

  // Cleanup paresseux : 1 chance sur 10 d'aussi libérer les vieilles réservations
  if (Math.random() < 0.1) {
    void cleanupExpiredCartReservations(30).catch(() => {});
  }

  const rawItems = Array.isArray(body.items) ? body.items : [];

  // Filter and validate items
  const cleanItems: {
    cardId: string;
    variant: VariantKey;
    quantity: number;
  }[] = [];
  for (const it of rawItems) {
    if (!it || typeof it.cardId !== "string") continue;
    if (typeof it.variant !== "string") continue;
    const qty = Number(it.quantity);
    if (!Number.isInteger(qty) || qty <= 0) continue;
    cleanItems.push({
      cardId: it.cardId,
      variant: it.variant as VariantKey,
      quantity: qty,
    });
  }

  if (cleanItems.length === 0) {
    try {
      await releaseCartReservation(cartId);
    } catch {
      // ignore
    }
    return NextResponse.json({ ok: true });
  }

  // Resolve cards + live stock to know initialStock
  const rawCards = cleanItems
    .map((i) => getCard(i.cardId))
    .filter((c): c is NonNullable<typeof c> => !!c);
  let liveCards = rawCards;
  try {
    liveCards = await applyStockOverrides(rawCards);
  } catch {
    // fallback : catalog
  }
  const cardMap = new Map(liveCards.map((c) => [c.id, c]));

  const reserveItems = cleanItems
    .map((it) => {
      const card = cardMap.get(it.cardId);
      if (!card) return null;
      const v = resolveVariant(card, it.variant);
      return {
        cardId: it.cardId,
        variant: it.variant,
        quantity: it.quantity,
        initialStock: v.stock,
      };
    })
    .filter((x): x is NonNullable<typeof x> => !!x);

  try {
    await syncCartReservation(cartId, reserveItems);
  } catch (e) {
    const message = e instanceof Error ? e.message : "Erreur réservation.";
    return NextResponse.json({ error: message }, { status: 409 });
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
  const cartId = (body.cartId ?? "").trim();
  if (!CART_ID_RE.test(cartId)) {
    return NextResponse.json({ error: "cartId invalide." }, { status: 400 });
  }
  try {
    await releaseCartReservation(cartId);
  } catch (e) {
    const message = e instanceof Error ? e.message : "Erreur réservation.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
