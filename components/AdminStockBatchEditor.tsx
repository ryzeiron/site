"use client";

import AdminStockRow from "@/components/AdminStockRow";
import {
  AdminStockBatchProvider,
  useAdminStockBatch,
} from "@/components/AdminStockBatchContext";
import type { Card } from "@/lib/catalog";

export default function AdminStockBatchEditor({ cards }: { cards: Card[] }) {
  return (
    <AdminStockBatchProvider>
      <AdminStockBatchToolbar />
      <div className="space-y-3">
        {cards.map((card) => (
          <AdminStockRow key={card.id} card={card} />
        ))}
      </div>
    </AdminStockBatchProvider>
  );
}

function AdminStockBatchToolbar() {
  const { pendingUpdates, pendingCount, saving, message, error, discardAll, saveAll } =
    useAdminStockBatch();
  const preview = pendingUpdates.slice(0, 3);
  const hiddenCount = Math.max(0, pendingCount - preview.length);

  return (
    <div className="sticky top-3 z-20 mb-4 rounded-2xl border border-violet-500/25 bg-slate-950/95 p-4 shadow-2xl shadow-black/30 backdrop-blur">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <p className="text-sm font-semibold text-white">
            {pendingCount > 0
              ? `${pendingCount} modification${pendingCount > 1 ? "s" : ""} en attente`
              : "Aucune modification en attente"}
          </p>
          <p className="mt-1 text-xs text-slate-400">
            Les lignes modifiees seront envoyees ensemble, avec une seule mise a jour du cache.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={discardAll}
            disabled={pendingCount === 0 || saving}
            className="rounded-full border border-slate-700 px-4 py-2 text-sm font-semibold text-slate-200 transition hover:border-slate-500 disabled:cursor-not-allowed disabled:opacity-40"
          >
            Annuler les modifications
          </button>
          <button
            type="button"
            onClick={saveAll}
            disabled={pendingCount === 0 || saving}
            className="rounded-full bg-violet-600 px-5 py-2 text-sm font-semibold text-white transition hover:bg-violet-500 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {saving ? "Envoi..." : "Envoyer tout"}
          </button>
        </div>
      </div>

      {preview.length > 0 ? (
        <div className="mt-3 flex flex-wrap gap-2">
          {preview.map((update) => (
            <span
              key={`${update.cardId}:${update.variant}`}
              className="rounded-full border border-violet-400/30 bg-violet-500/10 px-3 py-1 text-xs text-violet-100"
            >
              {update.cardName} {update.cardNumber} - {update.label}
            </span>
          ))}
          {hiddenCount > 0 ? (
            <span className="rounded-full border border-slate-700 px-3 py-1 text-xs text-slate-300">
              +{hiddenCount} autre{hiddenCount > 1 ? "s" : ""}
            </span>
          ) : null}
        </div>
      ) : null}

      {message ? <p className="mt-3 text-sm text-emerald-300">{message}</p> : null}
      {error ? <p className="mt-3 text-sm text-red-300">{error}</p> : null}
    </div>
  );
}
