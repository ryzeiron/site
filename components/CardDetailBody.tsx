"use client";

import { useState } from "react";
import { useCart } from "@/lib/cart";
import { resolveVariant, type Card, type Variant } from "@/lib/catalog";
import { formatPrice } from "@/lib/format";

function VariantBlock({
  card,
  variant,
  onAdd,
}: {
  card: Card;
  variant: Variant;
  onAdd: (variant: Variant) => void;
}) {
  const [added, setAdded] = useState(false);
  const resolved = resolveVariant(card, variant);
  const outOfStock = resolved.stock <= 0;

  return (
    <div className="rounded-xl border border-white/10 bg-zinc-900/60 backdrop-blur-sm p-4 flex flex-col">
      <div className="text-sm uppercase tracking-wide text-violet-300">
        {resolved.rarityLabel}
      </div>
      <div className="mt-1 text-2xl font-extrabold text-brand-500">
        {formatPrice(resolved.priceCents)}
      </div>
      <div className="mt-1 text-xs text-gray-400">
        {outOfStock
          ? "Rupture"
          : `${resolved.stock} exemplaire${resolved.stock > 1 ? "s" : ""} en stock`}
      </div>
      <button
        type="button"
        disabled={outOfStock}
        onClick={() => {
          onAdd(variant);
          setAdded(true);
          setTimeout(() => setAdded(false), 1200);
        }}
        className={`mt-4 w-full rounded py-2 text-sm font-medium transition ${
          outOfStock
            ? "bg-gray-200 text-gray-500 cursor-not-allowed"
            : "bg-brand-500 hover:bg-brand-600 text-white"
        }`}
      >
        {outOfStock ? "Rupture" : added ? "Ajoute au panier" : "Ajouter au panier"}
      </button>
    </div>
  );
}

export default function CardDetailBody({ card }: { card: Card }) {
  const add = useCart((s) => s.add);
  const hasHolo = !!card.rareHolo;
  const handleAdd = (variant: Variant) => add(card.id, variant, 1);

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
          <span className="rounded-full bg-emerald-500/20 text-emerald-300 px-2 py-1">
            Etat : {card.condition}
          </span>
          <span className="rounded-full bg-sky-500/20 text-sky-300 px-2 py-1">
            {card.language}
          </span>
        </div>

        {card.description && (
          <p className="mt-4 text-gray-300">{card.description}</p>
        )}

        <div className="mt-6">
          {hasHolo ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <VariantBlock card={card} variant="base" onAdd={handleAdd} />
              <VariantBlock card={card} variant="holo" onAdd={handleAdd} />
            </div>
          ) : (
            <div className="max-w-xs">
              <VariantBlock card={card} variant="base" onAdd={handleAdd} />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
