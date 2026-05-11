import Link from "next/link";
import FavoriteHeartButton from "@/components/FavoriteHeartButton";
import type { Card } from "@/lib/catalog";
import { formatPrice } from "@/lib/format";

export default function CardTile({ card }: { card: Card }) {
  const baseOut = card.stock <= 0;
  const altOut = !card.altVariant || card.altVariant.stock <= 0;
  const extrasOut =
    !card.extraVariants || card.extraVariants.every((v) => v.stock <= 0);
  const outOfStock = baseOut && altOut && extrasOut;

  return (
    <div className="card-hover relative rounded-lg border border-white/10 bg-zinc-900/70 text-gray-200 backdrop-blur-sm overflow-hidden">
      <FavoriteHeartButton cardId={card.id} outOfStock={outOfStock} />

      <Link href={`/carte/${card.id}`} className="block">
        <div className="relative aspect-[3/4] bg-gradient-to-br from-zinc-800 to-zinc-950 flex items-center justify-center text-gray-300 font-semibold overflow-hidden">
          {card.image ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={card.image}
              alt={card.name}
              className={`w-full h-full object-contain ${
                outOfStock ? "opacity-40 grayscale" : ""
              }`}
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
          <div className="text-xs text-gray-500 truncate">
            {card.number} - {card.rarity}
            {card.altVariant ? ` / ${card.altVariant.rarity}` : ""}
            {card.extraVariants
              ? card.extraVariants.map((v) => ` / ${v.rarity}`).join("")
              : ""}
          </div>

          <div className="font-semibold truncate text-white">{card.name}</div>

          <div className="flex items-center justify-between mt-2">
            <span className="font-bold text-brand-500">
              {formatPrice(card.price)}
            </span>
            <span className="text-xs text-gray-500">{card.condition}</span>
          </div>
        </div>
      </Link>
    </div>
  );
}
