"use client";

import AdminStockRow from "@/components/AdminStockRow";
import {
  AdminStockBatchProvider,
  useAdminStockBatch,
} from "@/components/AdminStockBatchContext";
import type { Card } from "@/lib/catalog";

type AdminCardGroup = {
  serieId: string;
  blocName: string;
  serieName: string;
  serieCode: string;
  cards: Card[];
};

export default function AdminStockBatchEditor({
  groups,
}: {
  groups: AdminCardGroup[];
}) {
  return (
    <AdminStockBatchProvider>
      <AdminStockBatchToolbar />

      <div className="space-y-6">
        {groups.map((group) => (
          <section key={group.serieId}>
            <div className="mb-2 flex flex-wrap items-baseline justify-between gap-2 rounded-xl border border-violet-400/25 bg-violet-500/10 px-3 py-2">
              <div>
                <div className="text-[10px] font-semibold uppercase tracking-[0.16em] text-violet-300">
                  {group.blocName}
                </div>
                <div className="font-bold text-white">
                  {group.serieName}{" "}
                  {group.serieCode ? (
                    <span className="text-xs font-normal text-gray-400">
                      {group.serieCode}
                    </span>
                  ) : null}
                </div>
              </div>

              <span className="rounded-full bg-white/10 px-2 py-0.5 text-xs text-gray-200">
                {group.cards.length} carte{group.cards.length > 1 ? "s" : ""}
              </span>
            </div>

            <div className="space-y-3">
              {group.cards.map((card) => (
                <AdminStockRow key={card.id} card={card} />
              ))}
            </div>
          </section>
        ))}
      </div>
    </AdminStockBatchProvider>
  );
}

function AdminStockBatchToolbar() {
  const { pendingUpdates, pendingCount, saving, syncingAfterSave, message, error, discardAll, saveAll } =
    useAdminStockBatch();
  const preview = pendingUpdates.slice(0, 3);
  const hiddenCount = Math.max(0, pendingCount - preview.length);

  return (
    <div className="sticky top-2 z-20 mb-4 rounded-2xl border border-violet-500/25 bg-slate-950/95 p-3 shadow-2xl shadow-black/30 backdrop-blur sm:p-4">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <p className="text-sm font-semibold text-white">
            {syncingAfterSave
              ? "Synchronisation des lignes..."
              : pendingCount > 0
              ? `${pendingCount} modification${pendingCount > 1 ? "s" : ""} en attente`
              : "Aucune modification en attente"}
          </p>
          <p className="mt-1 text-xs text-slate-400">
            Les lignes modifiees seront envoyees ensemble, avec une seule mise a jour du cache.
          </p>
        </div>
        <div className="grid gap-2 sm:flex sm:flex-wrap">
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
