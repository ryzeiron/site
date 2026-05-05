"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import {
  RARITIES,
  RESERVED_VARIANT_KEYS,
  type Card,
  type Rarity,
  type VariantKey,
} from "@/lib/catalog";

type VariantSpec = {
  key: VariantKey;
  label: string; // ex: "Base", "Alt", ou la rarete pour les customs
  rarity: Rarity;
  stock: number;
  price: number;
};

function buildVariants(card: Card): VariantSpec[] {
  const out: VariantSpec[] = [
    {
      key: "base",
      label: "Base",
      rarity: card.rarity,
      stock: card.stock,
      price: card.price,
    },
  ];
  if (card.altVariant) {
    out.push({
      key: "alt",
      label: "Alt",
      rarity: card.altVariant.rarity,
      stock: card.altVariant.stock,
      price: card.altVariant.price,
    });
  }
  if (card.extraVariants) {
    for (const v of card.extraVariants) {
      out.push({
        key: v.key,
        label: v.rarity,
        rarity: v.rarity,
        stock: v.stock,
        price: v.price,
      });
    }
  }
  return out;
}

function slugifyRarity(rarity: string): string {
  return rarity
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 24);
}

function pickUniqueKey(card: Card, rarity: Rarity): string {
  const base = slugifyRarity(rarity) || "variante";
  const usedKeys = new Set<string>(["base", "alt"]);
  if (card.extraVariants) {
    for (const v of card.extraVariants) usedKeys.add(v.key);
  }
  let candidate = base;
  let i = 2;
  while (usedKeys.has(candidate) || RESERVED_VARIANT_KEYS.has(candidate)) {
    candidate = `${base}-${i++}`;
    if (i > 50) break;
  }
  return candidate;
}

export default function AdminStockRow({ card }: { card: Card }) {
  const variants = buildVariants(card);
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingMeta, setEditingMeta] = useState(false);

  return (
    <div className="rounded-lg border border-white/10 bg-zinc-900/50 p-4">
      <div className="flex items-baseline gap-3 mb-3 flex-wrap">
        <span className="text-sm text-gray-400 font-mono">{card.number}</span>
        <span className="text-white font-semibold">{card.name}</span>
        {!editingMeta && (
          <button
            type="button"
            onClick={() => setEditingMeta(true)}
            className="ml-auto text-xs text-violet-300 hover:text-violet-200"
          >
            Modifier les infos
          </button>
        )}
      </div>
      {editingMeta && (
        <div className="mb-3">
          <CardMetaForm card={card} onClose={() => setEditingMeta(false)} />
        </div>
      )}
      <div className="flex flex-wrap gap-3">
        {variants.map((v) => (
          <VariantCell
            key={v.key}
            card={card}
            variantKey={v.key}
            label={v.label}
            rarity={v.rarity}
            initialStock={v.stock}
            initialPrice={v.price}
            isNew={false}
          />
        ))}
        {showAddForm ? (
          <NewVariantForm
            card={card}
            onCancel={() => setShowAddForm(false)}
          />
        ) : (
          <button
            type="button"
            onClick={() => setShowAddForm(true)}
            className="self-start rounded border border-dashed border-white/20 text-gray-300 hover:text-white hover:border-white/40 px-3 py-2 text-sm"
          >
            + Ajouter une variante
          </button>
        )}
      </div>
    </div>
  );
}

