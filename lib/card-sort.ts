import {
  getSerie,
  type Card,
  type CardVariant,
  type Serie,
} from "@/lib/catalog";
import { getPreferredDisplayVariant } from "@/lib/display-variants";

export type CardSortMode =
  | "number"
  | "name"
  | "newest"
  | "oldest"
  | "price-asc"
  | "price-desc"
  | "rarity";

export type SearchSortMode =
  | "relevance"
  | "newest"
  | "oldest"
  | "price-asc"
  | "price-desc"
  | "name";

const SEARCH_SORT_MODES = new Set<SearchSortMode>([
  "relevance",
  "newest",
  "oldest",
  "price-asc",
  "price-desc",
  "name",
]);

const RARITY_RANK = new Map(
  [
    "Promo",
    "Commune",
    "Reverse",
    "Reverse Pokéball",
    "Reverse Pokeball",
    "Reverse Masterball",
    "Holo",
    "Holo Cracked Ice",
    "Holo ligne",
    "Holo Cosmos",
    "Holo Etoile",
    "Promo Holo Cosmos",
    "Stamp",
    "Rare Reverse",
    "Rare Holo",
    "Ultra Rare",
    "Secrete",
  ].map((rarity, index) => [rarity, index]),
);

export function normalizeSearchSortMode(value?: string): SearchSortMode {
  return value && SEARCH_SORT_MODES.has(value as SearchSortMode)
    ? (value as SearchSortMode)
    : "relevance";
}

function compareCardNumber(a: Card, b: Card) {
  return a.number.localeCompare(b.number, "fr", { numeric: true });
}

function compareSeriesOrder(a?: Serie, b?: Serie) {
  const yearCompare = (a?.releaseYear ?? 0) - (b?.releaseYear ?? 0);
  if (yearCompare !== 0) return yearCompare;

  const codeCompare = (a?.code ?? "").localeCompare(b?.code ?? "", "fr", {
    numeric: true,
    sensitivity: "base",
  });
  if (codeCompare !== 0) return codeCompare;

  return (a?.id ?? "").localeCompare(b?.id ?? "", "fr", {
    numeric: true,
    sensitivity: "base",
  });
}

export function compareSeriesBySortMode(
  a: Serie,
  b: Serie,
  sortMode: SearchSortMode,
) {
  if (sortMode === "name") {
    return a.name.localeCompare(b.name, "fr", { sensitivity: "base" });
  }

  if (sortMode === "newest" || sortMode === "oldest") {
    const value = compareSeriesOrder(a, b);
    return sortMode === "oldest" ? value : -value;
  }

  return 0;
}

export function compareCardsBySortMode(
  a: Card,
  b: Card,
  sortMode: CardSortMode | SearchSortMode,
  getVariant?: (card: Card) => CardVariant | undefined,
) {
  const aVariant = getVariant?.(a) ?? getPreferredDisplayVariant(a).variant;
  const bVariant = getVariant?.(b) ?? getPreferredDisplayVariant(b).variant;

  if (sortMode === "name") {
    return (
      a.name.localeCompare(b.name, "fr", { sensitivity: "base" }) ||
      compareCardNumber(a, b)
    );
  }

  if (sortMode === "price-asc" || sortMode === "price-desc") {
    const priceCompare = (aVariant?.price ?? 0) - (bVariant?.price ?? 0);
    return sortMode === "price-asc"
      ? priceCompare || compareCardNumber(a, b)
      : -priceCompare || compareCardNumber(a, b);
  }

  if (sortMode === "rarity") {
    const aRank = RARITY_RANK.get(aVariant?.rarity ?? "Commune") ?? 999;
    const bRank = RARITY_RANK.get(bVariant?.rarity ?? "Commune") ?? 999;
    return aRank - bRank || compareCardNumber(a, b);
  }

  if (sortMode === "newest" || sortMode === "oldest") {
    const value =
      compareSeriesOrder(getSerie(a.serieId), getSerie(b.serieId)) ||
      compareCardNumber(a, b);

    return sortMode === "oldest" ? value : -value;
  }

  return compareCardNumber(a, b);
}
