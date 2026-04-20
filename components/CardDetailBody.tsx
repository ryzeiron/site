"use client";

import { useState } from "react";
import { useCart } from "@/lib/cart";
import { resolveVariant, type Card, type Variant } from "@/lib/catalog";
import { formatPrice } from "@/lib/format";

export default function CardDetailBody({ card }: { card: Card }) {
  const [variant, setVariant] = useState<Variant>("base");
  const [added, setAdded] = useState(false);
  const add = useCart((s) => s.add);

  const resolved = resolveVariant(card, variant);
  const hasHolo = !!card.rareHolo;

  return (
    <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-8">
      <div className="aspect-[3/4] bg-gradient-to-br from-zinc-800 to-zinc-950 border border-white/10 rounded-xl flex items-center justify-center text-gray-300 text-2xl font-bold overflow-hidden">
        {resolved.image ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={resolved.image}
            alt={card.name}
            className="w-full h-full object-contain"
          />
        ) : (
          <span className="px-4 text-center">{card.name}</span>
        )}
      </div>

      <div>
        <div className="text-sm text-gray-400">
          {card.number}
        </div>
        <h1 className="text-3xl font-bold mt-1 text-white">{card.name}</h1>
        <div className="mt-2 flex flex-wrap gap-2 text-xs">
          <span className="rounded-full bg-amber-500/20 text-amber-300 px-2 py-1">
            {resolved.rarityLabel}
          </span>
          <span className="rounded-full bg-emerald-500/20 text-emerald-300 px-2 py-1">
            Etat : {card.condition}
          </span>
          <span className="rounded-full bg-sky-500/20 text-sky-300 px-2 py-1">
            {card.language}
          </span>
        </div>

        {hasHolo && (
          <div className="mt-5">
            <div className="text-xs uppercase text-gray-400 mb-2">Version</div>
            <div className="inline-flex rounded-full bg-white/5 border border-white/10 p-1">
              <button
                type="button"
                onClick={() => setVariant("base")}
                className={`px-4 py-1.5 rounded-full text-sm transition ${
                  variant === "base"
                    ? "bg-violet-600 text-white"
                    : "text-gray-300 hover:text-white"
                }`}
              >
                Rare
              </button>
              <button
                type="button"
                onClick={() => setVariant("holo")}
                className={`px-4 py-1.5 rounded-full text-sm transition ${
                  variant === "holo"
                    ? "bg-violet-600 text-white"
                    : "text-gray-300 hover:text-white"
                }`}
              >
                Rare Holo
              </button>
            </div>
          </div>
        )}

        <div className="mt-6 text-3xl font-extrabold text-brand-500">
          {formatPrice(resolved.priceCents)}
        </div>
        <div className="text-sm text-gray-400 mt-1">
          {resolved.stock > 0
            ? `${resolved.stock} exemplaire${resolved.stock > 1 ? "s" : ""} en stock`
            : "Rupture"}
        </div>

        {card.description && (
          <p className="mt-4 text-gray-300">{card.description}</p>
        )}

        <div className="mt-6 max-w-xs">
          {resolved.stock <= 0 ? (
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
                add(card.id, variant, 1);
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
