import {
  listVariants,
  type Card,
  type Rarity,
  type VariantKey,
} from "@/lib/catalog";

type ListedVariant = ReturnType<typeof listVariants>[number];

const PROTECTED_DISPLAY_RARITIES = new Set(["Ultra Rare", "Ultra rare", "Secrete"]);
const PREFERRED_DISPLAY_RARITY: Rarity = "Commune";

function shouldKeepMainRarityFirst(card: Card) {
  return PROTECTED_DISPLAY_RARITIES.has(card.rarity);
}

export function getPreferredDisplayVariant(card: Card): ListedVariant {
  const variants = listVariants(card);

  if (!shouldKeepMainRarityFirst(card)) {
    const preferred = variants.find(
      ({ variant }) => variant.rarity === PREFERRED_DISPLAY_RARITY,
    );
    if (preferred) return preferred;
  }

  return variants[0];
}

export function orderDisplayVariants(card: Card): ListedVariant[] {
  const variants = listVariants(card);

  if (shouldKeepMainRarityFirst(card)) return variants;

  const preferredIndex = variants.findIndex(
    ({ variant }) => variant.rarity === PREFERRED_DISPLAY_RARITY,
  );

  if (preferredIndex <= 0) return variants;

  const preferred = variants[preferredIndex];
  return [
    preferred,
    ...variants.slice(0, preferredIndex),
    ...variants.slice(preferredIndex + 1),
  ];
}

export function rarityDisplayLabel(
  card: Card,
  selectedVariant?: VariantKey,
): string {
  if (selectedVariant) {
    return (
      listVariants(card).find(({ key }) => key === selectedVariant)?.variant
        .rarity ?? card.rarity
    );
  }

  const seen = new Set<Rarity>();
  const labels: Rarity[] = [];

  for (const { variant } of orderDisplayVariants(card)) {
    if (seen.has(variant.rarity)) continue;
    seen.add(variant.rarity);
    labels.push(variant.rarity);
  }

  return labels.join(" / ");
}
