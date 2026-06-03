import { CARDS, listVariants, type Card } from "@/lib/catalog";

export type SeoCardGroup =
  | "singles"
  | "french"
  | "cheap"
  | "ultraRare"
  | "secret";

function variantStock(card: Card) {
  return listVariants(card).reduce((total, { variant }) => total + variant.stock, 0);
}

function minPrice(card: Card) {
  const prices = listVariants(card).map(({ variant }) => variant.price);
  return prices.length > 0 ? Math.min(...prices) : card.price;
}

function hasRarity(card: Card, matcher: (rarity: string) => boolean) {
  return listVariants(card).some(({ variant }) => matcher(variant.rarity));
}

function cleanCards(cards: Card[]) {
  return cards
    .filter((card) => card.language === "FR")
    .sort((a, b) => {
      const stockDiff = variantStock(b) - variantStock(a);
      if (stockDiff !== 0) return stockDiff;

      const priceDiff = minPrice(a) - minPrice(b);
      if (priceDiff !== 0) return priceDiff;

      return a.name.localeCompare(b.name, "fr");
    });
}

export function getSeoCards(group: SeoCardGroup, limit = 16) {
  const cards = cleanCards(CARDS).filter((card) => {
    if (group === "cheap") return minPrice(card) <= 0.5;
    if (group === "ultraRare") {
      return hasRarity(card, (rarity) => rarity.toLowerCase().includes("ultra"));
    }
    if (group === "secret") {
      return hasRarity(card, (rarity) => rarity.toLowerCase().includes("secrete"));
    }
    return true;
  });

  return cards.slice(0, limit);
}
