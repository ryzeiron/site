"use client";

import { useState } from "react";
import type { Card, Rarity, VariantKey } from "@/lib/catalog";

export default function AdminStockRow({
  card,
}: {
  card: Card;
}) {
  return (
    <tr className="border-b border-white/5 align-top">
      <td className="py-3 px-2 text-gray-300 text-sm whitespace-nowrap">
        {card.number}
      </td>
      <td className="py-3 px-2 text-white">{card.name}</td>
      <td className="py-3 px-2">
        <VariantCell
          card={card}
          variant="base"
          rarity={card.rarity}
          initialStock={card.stock}
          initialPrice={card.price}
        />
      </td>
      <td className="py-3 px-2">
        {card.altVariant ? (
          <VariantCell
            card={card}
            variant="alt"
            rarity={card.altVariant.rarity}
            initialStock={card.altVariant.stock}
            initialPrice={card.altVariant.price}
          />
        ) : (
          <span className="text-gray-600 text-sm">-</span>
        )}
      </td>
    </tr>
  );
}

function VariantCell({
  card,
  variant,
  rarity,
  initialStock,
  initialPrice,
}: {
  card: Card;
  variant: VariantKey;
  rarity: Rarity;
  initialStock: number;
  initialPrice: number;
}) {
  const [stockValue, setStockValue] = useState<string>(String(initialStock));
  const [priceValue, setPriceValue] = useState<string>(String(initialPrice));
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const currentStock = Number.parseInt(stockValue, 10);
  const currentPrice = Number.parseFloat(priceValue.replace(",", "."));
  const stockValid = Number.isInteger(currentStock) && currentStock >= 0;
  const priceValid = Number.isFinite(currentPrice) && currentPrice >= 0;
  const stockChanged = currentStock !== initialStock;
  const priceChanged = Math.abs(currentPrice - initialPrice) > 0.0001;
  const hasChanges = stockChanged || priceChanged;
  const canSave = hasChanges && stockValid && priceValid;

  async function save() {
    if (!canSave) return;
    setSaving(true);
    setError(null);
    try {
      const body: Record<string, unknown> = { cardId: card.id, variant };
      if (stockChanged) body.stock = currentStock;
      if (priceChanged) body.price = currentPrice;
      const res = await fetch("/api/admin/stock", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Erreur");
      setSaved(true);
      setTimeout(() => setSaved(false), 1500);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erreur");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="flex flex-col gap-2 min-w-[240px]">
      <span className="inline-block self-start rounded-full bg-amber-500/20 text-amber-300 px-2 py-0.5 text-xs">
        {rarity}
      </span>
      <div className="flex items-center gap-2 text-sm">
        <label className="text-gray-400 w-10">Stock</label>
        <input
          type="number"
          min={0}
          value={stockValue}
          onChange={(e) => setStockValue(e.target.value)}
          className="w-20 rounded bg-zinc-900 border border-white/10 text-white px-2 py-1"
        />
      </div>
      <div className="flex items-center gap-2 text-sm">
        <label className="text-gray-400 w-10">Prix</label>
        <input
          type="number"
          min={0}
          step="0.01"
          value={priceValue}
          onChange={(e) => setPriceValue(e.target.value)}
          className="w-24 rounded bg-zinc-900 border border-white/10 text-white px-2 py-1"
        />
        <span className="text-gray-500 text-xs">€</span>
      </div>
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={save}
          disabled={!canSave || saving}
          className={`rounded px-3 py-1 text-xs font-medium transition ${
            saved
              ? "bg-emerald-500 text-white"
              : canSave
                ? "bg-brand-500 hover:bg-brand-600 text-white"
                : "bg-white/10 text-gray-400 cursor-not-allowed"
          }`}
        >
          {saved ? "OK" : saving ? "..." : "Enregistrer"}
        </button>
        {error && <span className="text-xs text-red-400">{error}</span>}
      </div>
    </div>
  );
}
