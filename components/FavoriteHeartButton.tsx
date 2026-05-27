"use client";

import { useEffect, useState } from "react";
import type { VariantKey } from "@/lib/catalog";
import {
  isFavoriteInState,
  loadFavoriteState,
  updateFavoriteState,
} from "@/components/favorite-card-state";

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
        const state = await loadFavoriteState();

        if (!active) return;
        setFavorite(isFavoriteInState(state, cardId, variant));
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
        updateFavoriteState(cardId, variant, Boolean(data.favorite));
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
          ? "border-red-300/80 bg-red-200/85 text-red-600 shadow-[0_0_14px_rgba(239,68,68,0.45)]"
          : "border-red-200/80 bg-red-100/85 text-red-600 hover:border-red-300 hover:bg-red-200 hover:text-red-700 hover:shadow-[0_0_14px_rgba(239,68,68,0.45)]"
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
