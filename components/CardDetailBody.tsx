"use client";

import { useState } from "react";
import CardImage from "@/components/CardImage";
import ConditionBadge from "@/components/ConditionBadge";
import FavoriteCardButton from "@/components/FavoriteCardButton";
import StockBadge from "@/components/StockBadge";
import { useCart } from "@/lib/cart";
import { resolveVariant, type Card, type VariantKey } from "@/lib/catalog";
import { formatRarityLabel, orderDisplayVariants } from "@/lib/display-variants";
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
    <div
      className={`rounded-xl border p-4 text-gray-200 ${
        outOfStock
          ? "border-red-400/25 bg-red-950/10"
          : "border-white/10 bg-zinc-900/70"
      }`}
    >
      <div className="flex items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <span className="rounded-full bg-amber-500/20 px-2 py-1 text-xs text-amber-300">
            {formatRarityLabel(v.rarity)}
          </span>
          <ConditionBadge condition={v.condition ?? card.condition} />
        </div>
        <span className="text-xl font-extrabold text-brand-500">
          {formatPrice(v.price)}
        </span>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <StockBadge
          stock={v.stock}
          label={
            outOfStock
              ? "Rupture"
              : `${v.stock} exemplaire${v.stock > 1 ? "s" : ""}`
          }
        />
        {outOfStock ? (
          <span className="text-xs text-gray-400">
            Ajoute-la aux favoris pour la retrouver plus vite.
          </span>
        ) : null}
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
        className={`mt-4 flex w-full items-center justify-center gap-2 rounded-full py-2.5 text-sm font-semibold transition ${
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
  const prices = variants.map(({ variant }) => variant.price);
  const minPrice = prices.length > 0 ? Math.min(...prices) : card.price;
  const maxPrice = prices.length > 0 ? Math.max(...prices) : card.price;
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
    <div className="mt-6 grid grid-cols-1 gap-8 lg:grid-cols-[minmax(18rem,26rem)_1fr] lg:items-start">
      <div className="lg:sticky lg:top-24">
        <div className="relative aspect-[3/4] overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-br from-zinc-800 to-zinc-950 text-2xl font-bold text-gray-300 shadow-2xl shadow-black/30">
          {currentImage ? (
            <CardImage
              src={currentImage}
              alt={`${card.name}${imageIndex === 1 ? " (dos)" : ""}`}
              className={`h-full w-full object-contain ${
                allOutOfStock ? "opacity-40 grayscale" : ""
              }`}
              fallbackText={card.name}
              fallbackClassName="px-4 text-center"
            />
          ) : (
            <span className="flex h-full items-center justify-center px-4 text-center">
              {card.name}
            </span>
          )}

          {allOutOfStock && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <span className="rounded-full bg-red-600 text-white text-base font-bold uppercase tracking-wider px-6 py-2 shadow-lg -rotate-12 border-2 border-white/90">
                Rupture
              </span>
            </div>
          )}
        </div>

        {hasMultipleImages ? (
          <div className="mt-3 grid grid-cols-2 gap-2">
            {images.map((image, index) => (
              <button
                key={image}
                type="button"
                onClick={() => setImageIndex(index)}
                className={`rounded-lg border px-3 py-2 text-sm font-medium transition ${
                  imageIndex === index
                    ? "border-violet-300 bg-violet-500/20 text-white"
                    : "border-white/10 bg-white/5 text-gray-300 hover:bg-white/10"
                }`}
              >
                {index === 0 ? "Devant" : "Dos"}
              </button>
            ))}
          </div>
        ) : null}
      </div>

      <div className="min-w-0">
        <div className="text-sm text-gray-400">{card.number}</div>
        <h1 className="mt-1 text-3xl font-bold text-white md:text-4xl">
          {card.name}
        </h1>

        <div className="mt-2 flex flex-wrap gap-2 text-xs">
          <span className="rounded-full bg-sky-500/20 text-sky-300 px-2 py-1">
            {card.language}
          </span>
          <span className="rounded-full bg-violet-500/15 px-2 py-1 text-violet-200">
            {variants.length} variante{variants.length > 1 ? "s" : ""}
          </span>
          <span className="rounded-full bg-white/10 px-2 py-1 text-gray-200">
            {minPrice === maxPrice
              ? formatPrice(minPrice)
              : `${formatPrice(minPrice)} à ${formatPrice(maxPrice)}`}
          </span>
        </div>

        {card.description && (
          <p className="mt-4 text-gray-300">{card.description}</p>
        )}

        <div className="mt-5 grid gap-3 sm:grid-cols-2">
          <div className="rounded-xl border border-white/10 bg-zinc-900/60 p-4">
            <div className="text-xs text-gray-500">État</div>
            <div className="mt-2">
              <ConditionBadge condition={variants[0]?.variant.condition ?? card.condition} />
            </div>
          </div>
          <div className="rounded-xl border border-white/10 bg-zinc-900/60 p-4">
            <div className="text-xs text-gray-500">Envoi</div>
            <div className="mt-1 text-sm font-semibold text-white">
              Protégée pour l’expédition
            </div>
          </div>
        </div>

        {variants.length === 0 ? (
          <p className="mt-6 rounded-lg border border-white/10 bg-zinc-900/60 p-4 text-sm text-gray-300">
            Aucune variante disponible pour le moment.
          </p>
        ) : (
          <>
            <div className="mt-6 flex items-center justify-between gap-3">
              <h2 className="text-xl font-bold text-white">
                Choisir une variante
              </h2>
              <span className="text-sm text-gray-400">
                Prix et stock par rareté
              </span>
            </div>
            <div className={`mt-3 grid gap-4 ${gridCols}`}>
              {variants.map(({ key }) => (
                <VariantBlock key={key} card={card} variant={key} />
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
