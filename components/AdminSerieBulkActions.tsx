"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { RARITIES, type Rarity } from "@/lib/catalog";

type Props = {
  serieId: string;
  serieLabel: string;
  defaultRarity?: Rarity;
};

export default function AdminSerieBulkActions({
  serieId,
  serieLabel,
  defaultRarity = "Commune",
}: Props) {
  const router = useRouter();
  const [rarity, setRarity] = useState<Rarity>(defaultRarity);
  const [priceValue, setPriceValue] = useState("0.50");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const price = Number.parseFloat(priceValue.replace(",", "."));
  const canSave = Number.isFinite(price) && price >= 0;

  async function applyPrice() {
    if (!canSave || saving) return;

    const formattedPrice = price.toFixed(2).replace(".", ",");
    const protectsHighRarities = rarity === "Commune" || rarity === "Reverse";
    const ok = window.confirm(
      `Mettre toutes les variantes ${rarity} de ${serieLabel} a ${formattedPrice} EUR ?` +
        (protectsHighRarities
          ? "\n\nLes cartes Ultra Rare et Secrete seront ignorees."
          : ""),
    );

    if (!ok) return;

    setSaving(true);
    setMessage(null);
    setError(null);

    try {
      const res = await fetch("/api/admin/series-prices", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          serieId,
          rarity,
          price,
        }),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error ?? "Erreur");

      const updated = Number(data.updated ?? 0);
      const skippedProtected = Number(data.skippedProtected ?? 0);
      setMessage(
        skippedProtected > 0
          ? `${updated} prix modifies. ${skippedProtected} cartes protegees ignorees.`
          : `${updated} prix modifies.`,
      );
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erreur");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="mb-6 rounded-lg border border-white/10 bg-zinc-900/70 p-4">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="text-sm font-semibold text-white">
            Action sur la serie
          </div>
          <div className="text-xs text-gray-400">{serieLabel}</div>
        </div>

        {message && <span className="text-xs text-emerald-300">{message}</span>}
        {error && <span className="text-xs text-red-400">{error}</span>}
      </div>

      <div className="flex flex-wrap items-end gap-3">
        <label className="flex flex-col gap-1 text-sm">
          <span className="text-xs text-gray-400">Rarete</span>
          <select
            value={rarity}
            onChange={(e) => setRarity(e.target.value as Rarity)}
            className="rounded border border-white/10 bg-zinc-900 px-3 py-2 text-white"
          >
            {RARITIES.map((value) => (
              <option key={value} value={value}>
                {value}
              </option>
            ))}
          </select>
        </label>

        <label className="flex flex-col gap-1 text-sm">
          <span className="text-xs text-gray-400">Prix</span>
          <div className="flex items-center gap-2">
            <input
              type="number"
              min={0}
              step="0.01"
              value={priceValue}
              onChange={(e) => setPriceValue(e.target.value)}
              className="w-28 rounded border border-white/10 bg-zinc-900 px-3 py-2 text-white"
            />
            <span className="text-sm text-gray-400">EUR</span>
          </div>
        </label>

        <button
          type="button"
          onClick={applyPrice}
          disabled={!canSave || saving}
          className={`rounded px-4 py-2 text-sm font-medium transition ${
            canSave
              ? "bg-brand-500 text-white hover:bg-brand-600"
              : "cursor-not-allowed bg-white/10 text-gray-400"
          }`}
        >
          {saving ? "Application..." : "Appliquer a toute la serie"}
        </button>
      </div>
    </div>
  );
}
