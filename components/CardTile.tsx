import Link from "next/link";
import type { Card } from "@/lib/catalog";
import { formatPrice } from "@/lib/format";

export default function CardTile({ card }: { card: Card }) {
  return (
    <Link
      href={`/carte/${card.id}`}
      className="card-hover block rounded-lg border border-amber-100 bg-white overflow-hidden"
    >
      <div className="aspect-[3/4] bg-gradient-to-br from-amber-100 to-orange-100 flex items-center justify-center text-amber-800 font-semibold">
        {card.name}
      </div>
      <div className="p-3">
        <div className="text-xs text-gray-500">n {card.number} - {card.rarity}</div>
        <div className="font-semibold truncate">{card.name}</div>
        <div className="flex items-center justify-between mt-2">
          <span className="font-bold text-brand-700">{formatPrice(card.priceCents)}</span>
          <span className="text-xs text-gray-500">{card.condition}</span>
        </div>
      </div>
    </Link>
  );
}
