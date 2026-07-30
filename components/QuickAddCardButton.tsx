"use client";

import { useEffect, useMemo, useState } from "react";
import { resolveVariant, type Card, type VariantKey } from "@/lib/catalog";
import { orderDisplayVariants, formatRarityLabel } from "@/lib/display-variants";
import { formatPrice } from "@/lib/format";
import { useCart } from "@/lib/cart";

type AvailableVariant = {
  key: VariantKey;
  rarity: string;
  price: number;
  stock: number;
};

export default function QuickAddCardButton({
  card,
  variantKey,
}: {
  card: Card;
  variantKey?: VariantKey;
}) {
  const add = useCart((state) => state.add);
  const [selectedKey, setSelectedKey] = useState<VariantKey>("base");
  const [added, setAdded] = useState(false);

  const availableVariants = useMemo<AvailableVariant[]>(() => {
    const variants = variantKey
      ? [{ key: variantKey, variant: resolveVariant(card, variantKey) }]
      : orderDisplayVariants(card);

    return variants
      .filter(({ variant }) => variant.stock > 0)
      .map(({ key, variant }) => ({
        key,
        rarity: formatRarityLabel(variant.rarity),
        price: variant.price,
        stock: variant.stock,
      }));
  }, [card, variantKey]);

  useEffect(() => {
    const first = availableVariants[0]?.key ?? "base";
    if (!availableVariants.some((variant) => variant.key === selectedKey)) {
      setSelectedKey(first);
    }
  }, [availableVariants, selectedKey]);

  const selectedVariant =
    availableVariants.find((variant) => variant.key === selectedKey) ??
    availableVariants[0];
  const disabled = !selectedVariant;

  function addToCart() {
    if (!selectedVariant) return;

    add(card.id, selectedVariant.key, 1, selectedVariant.stock);
    setAdded(true);
    window.setTimeout(() => setAdded(false), 1200);
  }

  if (disabled) {
    return (
      <div className="px-3 pb-3">
        <button
          type="button"
          disabled
          className="h-10 w-full cursor-not-allowed rounded-full bg-gray-200 px-3 text-xs font-semibold text-gray-500"
        >
          Rupture
        </button>
      </div>
    );
  }

  if (availableVariants.length === 1) {
    return (
      <div className="px-3 pb-3">
        <button
          type="button"
          onClick={addToCart}
          className={`h-10 w-full rounded-full px-3 text-xs font-semibold text-white transition ${
            added ? "bg-emerald-500" : "bg-violet-600 hover:bg-violet-700"
          }`}
        >
          {added ? "Ajouté" : "Ajouter au panier"}
        </button>
      </div>
    );
  }

  return (
    <div className="px-3 pb-3">
      <div className="flex gap-2">
        <select
          value={selectedVariant.key}
          onChange={(event) => setSelectedKey(event.target.value)}
          className="h-10 min-w-0 flex-1 rounded-full border border-white/10 bg-zinc-950 px-2 text-xs text-white outline-none focus:border-violet-400"
          aria-label="Choisir la variante"
        >
          {availableVariants.map((variant) => (
            <option key={variant.key} value={variant.key}>
              {variant.rarity} - {formatPrice(variant.price)} - {variant.stock}
            </option>
          ))}
        </select>

        <button
          type="button"
          onClick={addToCart}
          className={`h-10 rounded-full px-3 text-xs font-semibold text-white transition ${
            added ? "bg-emerald-500" : "bg-violet-600 hover:bg-violet-700"
          }`}
        >
          {added ? "OK" : "Ajouter"}
        </button>
      </div>
    </div>
  );
}
