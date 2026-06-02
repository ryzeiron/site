"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export default function AdminOrderDeleteButton({
  orderId,
  customerLabel,
}: {
  orderId: string;
  customerLabel: string;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function deleteOrder() {
    const ok = window.confirm(
      `Supprimer cette commande du menu admin ?\n\n${customerLabel}\n\nCela ne rembourse pas Stripe et ne remet pas le stock.`,
    );
    if (!ok) return;

    setLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/admin/orders", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderId }),
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
    <div className="mt-3 flex flex-wrap items-center gap-2">
      <button
        type="button"
        onClick={deleteOrder}
        disabled={loading}
        className="rounded bg-red-600 px-3 py-2 text-xs font-semibold text-white transition hover:bg-red-500 disabled:opacity-60"
      >
        {loading ? "Suppression..." : "Supprimer la commande"}
      </button>
      {error ? <span className="text-xs text-red-300">{error}</span> : null}
    </div>
  );
}
