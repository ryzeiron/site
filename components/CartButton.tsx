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
      aria-label="Panier"
      title="Panier"
      className="relative inline-flex h-10 w-10 items-center justify-center gap-1 rounded-full bg-violet-600/80 text-xs font-medium text-white backdrop-blur-sm transition hover:bg-violet-700 sm:w-auto sm:px-4 sm:text-sm"
    >
      <CartIcon />
      <span className="hidden sm:inline">Panier</span>

      {mounted && totalItems > 0 && (
        <span className="absolute -right-1 -top-1 inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-white px-1 text-xs font-bold text-violet-700 sm:static sm:ml-1">
          {totalItems}
        </span>
      )}
    </Link>
  );
}

function CartIcon() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      className="h-5 w-5 sm:hidden"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx="9" cy="21" r="1" />
      <circle cx="20" cy="21" r="1" />
      <path d="M1 1h4l2.7 13.4a2 2 0 0 0 2 1.6h8.8a2 2 0 0 0 2-1.6L23 6H6" />
    </svg>
  );
}