function CardMetaForm({ card, onClose }: { card: Card; onClose: () => void }) {
  const router = useRouter();
  const [name, setName] = useState(card.name);
  const [image, setImage] = useState(card.image ?? "");
  const [imageBack, setImageBack] = useState(card.imageBack ?? "");
  const [description, setDescription] = useState(card.description ?? "");
  const [weight, setWeight] = useState(
    card.weightGrams !== undefined ? String(card.weightGrams) : "",
  );
  const [saving, setSaving] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const initialWeight =
    card.weightGrams !== undefined ? String(card.weightGrams) : "";
  const changed =
    name !== card.name ||
    image !== (card.image ?? "") ||
    imageBack !== (card.imageBack ?? "") ||
    description !== (card.description ?? "") ||
    weight !== initialWeight;
  const weightParsed = weight.trim() === "" ? null : Number.parseInt(weight, 10);
  const weightValid =
    weightParsed === null ||
    (Number.isInteger(weightParsed) && weightParsed >= 0);
  const canSave = changed && name.trim().length > 0 && weightValid;

  async function save() {
    if (!canSave) return;
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/card", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          cardId: card.id,
          name,
          image,
          imageBack,
          description,
          weightGrams: weightParsed,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error ?? "Erreur");
      onClose();
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erreur");
    } finally {
      setSaving(false);
    }
  }

  async function reset() {
    const ok = window.confirm(
      `Reinitialiser ${card.name} aux valeurs du catalogue ?\n\nCela retire les infos personnalisees (nom, image, description) stockees dans la base.`,
    );
    if (!ok) return;
    setResetting(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/card", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cardId: card.id }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error ?? "Erreur");
      onClose();
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erreur");
    } finally {
      setResetting(false);
    }
  }

  return (
    <div className="rounded-lg border border-violet-400/40 bg-zinc-900/80 p-3 space-y-2">
      <div className="text-xs uppercase text-violet-300 font-semibold tracking-wider">
        Modifier les infos
      </div>
      <div className="flex items-center gap-2 text-sm">
        <label className="text-gray-400 w-24 shrink-0">Nom</label>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="flex-1 rounded bg-zinc-900 border border-white/10 text-white px-2 py-1"
        />
      </div>
      <div className="flex items-center gap-2 text-sm">
        <label className="text-gray-400 w-24 shrink-0">Image (devant)</label>
        <input
          type="text"
          value={image}
          onChange={(e) => setImage(e.target.value)}
          placeholder="/cartes/serie/numero.webp"
          className="flex-1 rounded bg-zinc-900 border border-white/10 text-white px-2 py-1"
        />
      </div>
      <div className="flex items-center gap-2 text-sm">
        <label className="text-gray-400 w-24 shrink-0">Image (dos)</label>
        <input
          type="text"
          value={imageBack}
          onChange={(e) => setImageBack(e.target.value)}
          placeholder="/cartes/serie/numero-dos.webp (optionnel)"
          className="flex-1 rounded bg-zinc-900 border border-white/10 text-white px-2 py-1"
        />
      </div>
      <div className="flex items-start gap-2 text-sm">
        <label className="text-gray-400 w-24 shrink-0 pt-1">Description</label>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={2}
          className="flex-1 rounded bg-zinc-900 border border-white/10 text-white px-2 py-1"
        />
      </div>
      <div className="flex items-center gap-2 text-sm">
        <label className="text-gray-400 w-24 shrink-0">Poids</label>
        <input
          type="number"
          min={0}
          value={weight}
          onChange={(e) => setWeight(e.target.value)}
          placeholder="5 (defaut)"
          className="w-24 rounded bg-zinc-900 border border-white/10 text-white px-2 py-1"
        />
        <span className="text-gray-500 text-xs">grammes</span>
      </div>
      <div className="flex items-center gap-2 flex-wrap">
        <button
          type="button"
          onClick={save}
          disabled={!canSave || saving}
          className={`rounded px-3 py-1 text-xs font-medium transition ${
            canSave
              ? "bg-brand-500 hover:bg-brand-600 text-white"
              : "bg-white/10 text-gray-400 cursor-not-allowed"
          }`}
        >
          {saving ? "..." : "Enregistrer"}
        </button>
        <button
          type="button"
          onClick={onClose}
          className="rounded bg-white/10 hover:bg-white/20 text-white px-3 py-1 text-xs"
        >
          Annuler
        </button>
        <button
          type="button"
          onClick={reset}
          disabled={resetting}
          className="rounded bg-red-600/80 hover:bg-red-600 text-white px-3 py-1 text-xs font-medium disabled:opacity-60 ml-auto"
          title="Retire les infos personnalisees, revient au catalogue"
        >
          {resetting ? "..." : "Reset au catalogue"}
        </button>
        {error && <span className="text-xs text-red-400">{error}</span>}
      </div>
    </div>
  );
}

