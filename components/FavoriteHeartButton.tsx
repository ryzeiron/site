"use client";

import { useEffect, useState } from "react";
import type { VariantKey } from "@/lib/catalog";

type FavoriteHeartButtonProps = {
  cardId: string;
  variant?: VariantKey;
  outOfStock?: boolean;
};

export default function FavoriteHeartButton({
  cardId,
  variant = "base",
  outOfStock = false,
}: FavoriteHeartButtonProps) {
  const [favorite, setFavorite] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;

    async function loadFavorite() {
      try {
        const params = new URLSearchParams({ cardId, variant });
        const response = await fetch(`/api/favorites?${params.toString()}`);
        const data = await response.json();

        if (!active) return;
        setFavorite(Boolean(data.favorite));
      } catch {
        if (active) setFavorite(false);
      } finally {
        if (active) setLoading(false);
      }
    }

    loadFavorite();

    return () => {
      active = false;
    };
  }, [cardId, variant]);

  async function toggleFavorite() {
    if (loading) return;

    setLoading(true);

    try {
      const response = await fetch("/api/favorites", {
        method: favorite ? "DELETE" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cardId, variant }),
      });

      if (response.status === 401) {
        const callbackUrl = encodeURIComponent(`/carte/${cardId}`);
        window.location.href = `/connexion?callbackUrl=${callbackUrl}`;
        return;
      }

      const data = await response.json();

      if (response.ok) {
        setFavorite(Boolean(data.favorite));
      }
    } finally {
      setLoading(false);
    }
  }

  const title = favorite
    ? "Retirer des favoris"
    : outOfStock
      ? "Me prévenir quand cette carte revient en stock"
      : "Ajouter aux favoris";

  return (
    <button
      type="button"
      title={title}
      aria-label={title}
      disabled={loading}
      onClick={(event) => {
        event.preventDefault();
        event.stopPropagation();
        toggleFavorite();
      }}
      className={`absolute right-2 top-2 z-20 flex h-8 w-8 items-center justify-center rounded-full border backdrop-blur-md transition disabled:opacity-70 ${
        favorite
          ? "border-red-300/80 bg-red-500/30 text-red-100 shadow-[0_0_14px_rgba(239,68,68,0.45)]"
          : "border-white/20 bg-black/50 text-red-300 hover:border-red-300/80 hover:bg-red-500/25 hover:text-red-100 hover:shadow-[0_0_14px_rgba(239,68,68,0.5)]"
      }`}
    >
      <svg
        aria-hidden
        viewBox="0 0 24 24"
        className="h-4 w-4"
        fill={favorite ? "currentColor" : "none"}
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="2.2"
      >
        <path d="M20.8 4.6a5.4 5.4 0 0 0-7.6 0L12 5.8l-1.2-1.2a5.4 5.4 0 0 0-7.6 7.6l1.2 1.2L12 21l7.6-7.6 1.2-1.2a5.4 5.4 0 0 0 0-7.6Z" />
      </svg>
    </button>
  );
}
