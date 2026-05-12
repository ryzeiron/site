"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export default function AdminReviewActions({
  reviewId,
}: {
  reviewId: string;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function deleteReview() {
    const ok = window.confirm("Supprimer définitivement cet avis ?");
    if (!ok) return;

    setLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/admin/reviews", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reviewId }),
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(data.error ?? "Erreur");
      }

      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur inconnue");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mt-4 flex flex-wrap items-center gap-2">
      <button
        type="button"
        onClick={deleteReview}
        disabled={loading}
        className="rounded bg-red-600 px-3 py-2 text-xs font-semibold text-white hover:bg-red-500 disabled:opacity-60"
      >
        {loading ? "Suppression..." : "Supprimer l'avis"}
      </button>

      {error && <span className="text-xs text-red-300">{error}</span>}
    </div>
  );
}
