import "server-only";

import { eq } from "drizzle-orm";
import { revalidateTag, unstable_cache } from "next/cache";
import { CARDS, cardsForSerie, getCard, isRarity, type Card } from "@/lib/catalog";
import { getDb } from "@/lib/db/client";
import { customCards } from "@/lib/db/schema";

// Les cartes creees depuis l'admin vivent en base. Le catalogue statique reste
// la source des cartes existantes : ces fonctions fusionnent les deux, pour que
// le reste du site n'ait pas a connaitre cette distinction.

export const CUSTOM_CARDS_CACHE_TAG = "custom-cards";
const CUSTOM_CARDS_CACHE_SECONDS = 300;

type CustomCardRow = typeof customCards.$inferSelect;

function toCard(row: CustomCardRow): Card {
  return {
    id: row.cardId,
    serieId: row.serieId,
    name: row.name,
    number: row.number,
    rarity: isRarity(row.rarity) ? row.rarity : "Commune",
    condition: "Near Mint",
    language: "FR",
    price: row.priceCents / 100,
    stock: row.stock,
    ...(row.image ? { image: row.image } : {}),
  };
}

export function revalidateCustomCardsCache() {
  revalidateTag(CUSTOM_CARDS_CACHE_TAG);
}

async function loadRows(): Promise<CustomCardRow[]> {
  try {
    return await getDb().select().from(customCards);
  } catch {
    // Table absente ou base indisponible : le catalogue statique suffit a
    // faire tourner la boutique, mieux vaut degrader que planter.
    return [];
  }
}

const loadCachedRows = unstable_cache(loadRows, ["custom-cards-v1"], {
  revalidate: CUSTOM_CARDS_CACHE_SECONDS,
  tags: [CUSTOM_CARDS_CACHE_TAG],
});

export async function getCustomCards(options: { cache?: boolean } = {}) {
  const rows = options.cache ? await loadCachedRows() : await loadRows();
  return rows.map(toCard);
}

// Equivalents asynchrones des helpers du catalogue, cartes creees incluses.

export async function getAllCards(options: { cache?: boolean } = {}) {
  return [...CARDS, ...(await getCustomCards(options))];
}

export async function getCardsForSerie(
  serieId: string,
  options: { cache?: boolean } = {},
) {
  const custom = (await getCustomCards(options)).filter(
    (card) => card.serieId === serieId,
  );

  return [...cardsForSerie(serieId), ...custom];
}

export async function getCardById(
  id: string,
  options: { cache?: boolean } = {},
): Promise<Card | undefined> {
  const fromCatalog = getCard(id);
  if (fromCatalog) return fromCatalog;

  const [row] = await getDb()
    .select()
    .from(customCards)
    .where(eq(customCards.cardId, id))
    .limit(1)
    .catch(() => []);

  return row ? toCard(row) : undefined;
}

// Lecture groupee, pour les chemins qui resolvent plusieurs cartes d'un coup
// (panier, checkout, contenu de commande) sans multiplier les requetes.
export async function getCardsByIds(
  ids: string[],
  options: { cache?: boolean } = {},
): Promise<Map<string, Card>> {
  const result = new Map<string, Card>();
  const missing: string[] = [];

  for (const id of ids) {
    const card = getCard(id);
    if (card) result.set(id, card);
    else missing.push(id);
  }

  if (missing.length === 0) return result;

  for (const card of await getCustomCards(options)) {
    if (missing.includes(card.id)) result.set(card.id, card);
  }

  return result;
}
