import "server-only";

import type Stripe from "stripe";
import {
  BLOCS,
  SERIES,
  getBloc,
  getCard,
  getSerie,
  resolveVariant,
  type Card,
  type VariantKey,
} from "@/lib/catalog";
import { formatRarityLabel } from "@/lib/display-variants";
import { getSleevesByIds, type SleeveProduct } from "@/lib/sleeves";
import { applyStockOverrides } from "@/lib/stock";
import { getStripe } from "@/lib/stripe";

type CompactItem = [string, VariantKey, number];
type CompactSleeveItem = [string, number];

export type OrderContentSource = {
  id: string;
  stripeSessionId: string | null;
};

export type CardOrderLine = {
  type: "card";
  key: string;
  cardId: string;
  variant: VariantKey;
  quantity: number;
  card?: Card;
  name: string;
  number: string;
  image?: string;
  blocName: string;
  blocOrder: number;
  serieName: string;
  serieCode: string;
  serieOrder: number;
  rarity: string;
  condition: string;
};

export type SleeveOrderLine = {
  type: "sleeve";
  key: string;
  sleeveId: string;
  quantity: number;
  name: string;
  image?: string | null;
};

export type OrderContent = {
  cardGroups: {
    key: string;
    blocName: string;
    serieName: string;
    serieCode: string;
    lines: CardOrderLine[];
  }[];
  sleeveLines: SleeveOrderLine[];
  totalQuantity: number;
  error?: string;
};

type StripeOrderMetadata = {
  metadata: Stripe.Metadata | null;
  error?: string;
};

