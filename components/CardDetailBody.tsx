"use client";

import { useState } from "react";
import { useCart } from "@/lib/cart";
import { resolveVariant, type Card, type VariantKey } from "@/lib/catalog";
import { formatPrice } from "@/lib/format";

function VariantBlock({
  card,
  variant,
}: {
  card: Card;
  variant: VariantKey;
}) {
  const v = resolveVariant(card, variant);
  const outOfStock = v.stock <= 0;
  const [added, setAdded] = useState(false);
  const add = useCart((s) => s.add);

  return (
    <div className="rounded-lg border border-white/10 bg-zinc-900/60 p-4 text-gray-200">
      <div className="flex items-center justify-between gap-2">
        <span className="rounded-full bg-amber-500/20 text-amber-300 px-2 py-1 text-xs">
          {v.rarity}
        </span>
        <span className="text-xl font-extrabold text-brand-500">
          {formatPrice(v.price)}
        </span>
      </div>
      <div className="text-xs text-gray-400 mt-2">
        {outOfStock
          ? "Rupture"
          : `${v.stock} exemplaire${v.stock > 1 ? "s" : ""} en stock`}
      </div>
      <button
        type="button"
        disabled={outOfStock}
        onClick={() => {
          if (outOfStock) return;
          add(card.id, variant, 1);
          setAdded(true);
          setTimeout(() => setAdded(false), 1200);
        }}
        className={`mt-3 w-full rounded py-2 text-sm font-medium transition flex items-center justify-center gap-2 ${
          outOfStock
            ? "bg-gray-200 text-gray-500 cursor-not-allowed"
            : added
              ? "bg-emerald-500 text-white"
              : "bg-brand-500 hover:bg-brand-600 text-white"
        }`}
      >
        {outOfStock ? (
          "Rupture de stock"
        ) : added ? (
          <>
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="3"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="w-4 h-4"
            >
              <path d="M5 12l5 5L20 7" />
            </svg>
            Ajoute
          </>
        ) : (
          "Ajouter au panier"
        )}
      </button>
    </div>
  );
}

export default function CardDetailBody({ card }: { card: Card }) {
  const hasAlt = !!card.altVariant;
  const baseOutOfStock = card.stock <= 0;
  const imageOutOfStock =
    baseOutOfStock && (!card.altVariant || card.altVariant.stock <= 0);

  return (
    <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-8">
      <div className="relative aspect-[3/4] bg-gradient-to-br from-zinc-800 to-zinc-950 border border-white/10 rounded-xl flex items-center justify-center text-gray-300 text-2xl font-bold overflow-hidden">
        {card.image ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={card.image}
            alt={card.name}
            className={`w-full h-full object-contain ${imageOutOfStock ? "opacity-40 grayscale" : ""}`}
          />
        ) : (
          <span className="px-4 text-center">{card.name}</span>
        )}
        {imageOutOfStock && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <span className="rounded-full bg-red-600 text-white text-base font-bold uppercase tracking-wider px-6 py-2 shadow-lg -rotate-12 border-2 border-white/90">
              Rupture
            </span>
          </div>
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

        <div className={`mt-6 grid gap-4 ${hasAlt ? "sm:grid-cols-2" : ""}`}>
          <VariantBlock card={card} variant="base" />
          {hasAlt && <VariantBlock card={card} variant="alt" />}
        </div>
      </div>
    </div>
  );
}
