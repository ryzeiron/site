import Link from "next/link";
import CardImage from "@/components/CardImage";
import ConditionBadge from "@/components/ConditionBadge";
import FavoriteHeartButton from "@/components/FavoriteHeartButton";
import QuickAddCardButton from "@/components/QuickAddCardButton";
import { resolveVariant, type Card, type VariantKey } from "@/lib/catalog";
import {
  formatRarityLabel,
  getPreferredDisplayVariant,
  orderDisplayVariants,
} from "@/lib/display-variants";
import { formatPrice } from "@/lib/format";

export default function CardTile({
  card,
  variantKey,
}: {
  card: Card;
  variantKey?: VariantKey;
}) {
  const preferredDisplay = variantKey
    ? { key: variantKey, variant: resolveVariant(card, variantKey) }
    : getPreferredDisplayVariant(card);
  const displayVariant = preferredDisplay.variant;
  const visibleVariants = orderDisplayVariants(card);
  const outOfStock = variantKey
    ? displayVariant.stock <= 0
    : visibleVariants.length === 0 ||
      visibleVariants.every(({ variant }) => variant.stock <= 0);
  const stockVariants = variantKey
    ? [preferredDisplay]
    : visibleVariants.length > 0
      ? visibleVariants
      : [preferredDisplay];
  const stockByRarity = stockVariants.reduce<
    { rarity: string; stock: number }[]
  >((items, { variant }) => {
    const rarityLabel = formatRarityLabel(variant.rarity);
    const hasSameRarityWithOtherCondition =
      stockVariants.some(
        (item) =>
          item.variant.rarity === variant.rarity &&
          (item.variant.condition ?? card.condition) !==
            (variant.condition ?? card.condition),
      );
    const label = hasSameRarityWithOtherCondition
      ? `${rarityLabel} - ${variant.condition ?? card.condition}`
      : rarityLabel;
    const existing = items.find((item) => item.rarity === label);
    if (existing) {
      existing.stock += variant.stock;
    } else {
      items.push({ rarity: label, stock: variant.stock });
    }
    return items;
  }, []);
  const price = displayVariant.price;

  return (
    <div className="card-hover relative overflow-hidden rounded-lg border border-white/10 bg-zinc-900/70 text-gray-200 backdrop-blur-sm md:rounded-xl">
      <FavoriteHeartButton
        cardId={card.id}
        variant={preferredDisplay.key}
        outOfStock={displayVariant.stock <= 0}
      />

      <Link href={`/carte/${card.id}`} className="block">
        <div className="relative aspect-[3/4] bg-gradient-to-br from-zinc-800 to-zinc-950 flex items-center justify-center text-gray-300 font-semibold overflow-hidden">
          {card.image ? (
            <CardImage
              src={card.image}
              alt={card.name}
              className={`w-full h-full object-contain ${
                outOfStock ? "opacity-40 grayscale" : ""
              }`}
              fallbackText={card.name}
              fallbackClassName="px-2 text-center"
            />
          ) : (
            <span className="px-2 text-center">{card.name}</span>
          )}

          {outOfStock && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <span className="rounded-full bg-red-600 text-white text-xs font-bold uppercase tracking-wider px-4 py-1.5 shadow-lg -rotate-12 border-2 border-white/90">
                Rupture
              </span>
            </div>
          )}
        </div>

        <div className="p-2.5 md:p-3">
          <div className="text-xs text-gray-500 truncate">{card.number}</div>

          <div className="mt-1 flex flex-wrap items-center gap-1 md:gap-1.5">
            {stockByRarity.map((item) => (
              <span
                key={item.rarity}
                className={`inline-flex max-w-full items-center truncate rounded-full px-1.5 py-0.5 text-[10px] font-medium md:px-2 md:py-1 md:text-[11px] ${
                  item.stock > 0
                    ? "bg-emerald-500/15 text-emerald-300"
                    : "bg-red-500/15 text-red-300"
                }`}
              >
                {item.rarity} : {item.stock}
              </span>
            ))}
            <ConditionBadge condition={displayVariant.condition ?? card.condition} />
          </div>

          <div className="mt-1.5 truncate text-sm font-semibold text-white md:mt-2 md:text-base">
            {card.name}
          </div>

          <div className="mt-1.5 flex items-center justify-between md:mt-2">
            <span className="text-sm font-bold text-brand-500 md:text-base">
              {formatPrice(price)}
            </span>
          </div>
        </div>
      </Link>

      <QuickAddCardButton card={card} variantKey={variantKey} />
    </div>
  );
}
