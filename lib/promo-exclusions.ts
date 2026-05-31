export const PROMO_EXCLUDED_CARD_IDS = new Set([
  "primo-choc-156",
]);

export function isPromoExcludedCard(cardId: string): boolean {
  return PROMO_EXCLUDED_CARD_IDS.has(cardId);
}
