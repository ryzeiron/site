"use client";

type FavoriteSleeveRow = {
  sleeveId: string;
};

type FavoriteSleeveState = {
  authenticated: boolean;
  favorites: Set<string>;
};

let favoriteSleeveState: FavoriteSleeveState | null = null;
let favoriteSleeveStatePromise: Promise<FavoriteSleeveState> | null = null;

export function isFavoriteSleeveInState(
  state: FavoriteSleeveState,
  sleeveId: string,
) {
  return state.favorites.has(sleeveId);
}

export async function loadFavoriteSleeveState() {
  if (favoriteSleeveState) return favoriteSleeveState;
  if (favoriteSleeveStatePromise) return favoriteSleeveStatePromise;

  favoriteSleeveStatePromise = fetch("/api/favorite-sleeves")
    .then(async (response) => {
      const data = await response.json();
      const rows = Array.isArray(data.favorites)
        ? (data.favorites as FavoriteSleeveRow[])
        : [];

      favoriteSleeveState = {
        authenticated: Boolean(data.authenticated),
        favorites: new Set(rows.map((row) => row.sleeveId)),
      };

      return favoriteSleeveState;
    })
    .catch(() => {
      favoriteSleeveState = {
        authenticated: false,
        favorites: new Set(),
      };

      return favoriteSleeveState;
    });

  return favoriteSleeveStatePromise;
}

export function updateFavoriteSleeveState(
  sleeveId: string,
  favorite: boolean,
) {
  if (!favoriteSleeveState) {
    favoriteSleeveState = {
      authenticated: true,
      favorites: new Set(),
    };
  }

  if (favorite) {
    favoriteSleeveState.favorites.add(sleeveId);
  } else {
    favoriteSleeveState.favorites.delete(sleeveId);
  }

  favoriteSleeveState.authenticated = true;
}
