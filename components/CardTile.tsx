import Link from "next/link";
import type { Card } from "@/lib/catalog";
import { formatPrice } from "@/lib/format";

export default function CardTile({ card }: { card: Card }) {
  return (
    <Link
      href={`/carte/${card.id}`}
      className="card-hover block rounded-lg border border-white/10 bg-zinc-900/70 backdrop-blur-sm overflow-hidden text-gray-200"
    >
      <div className="aspect-[3/4] bg-gradient-to-br from-zinc-800 to-zinc-950 flex items-center justify-center text-gray-300 font-semibold overflow-hidden">
        {card.image ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={card.image}
            alt={card.name}
            className="w-full h-full object-contain"
          />
        ) : (
          <span className="px-2 text-center">{card.name}</span>
        )}
      </div>
      <div className="p-3">
        <div className="text-xs text-gray-500">
          {card.number} - {card.rareHolo ? "Rare / Rare Holo" : card.rarity}
        </div>
        <div className="font-semibold truncate text-white">{card.name}</div>
        <div className="flex items-center justify-between mt-2">
          <span className="font-bold text-brand-500">{formatPrice(card.priceCents)}</span>
          <span className="text-xs text-gray-500">{card.condition}</span>
        </div>
      </div>
    </Link>
  );
}
