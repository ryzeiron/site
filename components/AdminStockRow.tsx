"use client";

import { useState } from "react";
import type { Card, VariantKey } from "@/lib/catalog";

export default function AdminStockRow({
  card,
  baseStock,
  altStock,
}: {
  card: Card;
  baseStock: number;
  altStock: number | null;
}) {
  return (
    <tr className="border-b border-white/5">
      <td className="py-2 px-2 text-gray-300 text-sm">{card.number}</td>
      <td className="py-2 px-2 text-white">{card.name}</td>
      <td className="py-2 px-2">
        <StockCell card={card} variant="base" initial={baseStock} />
      </td>
      <td className="py-2 px-2">
        {altStock !== null ? (
          <StockCell card={card} variant="alt" initial={altStock} />
        ) : (
          <span className="text-gray-500 text-sm">-</span>
        )}
      </td>
    </tr>
  );
}

function StockCell({
  card,
  variant,
  initial,
}: {
  card: Card;
  variant: VariantKey;
  initial: number;
}) {
  const [value, setValue] = useState<string>(String(initial));
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const current = Number.parseInt(value, 10);
  const valid = Number.isInteger(current) && current >= 0;
  const changed = current !== initial;

  async function save() {
    if (!valid || !changed) return;
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/stock", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cardId: card.id, variant, stock: current }),
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
    <div className="flex items-center gap-2">
      <input
        type="number"
        min={0}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        className="w-20 rounded bg-zinc-900 border border-white/10 text-white px-2 py-1 text-sm"
      />
      <button
        type="button"
        onClick={save}
        disabled={!valid || !changed || saving}
        className={`rounded px-3 py-1 text-xs font-medium transition ${
          saved
            ? "bg-emerald-500 text-white"
            : changed && valid
              ? "bg-brand-500 hover:bg-brand-600 text-white"
              : "bg-white/10 text-gray-400 cursor-not-allowed"
        }`}
      >
        {saved ? "OK" : saving ? "..." : "Save"}
      </button>
      {error && <span className="text-xs text-red-400">{error}</span>}
    </div>
  );
}
