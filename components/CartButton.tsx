"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useCart } from "@/lib/cart";

export default function CartButton() {
  const totalItems = useCart((s) => s.totalItems());
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  return (
    <Link
      href="/panier"
      className="relative inline-flex items-center gap-1 rounded-full bg-brand-500 hover:bg-brand-600 text-white px-4 py-2 text-sm font-medium"
    >
      Panier
      {mounted && totalItems > 0 && (
        <span className="ml-1 inline-flex items-center justify-center min-w-5 h-5 px-1 rounded-full bg-white text-brand-700 text-xs font-bold">
          {totalItems}
        </span>
      )}
    </Link>
  );
}