function decodeCompactItems(
  metadata: Stripe.Metadata | null,
  key: "items" | "sleeves",
) {
  if (!metadata) return [];

  const partsCount = Number(metadata[`${key}_parts`] ?? "0");
  let json = "";

  if (metadata[key]) {
    json = metadata[key] ?? "";
  } else if (partsCount > 0) {
    for (let i = 0; i < partsCount; i++) {
      const chunk = metadata[`${key}_${i}`];
      if (!chunk) return [];
      json += chunk;
    }
  }

  if (!json) return [];

  try {
    const parsed = JSON.parse(json) as unknown;
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function decodeCardItems(metadata: Stripe.Metadata | null): CompactItem[] {
  return decodeCompactItems(metadata, "items").filter(
    (item): item is CompactItem =>
      Array.isArray(item) &&
      typeof item[0] === "string" &&
      typeof item[1] === "string" &&
      typeof item[2] === "number",
  );
}

function decodeSleeveItems(metadata: Stripe.Metadata | null): CompactSleeveItem[] {
  return decodeCompactItems(metadata, "sleeves").filter(
    (item): item is CompactSleeveItem =>
      Array.isArray(item) &&
      typeof item[0] === "string" &&
      typeof item[1] === "number",
  );
}

function cardNumberSortValue(number: string) {
  const firstNumber = Number.parseInt(number.match(/\d+/)?.[0] ?? "0", 10);
  return Number.isFinite(firstNumber) ? firstNumber : 0;
}

function mergeCardItems(items: CompactItem[]) {
  const merged = new Map<string, CompactItem>();

  for (const [cardId, variant, quantity] of items) {
    if (!cardId || !variant || !Number.isFinite(quantity) || quantity <= 0) {
      continue;
    }

    const key = `${cardId}:${variant}`;
    const existing = merged.get(key);
    if (existing) {
      existing[2] += quantity;
    } else {
      merged.set(key, [cardId, variant, quantity]);
    }
  }

  return Array.from(merged.values());
}

function mergeSleeveItems(items: CompactSleeveItem[]) {
  const merged = new Map<string, CompactSleeveItem>();

  for (const [sleeveId, quantity] of items) {
    if (!sleeveId || !Number.isFinite(quantity) || quantity <= 0) continue;

    const existing = merged.get(sleeveId);
    if (existing) {
      existing[1] += quantity;
    } else {
      merged.set(sleeveId, [sleeveId, quantity]);
    }
  }

  return Array.from(merged.values());
}

async function getOrderMetadata(rows: OrderContentSource[]) {
  let stripe: Stripe;
  try {
    stripe = getStripe();
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Impossible de charger Stripe pour lire le contenu.";
    return new Map<string, StripeOrderMetadata>(
      rows.map((order) => [order.id, { metadata: null, error: message }]),
    );
  }

  const entries: Array<readonly [string, StripeOrderMetadata]> = await Promise.all(
    rows.map(async (order) => {
      try {
        const session = await stripe.checkout.sessions.retrieve(
          order.stripeSessionId || order.id,
        );
        return [order.id, { metadata: session.metadata ?? null }] as const;
      } catch (error) {
        const message =
          error instanceof Error
            ? error.message
            : "Impossible de lire la session Stripe.";
        return [order.id, { metadata: null, error: message }] as const;
      }
    }),
  );

  return new Map(entries);
}

export async function buildOrderContents(rows: OrderContentSource[]) {
  const metadataByOrder = await getOrderMetadata(rows);
  const decoded = rows.map((order) => {
    const stripeData = metadataByOrder.get(order.id);
    return {
      orderId: order.id,
      error: stripeData?.error,
      cardItems: mergeCardItems(decodeCardItems(stripeData?.metadata ?? null)),
      sleeveItems: mergeSleeveItems(
        decodeSleeveItems(stripeData?.metadata ?? null),
      ),
    };
  });
  const cardIds = Array.from(
    new Set(decoded.flatMap((entry) => entry.cardItems.map(([cardId]) => cardId))),
  );
  const rawCards = cardIds
    .map((cardId) => getCard(cardId))
    .filter((card): card is Card => Boolean(card));
  const liveCards = await applyStockOverrides(rawCards).catch(() => rawCards);
  const cardMap = new Map(liveCards.map((card) => [card.id, card]));

  const sleeveIds = Array.from(
    new Set(decoded.flatMap((entry) => entry.sleeveItems.map(([id]) => id))),
  );
  const sleeves = await getSleevesByIds(sleeveIds).catch(() => []);
  const sleeveMap = new Map(sleeves.map((sleeve) => [sleeve.id, sleeve]));

  return new Map(
    decoded.map((entry) => [
      entry.orderId,
      buildOrderContent(
        entry.cardItems,
        entry.sleeveItems,
        sleeveMap,
        cardMap,
        entry.error,
      ),
    ]),
  );
}

function buildOrderContent(
  cardItems: CompactItem[],
  sleeveItems: CompactSleeveItem[],
  sleeveMap: Map<string, SleeveProduct>,
  cardMap: Map<string, Card>,
  error?: string,
): OrderContent {
  const cardLines: CardOrderLine[] = cardItems.map(([cardId, variant, quantity]) => {
    const card = cardMap.get(cardId) ?? getCard(cardId);
    const serie = card ? getSerie(card.serieId) : undefined;
    const bloc = serie ? getBloc(serie.blocId) : undefined;
    const resolved = card ? resolveVariant(card, variant) : undefined;

    return {
      type: "card",
      key: `${cardId}:${variant}`,
      cardId,
      variant,
      quantity,
      card,
      name: card?.name ?? cardId,
      number: card?.number ?? "-",
      image: card?.image,
      blocName: bloc?.name ?? "Bloc inconnu",
      blocOrder: bloc ? BLOCS.findIndex((item) => item.id === bloc.id) : 9999,
      serieName: serie?.name ?? "Serie inconnue",
      serieCode: serie?.code ?? "-",
      serieOrder: serie ? SERIES.findIndex((item) => item.id === serie.id) : 9999,
      rarity: resolved?.rarity ? formatRarityLabel(resolved.rarity) : "-",
      condition: resolved?.condition ?? card?.condition ?? "-",
    };
  });

  cardLines.sort((a, b) => {
    if (a.blocOrder !== b.blocOrder) return a.blocOrder - b.blocOrder;
    if (a.serieOrder !== b.serieOrder) return a.serieOrder - b.serieOrder;
    return cardNumberSortValue(a.number) - cardNumberSortValue(b.number);
  });

  const groupMap = new Map<string, OrderContent["cardGroups"][number]>();

  for (const line of cardLines) {
    const groupKey = `${line.blocName}:${line.serieName}`;
    const group = groupMap.get(groupKey);
    if (group) {
      group.lines.push(line);
    } else {
      groupMap.set(groupKey, {
        key: groupKey,
        blocName: line.blocName,
        serieName: line.serieName,
        serieCode: line.serieCode,
        lines: [line],
      });
    }
  }

  const sleeveLines: SleeveOrderLine[] = sleeveItems.map(([sleeveId, quantity]) => {
    const sleeve = sleeveMap.get(sleeveId);
    return {
      type: "sleeve",
      key: sleeveId,
      sleeveId,
      quantity,
      name: sleeve?.name ?? sleeveId,
      image: sleeve?.image,
    };
  });

  return {
    cardGroups: Array.from(groupMap.values()),
    sleeveLines,
    totalQuantity:
      cardLines.reduce((total, line) => total + line.quantity, 0) +
      sleeveLines.reduce((total, line) => total + line.quantity, 0),
    error,
  };
}
