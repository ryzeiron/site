"use client";

import { useState } from "react";
import CardImage from "@/components/CardImage";
import ConditionBadge from "@/components/ConditionBadge";
import FavoriteCardButton from "@/components/FavoriteCardButton";
import { useCart } from "@/lib/cart";
import { resolveVariant, type Card, type VariantKey } from "@/lib/catalog";
import { orderDisplayVariants } from "@/lib/display-variants";
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
        <div className="flex flex-wrap items-center gap-2">
          <span className="rounded-full bg-amber-500/20 px-2 py-1 text-xs text-amber-300">
            {v.rarity}
          </span>
          <ConditionBadge condition={v.condition ?? card.condition} />
        </div>
        <span className="text-xl font-extrabold text-brand-500">
          {formatPrice(v.price)}
        </span>
      </div>

      <div className="mt-2 text-xs text-gray-400">
        {outOfStock
          ? "Rupture"
          : `${v.stock} exemplaire${v.stock > 1 ? "s" : ""} en stock`}
      </div>

      <button
        type="button"
        disabled={outOfStock}
        onClick={() => {
          if (outOfStock) return;
          add(card.id, variant, 1, v.stock);
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
        {outOfStock ? "Rupture de stock" : added ? "Ajouté" : "Ajouter au panier"}
      </button>

      <FavoriteCardButton
        cardId={card.id}
        variant={variant}
        outOfStock={outOfStock}
      />
    </div>
  );
}

export default function CardDetailBody({ card }: { card: Card }) {
  const variants = orderDisplayVariants(card);
  const allOutOfStock =
    variants.length === 0 || variants.every((v) => v.variant.stock <= 0);
  const gridCols =
    variants.length === 1
      ? ""
      : variants.length === 2
        ? "sm:grid-cols-2"
        : "sm:grid-cols-2 lg:grid-cols-3";

  const images = [card.image, card.imageBack].filter(
    (s): s is string => !!s,
  );
  const [imageIndex, setImageIndex] = useState(0);
  const hasMultipleImages = images.length > 1;
  const currentImage = images[imageIndex] ?? card.image;

  return (
    <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-8">
      <div className="relative aspect-[3/4] bg-gradient-to-br from-zinc-800 to-zinc-950 border border-white/10 rounded-xl flex items-center justify-center text-gray-300 text-2xl font-bold overflow-hidden">
        {currentImage ? (
          <CardImage
            src={currentImage}
            alt={`${card.name}${imageIndex === 1 ? " (dos)" : ""}`}
            className={`w-full h-full object-contain ${
              allOutOfStock ? "opacity-40 grayscale" : ""
            }`}
            fallbackText={card.name}
            fallbackClassName="px-4 text-center"
          />
        ) : (
          <span className="px-4 text-center">{card.name}</span>
        )}

        {allOutOfStock && (
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
          <span className="rounded-full bg-sky-500/20 text-sky-300 px-2 py-1">
            {card.language}
          </span>
        </div>

        {card.description && (
          <p className="mt-4 text-gray-300">{card.description}</p>
        )}

        {variants.length === 0 ? (
          <p className="mt-6 rounded-lg border border-white/10 bg-zinc-900/60 p-4 text-sm text-gray-300">
            Aucune variante disponible pour le moment.
          </p>
        ) : (
          <div className={`mt-6 grid gap-4 ${gridCols}`}>
            {variants.map(({ key }) => (
              <VariantBlock key={key} card={card} variant={key} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
