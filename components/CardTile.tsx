import Link from "next/link";
import CardImage from "@/components/CardImage";
import ConditionBadge from "@/components/ConditionBadge";
import FavoriteHeartButton from "@/components/FavoriteHeartButton";
import StockBadge from "@/components/StockBadge";
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
    const label = formatRarityLabel(variant.rarity);
    const existing = items.find((item) => item.rarity === label);
    if (existing) {
      existing.stock += variant.stock;
    } else {
      items.push({ rarity: label, stock: variant.stock });
    }
    return items;
  }, []);
  const price = displayVariant.price;
  const totalStock = stockVariants.reduce(
    (total, { variant }) => total + Math.max(0, variant.stock),
    0,
  );

  return (
    <div className="card-hover relative overflow-hidden rounded-xl border border-white/10 bg-zinc-900/70 text-gray-200 backdrop-blur-sm">
      <FavoriteHeartButton
        cardId={card.id}
        variant={preferredDisplay.key}
        outOfStock={displayVariant.stock <= 0}
      />

      <Link href={`/carte/${card.id}`} className="block">
        <div className="relative aspect-[3/4] bg-gradient-to-br from-zinc-800 to-zinc-950 flex items-center justify-center text-gray-300 font-semibold overflow-hidden">
          <div className="absolute left-2 top-2 z-10">
            <StockBadge
              stock={totalStock}
              compact
              label={outOfStock ? "Rupture" : `${totalStock} dispo`}
            />
          </div>

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

        <div className="p-3">
          <div className="text-xs text-gray-500 truncate">{card.number}</div>

          <div className="mt-1 flex flex-wrap items-center gap-1.5">
            {stockByRarity.map((item) => (
              <span
                key={item.rarity}
                className={`inline-flex items-center rounded-full px-2 py-1 text-[11px] font-medium ${
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

          <div className="mt-2 truncate font-semibold text-white">{card.name}</div>

          <div className="mt-2 flex items-center justify-between">
            <span className="font-bold text-brand-500">
              {formatPrice(price)}
            </span>
          </div>
        </div>
      </Link>
    </div>
  );
}
