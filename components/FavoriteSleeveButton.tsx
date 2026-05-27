"use client";

import { useEffect, useState } from "react";
import {
  isFavoriteSleeveInState,
  loadFavoriteSleeveState,
  updateFavoriteSleeveState,
} from "@/components/favorite-sleeve-state";

type FavoriteSleeveButtonProps = {
  sleeveId: string;
};

export default function FavoriteSleeveButton({
  sleeveId,
}: FavoriteSleeveButtonProps) {
  const [favorite, setFavorite] = useState(false);
  const [authenticated, setAuthenticated] = useState(true);
  const [loading, setLoading] = useState(true);
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    async function loadFavorite() {
      try {
        const state = await loadFavoriteSleeveState();

        if (!active) return;
        setAuthenticated(state.authenticated);
        setFavorite(isFavoriteSleeveInState(state, sleeveId));
      } catch {
        if (active) setAuthenticated(false);
      } finally {
        if (active) setLoading(false);
      }
    }

    loadFavorite();
    return () => {
      active = false;
    };
  }, [sleeveId]);

  async function toggleFavorite() {
    setLoading(true);
    setNotice(null);

    try {
      const response = await fetch("/api/favorite-sleeves", {
        method: favorite ? "DELETE" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sleeveId }),
      });

      if (response.status === 401) {
        const callbackUrl = encodeURIComponent("/sleeve");
        window.location.href = `/connexion?callbackUrl=${callbackUrl}`;
        return;
      }

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error ?? "Action impossible.");
      }

      setAuthenticated(true);
      setFavorite(Boolean(data.favorite));
      updateFavoriteSleeveState(sleeveId, Boolean(data.favorite));
      setNotice(
        data.favorite
          ? "Sleeve ajouté à tes favoris."
          : "Sleeve retiré de tes favoris.",
      );
    } catch (e) {
      setNotice(e instanceof Error ? e.message : "Action impossible.");
    } finally {
      setLoading(false);
    }
  }

  const label = favorite ? "Dans mes favoris" : "Ajouter aux favoris";

  return (
    <div className="mt-2">
      <button
        type="button"
        disabled={loading}
        onClick={toggleFavorite}
        className={`flex w-full items-center justify-center gap-2 rounded border px-3 py-2 text-sm font-medium transition disabled:opacity-60 ${
          favorite
            ? "border-pink-300/60 bg-pink-500/15 text-pink-100 hover:bg-pink-500/25"
            : "border-violet-300/30 bg-violet-500/10 text-violet-100 hover:border-violet-300/70 hover:bg-violet-500/20"
        }`}
      >
        <HeartIcon filled={favorite} />
        {loading ? "Chargement..." : label}
      </button>

      {!authenticated && !loading && (
        <p className="mt-2 text-xs text-gray-400">
          Connecte-toi pour enregistrer ce sleeve dans tes favoris.
        </p>
      )}

      {notice && <p className="mt-2 text-xs text-gray-300">{notice}</p>}
    </div>
  );
}

function HeartIcon({ filled }: { filled: boolean }) {
  return (
    <svg
      aria-hidden
      viewBox="0 0 24 24"
      className="h-4 w-4"
      fill={filled ? "currentColor" : "none"}
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="2"
    >
      <path d="M20.8 4.6a5.4 5.4 0 0 0-7.6 0L12 5.8l-1.2-1.2a5.4 5.4 0 0 0-7.6 7.6l1.2 1.2L12 21l7.6-7.6 1.2-1.2a5.4 5.4 0 0 0 0-7.6Z" />
    </svg>
  );
}
