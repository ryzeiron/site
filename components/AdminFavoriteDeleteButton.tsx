"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

type FavoriteDeleteProps =
  | {
      type: "card";
      cardId: string;
      variant: string;
      userId?: string;
      label: string;
      confirmLabel: string;
    }
  | {
      type: "sleeve";
      sleeveId: string;
      userId?: string;
      label: string;
      confirmLabel: string;
    };

export default function AdminFavoriteDeleteButton(props: FavoriteDeleteProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function deleteFavorite() {
    const ok = window.confirm(`${props.confirmLabel}\n\nAction définitive.`);
    if (!ok) return;

    setLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/admin/favorites", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(props),
      });
      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(data.error ?? "Suppression impossible.");
      }

      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur inconnue.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <span className="inline-flex flex-wrap items-center gap-2">
      <button
        type="button"
        onClick={deleteFavorite}
        disabled={loading}
        className="rounded bg-red-600 px-3 py-2 text-xs font-semibold text-white transition hover:bg-red-500 disabled:opacity-60"
      >
        {loading ? "Suppression..." : props.label}
      </button>
      {error ? <span className="text-xs text-red-300">{error}</span> : null}
    </span>
  );
}
