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
      className="relative inline-flex items-center gap-1 rounded-full bg-violet-600/80 px-3 py-2 text-xs font-medium text-white backdrop-blur-sm transition hover:bg-violet-700 sm:px-4 sm:text-sm"
    >
      Panier
      {mounted && totalItems > 0 && (
        <span className="ml-1 inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-white px-1 text-xs font-bold text-violet-700">
          {totalItems}
        </span>
      )}
    </Link>
  );
}
