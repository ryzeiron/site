"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { RARITIES, type Card, type Rarity, type VariantKey } from "@/lib/catalog";

export default function AdminStockRow({ card }: { card: Card }) {
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
          isNew={false}
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
            isNew={false}
          />
        ) : (
          <AddAltPlaceholder card={card} />
        )}
      </td>
    </tr>
  );
}

function AddAltPlaceholder({ card }: { card: Card }) {
  const [editing, setEditing] = useState(false);
  if (!editing) {
    return (
      <button
        type="button"
        onClick={() => setEditing(true)}
        className="rounded border border-dashed border-white/20 text-gray-300 hover:text-white hover:border-white/40 px-3 py-2 text-sm"
      >
        + Ajouter variante alt
      </button>
    );
  }
  return (
    <VariantCell
      card={card}
      variant="alt"
      rarity={null}
      initialStock={0}
      initialPrice={card.price}
      isNew
      onCancel={() => setEditing(false)}
    />
  );
}

function VariantCell({
  card,
  variant,
  rarity,
  initialStock,
  initialPrice,
  isNew,
  onCancel,
}: {
  card: Card;
  variant: VariantKey;
  rarity: Rarity | null;
  initialStock: number;
  initialPrice: number;
  isNew: boolean;
  onCancel?: () => void;
}) {
  const [rarityValue, setRarityValue] = useState<string>(rarity ?? "");
  const [stockValue, setStockValue] = useState<string>(String(initialStock));
  const [priceValue, setPriceValue] = useState<string>(String(initialPrice));
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const currentStock = Number.parseInt(stockValue, 10);
  const currentPrice = Number.parseFloat(priceValue.replace(",", "."));
  const stockValid = Number.isInteger(currentStock) && currentStock >= 0;
  const priceValid = Number.isFinite(currentPrice) && currentPrice >= 0;
  const rarityValid = rarityValue.length > 0;

  const stockChanged = currentStock !== initialStock;
  const priceChanged = Math.abs(currentPrice - initialPrice) > 0.0001;
  const rarityChanged = rarityValue !== (rarity ?? "");
  const hasChanges = stockChanged || priceChanged || rarityChanged;
  const canSave =
    (isNew
      ? stockValid && priceValid && rarityValid
      : hasChanges && stockValid && priceValid && (rarityValid || !rarityChanged));

  async function save() {
    if (!canSave) return;
    setSaving(true);
    setError(null);
    try {
      const body: Record<string, unknown> = { cardId: card.id, variant };
      if (isNew || stockChanged) body.stock = currentStock;
      if (isNew || priceChanged) body.price = currentPrice;
      if (isNew || rarityChanged) body.rarity = rarityValue;
      const res = await fetch("/api/admin/stock", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json().catch(() => ({}));
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
    <div className="flex flex-col gap-2 min-w-[260px]">
      <div className="flex items-center gap-2 text-sm">
        <label className="text-gray-400 w-12">Rarete</label>
        <select
          value={rarityValue}
          onChange={(e) => setRarityValue(e.target.value)}
          className="flex-1 rounded bg-zinc-900 border border-white/10 text-white px-2 py-1"
        >
          {!rarityValue && <option value="">-- Choisir --</option>}
          {RARITIES.map((r) => (
            <option key={r} value={r}>
              {r}
            </option>
          ))}
        </select>
      </div>
      <div className="flex items-center gap-2 text-sm">
        <label className="text-gray-400 w-12">Stock</label>
        <input
          type="number"
          min={0}
          value={stockValue}
          onChange={(e) => setStockValue(e.target.value)}
          className="w-20 rounded bg-zinc-900 border border-white/10 text-white px-2 py-1"
        />
      </div>
      <div className="flex items-center gap-2 text-sm">
        <label className="text-gray-400 w-12">Prix</label>
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
      <div className="flex items-center gap-2 flex-wrap">
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
          {saved ? "OK" : saving ? "..." : isNew ? "Creer" : "Enregistrer"}
        </button>
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="rounded bg-white/10 hover:bg-white/20 text-white px-3 py-1 text-xs"
          >
            Annuler
          </button>
        )}
        {!isNew && (
          <DeleteButton card={card} variant={variant} onDeleted={() => setSaved(false)} />
        )}
        {error && <span className="text-xs text-red-400">{error}</span>}
      </div>
    </div>
  );
}

function DeleteButton({
  card,
  variant,
  onDeleted,
}: {
  card: Card;
  variant: VariantKey;
  onDeleted?: () => void;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function del() {
    const label = variant === "alt" ? "variante alt" : "variante base";
    const ok = window.confirm(
      `Supprimer la ${label} de ${card.name} ?\n\n` +
        `Cela retire les valeurs personnalisees (rarete, stock, prix) stockees dans la base.\n` +
        `Si cette variante n'existait pas dans le catalogue, elle disparait du site.\n` +
        `Sinon, elle revient aux valeurs du catalogue.`,
    );
    if (!ok) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/stock", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cardId: card.id, variant }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error ?? "Erreur");
      onDeleted?.();
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erreur");
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={del}
        disabled={busy}
        className="rounded bg-red-600/80 hover:bg-red-600 text-white px-3 py-1 text-xs font-medium disabled:opacity-60"
      >
        {busy ? "..." : "Supprimer"}
      </button>
      {error && <span className="text-xs text-red-400">{error}</span>}
    </>
  );
}
