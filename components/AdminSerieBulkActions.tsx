"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { CONDITIONS, RARITIES, type Condition, type Rarity } from "@/lib/catalog";
import { formatRarityLabel } from "@/lib/display-variants";

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
  const [condition, setCondition] = useState<Condition>("Near Mint");
  const [sourceRarity, setSourceRarity] = useState<Rarity | "all">("all");
  const [replacementRarity, setReplacementRarity] =
    useState<Rarity>(defaultRarity);
  const [priceValue, setPriceValue] = useState("0.50");
  const [updateExistingPrice, setUpdateExistingPrice] = useState(false);
  const [savingPrice, setSavingPrice] = useState(false);
  const [savingRarity, setSavingRarity] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const price = Number.parseFloat(priceValue.replace(",", "."));
  const canSavePrice = Number.isFinite(price) && price >= 0;
  const canReplaceRarity =
    sourceRarity === "all" || sourceRarity !== replacementRarity;
  const busy = savingPrice || savingRarity;

  async function applyPrice() {
    if (!canSavePrice || busy) return;

    const formattedPrice = price.toFixed(2).replace(".", ",");
    const protectsHighRarities = rarity === "Commune" || rarity === "Reverse";
    const ok = window.confirm(
      `Ajouter la variante ${formatRarityLabel(rarity)} - ${condition} sur ${serieLabel} à ${formattedPrice} EUR ?` +
        (updateExistingPrice
          ? "\n\nLes variantes déjà présentes auront aussi leur prix mis à jour."
          : "\n\nLes variantes déjà présentes garderont leur prix actuel.") +
        (protectsHighRarities
          ? "\n\nLes cartes Ultra rare et Secrète seront ignorées."
          : ""),
    );

    if (!ok) return;

    setSavingPrice(true);
    setMessage(null);
    setError(null);

    try {
      const res = await fetch("/api/admin/series-prices", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          serieId,
          rarity,
          condition,
          price,
          updateExistingPrice,
        }),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error ?? "Erreur");

      const created = Number(data.created ?? 0);
      const existing = Number(data.existing ?? 0);
      const existingKept = Number(data.existingKept ?? 0);
      const skippedProtected = Number(data.skippedProtected ?? 0);
      const parts = [`${created} variantes ajoutées`];

      if (updateExistingPrice) {
        parts.push(`${existing} prix mis à jour`);
      }

      if (existingKept > 0) {
        parts.push(`${existingKept} variantes déjà présentes conservées`);
      }

      if (skippedProtected > 0) {
        parts.push(`${skippedProtected} cartes protégées ignorées`);
      }

      setMessage(`${parts.join(". ")}.`);
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erreur");
    } finally {
      setSavingPrice(false);
    }
  }

  async function replaceRarities() {
    if (!canReplaceRarity || busy) return;

    const sourceLabel =
      sourceRarity === "all"
        ? "toutes les raretés"
        : `les raretés ${formatRarityLabel(sourceRarity)}`;
    const ok = window.confirm(
      `Remplacer ${sourceLabel} de ${serieLabel} par ${formatRarityLabel(replacementRarity)} ?\n\n` +
        "Le prix, le stock, l'état, les images et les variantes ne seront pas modifiés.",
    );

    if (!ok) return;

    setSavingRarity(true);
    setMessage(null);
    setError(null);

    try {
      const res = await fetch("/api/admin/series-rarities", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          serieId,
          fromRarity: sourceRarity === "all" ? undefined : sourceRarity,
          rarity: replacementRarity,
        }),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error ?? "Erreur");

      const updated = Number(data.updated ?? 0);
      setMessage(
        `${updated} rareté${updated > 1 ? "s" : ""} remplacée${updated > 1 ? "s" : ""}. Prix et stocks conservés.`,
      );
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erreur");
    } finally {
      setSavingRarity(false);
    }
  }

  return (
    <div className="mb-6 rounded-lg border border-white/10 bg-zinc-900/70 p-4">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="text-sm font-semibold text-white">
            Actions sur la série
          </div>
          <div className="text-xs text-gray-400">{serieLabel}</div>
        </div>

        {message && <span className="text-xs text-emerald-300">{message}</span>}
        {error && <span className="text-xs text-red-400">{error}</span>}
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-lg border border-white/10 bg-zinc-950/40 p-3">
          <div className="mb-3 text-xs font-semibold uppercase tracking-[0.18em] text-violet-300">
            Ajouter une variante
          </div>

          <div className="flex flex-wrap items-end gap-3">
            <label className="flex flex-col gap-1 text-sm">
              <span className="text-xs text-gray-400">Rareté</span>
              <select
                value={rarity}
                onChange={(e) => setRarity(e.target.value as Rarity)}
                className="rounded border border-white/10 bg-zinc-900 px-3 py-2 text-white"
              >
                {RARITIES.map((value) => (
                  <option key={value} value={value}>
                    {formatRarityLabel(value)}
                  </option>
                ))}
              </select>
            </label>

            <label className="flex flex-col gap-1 text-sm">
              <span className="text-xs text-gray-400">État</span>
              <select
                value={condition}
                onChange={(e) => setCondition(e.target.value as Condition)}
                className="rounded border border-white/10 bg-zinc-900 px-3 py-2 text-white"
              >
                {CONDITIONS.map((value) => (
                  <option key={value} value={value}>
                    {value}
                  </option>
                ))}
              </select>
            </label>

            <label className="flex flex-col gap-1 text-sm">
              <span className="text-xs text-gray-400">Prix des variantes ajoutées</span>
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

            <label className="flex items-center gap-2 rounded border border-white/10 bg-zinc-900 px-3 py-2 text-sm text-gray-200">
              <input
                type="checkbox"
                checked={updateExistingPrice}
                onChange={(e) => setUpdateExistingPrice(e.target.checked)}
                className="h-4 w-4 accent-brand-500"
              />
              Mettre aussi à jour les prix existants
            </label>

            <button
              type="button"
              onClick={applyPrice}
              disabled={!canSavePrice || busy}
              className={`rounded px-4 py-2 text-sm font-medium transition ${
                canSavePrice && !busy
                  ? "bg-brand-500 text-white hover:bg-brand-600"
                  : "cursor-not-allowed bg-white/10 text-gray-400"
              }`}
            >
              {savingPrice ? "Application..." : "Ajouter à toute la série"}
            </button>
          </div>

          <p className="mt-2 text-xs leading-5 text-gray-400">
            Par défaut, seules les variantes manquantes sont ajoutées. Les prix
            déjà présents restent inchangés sauf si l'option est cochée.
          </p>
        </div>

        <div className="rounded-lg border border-violet-300/20 bg-violet-950/20 p-3">
          <div className="mb-3 text-xs font-semibold uppercase tracking-[0.18em] text-violet-300">
            Changer X par Y
          </div>

          <div className="flex flex-wrap items-end gap-3">
            <label className="flex flex-col gap-1 text-sm">
              <span className="text-xs text-gray-400">Changer</span>
              <select
                value={sourceRarity}
                onChange={(e) =>
                  setSourceRarity(
                    e.target.value === "all"
                      ? "all"
                      : (e.target.value as Rarity),
                  )
                }
                className="rounded border border-white/10 bg-zinc-900 px-3 py-2 text-white"
              >
                <option value="all">Toutes les raretés</option>
                {RARITIES.map((value) => (
                  <option key={value} value={value}>
                    {formatRarityLabel(value)}
                  </option>
                ))}
              </select>
            </label>

            <label className="flex flex-col gap-1 text-sm">
              <span className="text-xs text-gray-400">En</span>
              <select
                value={replacementRarity}
                onChange={(e) => setReplacementRarity(e.target.value as Rarity)}
                className="rounded border border-white/10 bg-zinc-900 px-3 py-2 text-white"
              >
                {RARITIES.map((value) => (
                  <option key={value} value={value}>
                    {formatRarityLabel(value)}
                  </option>
                ))}
              </select>
            </label>

            <button
              type="button"
              onClick={replaceRarities}
              disabled={!canReplaceRarity || busy}
              className={`rounded px-4 py-2 text-sm font-medium transition ${
                canReplaceRarity && !busy
                  ? "bg-violet-600 text-white hover:bg-violet-700"
                  : "cursor-not-allowed bg-white/10 text-gray-400"
              }`}
            >
              {savingRarity ? "Remplacement..." : "Appliquer"}
            </button>
          </div>

          <p className="mt-2 text-xs leading-5 text-gray-400">
            Cette action change seulement la rareté des cartes et variantes
            concernées. Le prix, le stock et l'état restent identiques.
          </p>
        </div>
      </div>
    </div>
  );
}
