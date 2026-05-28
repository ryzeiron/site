export const PROMO_EXCLUDED_CARD_IDS = new Set([
  "chaos-ascendant-122",
]);

export function isPromoExcludedCard(cardId: string): boolean {
  return PROMO_EXCLUDED_CARD_IDS.has(cardId);
}
