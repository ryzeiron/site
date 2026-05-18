import type { Metadata } from "next";
import Link from "next/link";
import CardTile from "@/components/CardTile";
import {
  CARDS,
  getCard,
  listVariants,
  type Card,
  type VariantKey,
} from "@/lib/catalog";
import { getDb } from "@/lib/db/client";
import { stockOverrides } from "@/lib/db/schema";
import { applyStockOverrides } from "@/lib/stock";
import { desc } from "drizzle-orm";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Nouveautes",
};

type RecentRow = {
  cardId: string;
  variant: VariantKey;
  stock: number;
  updatedAt: Date | string;
};

type RecentCard = {
  card: Card;
  variant: VariantKey;
  updatedAt: Date | string;
};

async function getRecentStockRows(): Promise<RecentRow[]> {
  try {
    const rows = await getDb()
      .select({
        cardId: stockOverrides.cardId,
        variant: stockOverrides.variant,
        stock: stockOverrides.stock,
        updatedAt: stockOverrides.updatedAt,
      })
      .from(stockOverrides)
      .orderBy(desc(stockOverrides.updatedAt))
      .limit(180);

    return rows.filter((row) => row.stock > 0);
  } catch {
    return [];
  }
}

function uniqByCard(cards: Card[]) {
  const seen = new Set<string>();
  return cards.filter((card) => {
    if (seen.has(card.id)) return false;
    seen.add(card.id);
    return true;
  });
}

async function getFallbackCards(): Promise<RecentCard[]> {
  const liveCards = await applyStockOverrides(CARDS);

  return liveCards
    .flatMap((card) =>
      listVariants(card)
        .filter(({ variant }) => variant.stock > 0)
        .map(({ key }) => ({
          card,
          variant: key,
          updatedAt: new Date(0),
        })),
    )
    .slice(0, 48);
}

async function getRecentCards(): Promise<RecentCard[]> {
  const rows = await getRecentStockRows();

  if (rows.length === 0) {
    return getFallbackCards();
  }

  const baseCards = uniqByCard(
    rows.map((row) => getCard(row.cardId)).filter((card): card is Card => !!card),
  );
  const liveCards = await applyStockOverrides(baseCards);
  const liveById = new Map(liveCards.map((card) => [card.id, card]));
  const seen = new Set<string>();
  const entries: RecentCard[] = [];

  for (const row of rows) {
    const card = liveById.get(row.cardId);
    if (!card) continue;

    const liveVariant = listVariants(card).find(({ key }) => key === row.variant);
    if (!liveVariant || liveVariant.variant.stock <= 0) continue;

    const entryKey = `${row.cardId}:${row.variant}`;
    if (seen.has(entryKey)) continue;
    seen.add(entryKey);

    entries.push({
      card,
      variant: row.variant,
      updatedAt: row.updatedAt,
    });

    if (entries.length >= 48) break;
  }

  return entries;
}

function formatDate(value: Date | string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime()) || date.getTime() === 0) return null;

  return date.toLocaleDateString("fr-FR", {
    day: "2-digit",
    month: "short",
  });
}

export default async function NouveautesPage() {
  const entries = await getRecentCards();

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-white">Nouveautes</h1>
          <p className="mt-2 max-w-2xl text-sm text-gray-400">
            Les dernieres cartes et variantes ajoutees au stock.
          </p>
        </div>

        <Link
          href="/blocs"
          className="rounded-full bg-white/10 px-4 py-2 text-sm font-medium text-white transition hover:bg-white/20"
        >
          Voir les blocs
        </Link>
      </div>

      {entries.length === 0 ? (
        <div className="rounded-lg border border-white/10 bg-zinc-900/70 p-6 text-gray-300">
          Aucune nouveaute en stock pour le moment.
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {entries.map(({ card, variant, updatedAt }) => {
            const date = formatDate(updatedAt);

            return (
              <div key={`${card.id}-${variant}`} className="relative">
                <div className="absolute left-2 top-2 z-10 rounded-full bg-emerald-500 px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-white shadow">
                  {date ? `Nouveau ${date}` : "Nouveau"}
                </div>
                <CardTile card={card} variantKey={variant} />
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