function NewVariantForm({
  card,
  onCancel,
}: {
  card: Card;
  onCancel: () => void;
}) {
  const router = useRouter();
  const [rarityValue, setRarityValue] = useState<string>("");
  const [stockValue, setStockValue] = useState<string>("0");
  const [priceValue, setPriceValue] = useState<string>(String(card.price));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const stock = Number.parseInt(stockValue, 10);
  const price = Number.parseFloat(priceValue.replace(",", "."));
  const valid =
    !!rarityValue &&
    Number.isInteger(stock) &&
    stock >= 0 &&
    Number.isFinite(price) &&
    price >= 0;

  async function create() {
    if (!valid) return;
    setSaving(true);
    setError(null);
    try {
      const key = pickUniqueKey(card, rarityValue as Rarity);
      const res = await fetch("/api/admin/stock", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          cardId: card.id,
          variant: key,
          stock,
          price,
          rarity: rarityValue,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error ?? "Erreur");
      onCancel();
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erreur");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="rounded-lg border border-violet-400/40 bg-zinc-900/80 p-3 flex flex-col gap-2 min-w-[260px]">
      <div className="text-xs uppercase text-violet-300 font-semibold tracking-wider">
        Nouvelle variante
      </div>
      <div className="flex items-center gap-2 text-sm">
        <label className="text-gray-400 w-12">Rarete</label>
        <select
          value={rarityValue}
          onChange={(e) => setRarityValue(e.target.value)}
          className="flex-1 rounded bg-zinc-900 border border-white/10 text-white px-2 py-1"
        >
          <option value="">-- Choisir --</option>
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
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={create}
          disabled={!valid || saving}
          className={`rounded px-3 py-1 text-xs font-medium transition ${
            valid
              ? "bg-brand-500 hover:bg-brand-600 text-white"
              : "bg-white/10 text-gray-400 cursor-not-allowed"
          }`}
        >
          {saving ? "..." : "Creer"}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="rounded bg-white/10 hover:bg-white/20 text-white px-3 py-1 text-xs"
        >
          Annuler
        </button>
        {error && <span className="text-xs text-red-400">{error}</span>}
      </div>
    </div>
  );
}

function VariantCell({
  card,
  variantKey,
  label,
  rarity,
  initialStock,
  initialPrice,
  isNew,
}: {
  card: Card;
  variantKey: VariantKey;
  label: string;
  rarity: Rarity;
  initialStock: number;
  initialPrice: number;
  isNew: boolean;
}) {
  const router = useRouter();
  const [rarityValue, setRarityValue] = useState<string>(rarity);
  const [stockValue, setStockValue] = useState<string>(String(initialStock));
  const [priceValue, setPriceValue] = useState<string>(String(initialPrice));
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setRarityValue(rarity);
    setStockValue(String(initialStock));
    setPriceValue(String(initialPrice));
    setError(null);
  }, [rarity, initialStock, initialPrice]);

  const currentStock = Number.parseInt(stockValue, 10);
  const currentPrice = Number.parseFloat(priceValue.replace(",", "."));
  const stockValid = Number.isInteger(currentStock) && currentStock >= 0;
  const priceValid = Number.isFinite(currentPrice) && currentPrice >= 0;

  const stockChanged = currentStock !== initialStock;
  const priceChanged = Math.abs(currentPrice - initialPrice) > 0.0001;
  const rarityChanged = rarityValue !== rarity;
  const hasChanges = stockChanged || priceChanged || rarityChanged;
  const canSave = hasChanges && stockValid && priceValid;

  async function save() {
    if (!canSave) return;
    setSaving(true);
    setError(null);
    try {
      const body: Record<string, unknown> = { cardId: card.id, variant: variantKey };
      if (stockChanged) body.stock = currentStock;
      if (priceChanged) body.price = currentPrice;
      if (rarityChanged) body.rarity = rarityValue;
      const res = await fetch("/api/admin/stock", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error ?? "Erreur");
      setSaved(true);
      setTimeout(() => setSaved(false), 1500);
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erreur");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="rounded-lg border border-white/10 bg-zinc-900/60 p-3 flex flex-col gap-2 min-w-[240px]">
      <div className="flex items-center gap-2 text-xs">
        <span className="rounded bg-violet-500/20 text-violet-300 px-2 py-0.5 uppercase tracking-wider font-semibold">
          {label}
        </span>
        <span className="text-gray-500 font-mono text-[10px]">
          {variantKey}
        </span>
      </div>
      <div className="flex items-center gap-2 text-sm">
        <label className="text-gray-400 w-12">Rarete</label>
        <select
          value={rarityValue}
          onChange={(e) => setRarityValue(e.target.value)}
          className="flex-1 rounded bg-zinc-900 border border-white/10 text-white px-2 py-1"
        >
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
          {saved ? "OK" : saving ? "..." : "Enregistrer"}
        </button>
        {!isNew && hasChanges && (
          <button
            type="button"
            onClick={() => {
              setRarityValue(rarity);
              setStockValue(String(initialStock));
              setPriceValue(String(initialPrice));
              setError(null);
            }}
            className="rounded bg-white/10 hover:bg-white/20 text-white px-3 py-1 text-xs"
          >
            Annuler
          </button>
        )}
        {!isNew && (
          <DeleteButton card={card} variant={variantKey} label={label} />
        )}
        {error && <span className="text-xs text-red-400">{error}</span>}
      </div>
    </div>
  );
}

function DeleteButton({
  card,
  variant,
  label,
}: {
  card: Card;
  variant: VariantKey;
  label: string;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function del() {
    const ok = window.confirm(
      `Supprimer la variante ${label} de ${card.name} ?\n\n` +
        `Cela retire les valeurs personnalisees stockees dans la base.\n` +
        `Si la variante n'existait pas dans le catalogue, elle disparait du site.\n` +
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
