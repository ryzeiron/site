"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function AdminPromoDeleteButton({
  promotionCodeId,
  code,
}: {
  promotionCodeId: string;
  code: string;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function remove() {
    if (
      !window.confirm(
        `Supprimer le code ${code} ?\n\nIl ne sera plus utilisable dans le panier. Les commandes deja passees avec ce code ne sont pas affectees.`,
      )
    ) {
      return;
    }

    setBusy(true);
    setError(null);

    try {
      const res = await fetch(
        `/api/admin/promos?id=${encodeURIComponent(promotionCodeId)}`,
        { method: "DELETE" },
      );
      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        setError(data.error ?? "Suppression impossible.");
        return;
      }

      router.refresh();
    } catch {
      setError("Erreur reseau.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <button
        type="button"
        onClick={remove}
        disabled={busy}
        className="rounded-full border border-red-400/30 bg-red-500/10 px-3 py-1 text-xs font-semibold text-red-200 transition hover:bg-red-500/25 disabled:opacity-50"
      >
        {busy ? "..." : "Supprimer"}
      </button>

      {error ? (
        <span className="text-[11px] text-red-300">{error}</span>
      ) : null}
    </div>
  );
}
