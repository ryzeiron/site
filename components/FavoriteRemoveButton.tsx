"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import type { VariantKey } from "@/lib/catalog";
import { updateFavoriteState } from "@/components/favorite-card-state";
import { updateFavoriteSleeveState } from "@/components/favorite-sleeve-state";

type FavoriteRemoveButtonProps =
  | {
      type: "card";
      cardId: string;
      variant: VariantKey;
    }
  | {
      type: "sleeve";
      sleeveId: string;
    };

export default function FavoriteRemoveButton(props: FavoriteRemoveButtonProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function removeFavorite() {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(
        props.type === "card" ? "/api/favorites" : "/api/favorite-sleeves",
        {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(
            props.type === "card"
              ? { cardId: props.cardId, variant: props.variant }
              : { sleeveId: props.sleeveId },
          ),
        },
      );
      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(data.error ?? "Impossible de retirer ce favori.");
      }

      if (props.type === "card") {
        updateFavoriteState(props.cardId, props.variant, false);
      } else {
        updateFavoriteSleeveState(props.sleeveId, false);
      }

      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur inconnue.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mt-3">
      <button
        type="button"
        onClick={removeFavorite}
        disabled={loading}
        className="w-full rounded-full border border-red-300/25 bg-red-500/10 px-3 py-2 text-sm font-semibold text-red-100 transition hover:border-red-300/60 hover:bg-red-500/20 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {loading ? "Suppression..." : "Retirer des favoris"}
      </button>
      {error ? <p className="mt-2 text-xs text-red-300">{error}</p> : null}
    </div>
  );
}
