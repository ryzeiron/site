"use client";

import type { VariantKey } from "@/lib/catalog";

type FavoriteRow = {
  cardId: string;
  variant: VariantKey;
};

type FavoriteState = {
  authenticated: boolean;
  favorites: Set<string>;
};

let favoriteState: FavoriteState | null = null;
let favoriteStatePromise: Promise<FavoriteState> | null = null;

function favoriteKey(cardId: string, variant: VariantKey) {
  return `${cardId}:${variant}`;
}

export function isFavoriteInState(
  state: FavoriteState,
  cardId: string,
  variant: VariantKey,
) {
  return state.favorites.has(favoriteKey(cardId, variant));
}

export async function loadFavoriteState() {
  if (favoriteState) return favoriteState;
  if (favoriteStatePromise) return favoriteStatePromise;

  favoriteStatePromise = fetch("/api/favorites")
    .then(async (response) => {
      const data = await response.json();
      const rows = Array.isArray(data.favorites)
        ? (data.favorites as FavoriteRow[])
        : [];

      favoriteState = {
        authenticated: Boolean(data.authenticated),
        favorites: new Set(
          rows.map((row) => favoriteKey(row.cardId, row.variant || "base")),
        ),
      };

      return favoriteState;
    })
    .catch(() => {
      favoriteState = {
        authenticated: false,
        favorites: new Set(),
      };

      return favoriteState;
    });

  return favoriteStatePromise;
}

export function updateFavoriteState(
  cardId: string,
  variant: VariantKey,
  favorite: boolean,
) {
  if (!favoriteState) {
    favoriteState = {
      authenticated: true,
      favorites: new Set(),
    };
  }

  const key = favoriteKey(cardId, variant);
  if (favorite) {
    favoriteState.favorites.add(key);
  } else {
    favoriteState.favorites.delete(key);
  }

  favoriteState.authenticated = true;
}
