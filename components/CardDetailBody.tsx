"use client";

import { useState } from "react";
import { useCart } from "@/lib/cart";
import type { Card } from "@/lib/catalog";
import { formatPrice } from "@/lib/format";

export default function CardDetailBody({ card }: { card: Card }) {
  const [added, setAdded] = useState(false);
  const add = useCart((s) => s.add);
  const outOfStock = card.stock <= 0;

  return (
    <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-8">
      <div className="aspect-[3/4] bg-gradient-to-br from-zinc-800 to-zinc-950 border border-white/10 rounded-xl flex items-center justify-center text-gray-300 text-2xl font-bold overflow-hidden">
        {card.image ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={card.image}
            alt={card.name}
            className="w-full h-full object-contain"
          />
        ) : (
          <span className="px-4 text-center">{card.name}</span>
        )}
      </div>

      <div>
        <div className="text-sm text-gray-400">{card.number}</div>
        <h1 className="text-3xl font-bold mt-1 text-white">{card.name}</h1>
        <div className="mt-2 flex flex-wrap gap-2 text-xs">
          <span className="rounded-full bg-amber-500/20 text-amber-300 px-2 py-1">
            {card.rarity}
          </span>
          <span className="rounded-full bg-emerald-500/20 text-emerald-300 px-2 py-1">
            Etat : {card.condition}
          </span>
          <span className="rounded-full bg-sky-500/20 text-sky-300 px-2 py-1">
            {card.language}
          </span>
        </div>

        <div className="mt-6 text-3xl font-extrabold text-brand-500">
          {formatPrice(card.priceCents)}
        </div>
        <div className="text-sm text-gray-400 mt-1">
          {outOfStock
            ? "Rupture"
            : `${card.stock} exemplaire${card.stock > 1 ? "s" : ""} en stock`}
        </div>

        {card.description && (
          <p className="mt-4 text-gray-300">{card.description}</p>
        )}

        <div className="mt-6 max-w-xs">
          {outOfStock ? (
            <button
              disabled
              className="w-full rounded bg-gray-200 text-gray-500 py-2 text-sm font-medium cursor-not-allowed"
            >
              Rupture de stock
            </button>
          ) : (
            <button
              type="button"
              onClick={() => {
                add(card.id, 1);
                setAdded(true);
                setTimeout(() => setAdded(false), 1200);
              }}
              className="w-full rounded bg-brand-500 hover:bg-brand-600 text-white py-2 text-sm font-medium transition"
            >
              {added ? "Ajoute au panier" : "Ajouter au panier"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
