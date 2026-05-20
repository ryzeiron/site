"use client";

import { useState } from "react";
import { useCart } from "@/lib/cart";

export default function SleeveAddToCartButton({
  sleeveId,
  stock,
}: {
  sleeveId: string;
  stock: number;
}) {
  const [added, setAdded] = useState(false);
  const addSleeve = useCart((state) => state.addSleeve);
  const outOfStock = stock <= 0;

  return (
    <button
      type="button"
      disabled={outOfStock}
      onClick={() => {
        if (outOfStock) return;
        addSleeve(sleeveId, 1, stock);
        setAdded(true);
        setTimeout(() => setAdded(false), 1200);
      }}
      className={`mt-4 w-full rounded-full px-4 py-2.5 text-sm font-semibold transition ${
        outOfStock
          ? "cursor-not-allowed bg-gray-200 text-gray-500"
          : added
            ? "bg-emerald-500 text-white"
            : "bg-violet-600 text-white hover:bg-violet-700"
      }`}
    >
      {outOfStock ? "Rupture de stock" : added ? "Ajouté" : "Ajouter au panier"}
    </button>
  );
}
