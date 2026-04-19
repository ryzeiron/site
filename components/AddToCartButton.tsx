"use client";

import { useState } from "react";
import { useCart } from "@/lib/cart";
import type { Card } from "@/lib/catalog";

export default function AddToCartButton({ card }: { card: Card }) {
  const add = useCart((s) => s.add);
  const [added, setAdded] = useState(false);

  if (card.stock <= 0) {
    return (
      <button
        disabled
        className="w-full rounded bg-gray-200 text-gray-500 py-2 text-sm font-medium cursor-not-allowed"
      >
        Rupture de stock
      </button>
    );
  }

  return (
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
  );
}
