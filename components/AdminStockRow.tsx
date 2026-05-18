"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import {
  CONDITIONS,
  RARITIES,
  RESERVED_VARIANT_KEYS,
  getCard,
  isVariantHidden,
  listVariants,
  type Card,
  type Condition,
  type Rarity,
  type VariantKey,
} from "@/lib/catalog";
import { formatRarityLabel } from "@/lib/display-variants";

type VariantSpec = {
  key: VariantKey;
  label: string;
  rarity: Rarity;
  condition: Condition;
  stock: number;
  price: number;
  hidden: boolean;
  fromCatalog: boolean;
};

function buildVariants(card: Card): VariantSpec[] {
  const catalogCard = getCard(card.id);
  const catalogKeys = new Set(
    catalogCard
      ? listVariants(catalogCard, { includeHidden: true }).map(({ key }) => key)
      : ["base"],
  );

  return listVariants(card, { includeHidden: true }).map(({ key, variant }) => ({
    key,
    label: key === "base" ? "Base" : key === "alt" ? "Alt" : formatRarityLabel(variant.rarity),
    rarity: variant.rarity,
    condition: variant.condition ?? card.condition,
    stock: variant.stock,
    price: variant.price,
    hidden: isVariantHidden(card, key),
    fromCatalog: catalogKeys.has(key),
  }));
}

function slugifyRarity(rarity: string): string {
  return rarity
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
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
      <div className="mb-3 flex flex-wrap items-baseline gap-3">
        <span className="font-mono text-sm text-gray-400">{card.number}</span>
        <span className="font-semibold text-white">{card.name}</span>

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
            initialCondition={v.condition}
            initialStock={v.stock}
            initialPrice={v.price}
            hidden={v.hidden}
            fromCatalog={v.fromCatalog}
            isNew={false}
          />
        ))}

        {showAddForm ? (
          <NewVariantForm card={card} onCancel={() => setShowAddForm(false)} />
        ) : (
          <button
            type="button"
            onClick={() => setShowAddForm(true)}
            className="self-start rounded border border-dashed border-white/20 px-3 py-2 text-sm text-gray-300 hover:border-white/40 hover:text-white"
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
  const [saving, setSaving] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const changed =
    name !== card.name ||
    image !== (card.image ?? "") ||
    imageBack !== (card.imageBack ?? "") ||
    description !== (card.description ?? "");

  const canSave = changed && name.trim().length > 0;

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
      `Réinitialiser ${card.name} aux valeurs du catalogue ?\n\nCela retire les infos personnalisées stockées dans la base.`,
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
    <div className="space-y-2 rounded-lg border border-violet-400/40 bg-zinc-900/80 p-3">
      <div className="text-xs font-semibold uppercase tracking-wider text-violet-300">
        Modifier les infos
      </div>

      <div className="flex items-center gap-2 text-sm">
        <label className="w-24 shrink-0 text-gray-400">Nom</label>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="flex-1 rounded border border-white/10 bg-zinc-900 px-2 py-1 text-white"
        />
      </div>

      <div className="flex items-center gap-2 text-sm">
        <label className="w-24 shrink-0 text-gray-400">Image devant</label>
        <input
          type="text"
          value={image}
          onChange={(e) => setImage(e.target.value)}
          placeholder="/cartes/serie/numero.webp"
          className="flex-1 rounded border border-white/10 bg-zinc-900 px-2 py-1 text-white"
        />
      </div>

      <div className="flex items-center gap-2 text-sm">
        <label className="w-24 shrink-0 text-gray-400">Image dos</label>
        <input
          type="text"
          value={imageBack}
          onChange={(e) => setImageBack(e.target.value)}
          placeholder="/cartes/serie/numero-dos.webp"
          className="flex-1 rounded border border-white/10 bg-zinc-900 px-2 py-1 text-white"
        />
      </div>

      <div className="flex items-start gap-2 text-sm">
        <label className="w-24 shrink-0 pt-1 text-gray-400">Description</label>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={2}
          className="flex-1 rounded border border-white/10 bg-zinc-900 px-2 py-1 text-white"
        />
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={save}
          disabled={!canSave || saving}
          className={`rounded px-3 py-1 text-xs font-medium transition ${
            canSave
              ? "bg-brand-500 text-white hover:bg-brand-600"
              : "cursor-not-allowed bg-white/10 text-gray-400"
          }`}
        >
          {saving ? "..." : "Enregistrer"}
        </button>

        <button
          type="button"
          onClick={onClose}
          className="rounded bg-white/10 px-3 py-1 text-xs text-white hover:bg-white/20"
        >
          Annuler
        </button>

        <button
          type="button"
          onClick={reset}
          disabled={resetting}
          className="ml-auto rounded bg-red-600/80 px-3 py-1 text-xs font-medium text-white hover:bg-red-600 disabled:opacity-60"
          title="Retire les infos personnalisées et revient au catalogue"
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
  const [conditionValue, setConditionValue] = useState<Condition>(card.condition);
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
          condition: conditionValue,
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
    <div className="flex min-w-[260px] flex-col gap-2 rounded-lg border border-violet-400/40 bg-zinc-900/80 p-3">
      <div className="text-xs font-semibold uppercase tracking-wider text-violet-300">
        Nouvelle variante
      </div>

      <div className="flex items-center gap-2 text-sm">
        <label className="w-12 text-gray-400">Rareté</label>
        <select
          value={rarityValue}
          onChange={(e) => setRarityValue(e.target.value)}
          className="flex-1 rounded border border-white/10 bg-zinc-900 px-2 py-1 text-white"
        >
          <option value="">-- Choisir --</option>
          {RARITIES.map((r) => (
            <option key={r} value={r}>
              {formatRarityLabel(r)}
            </option>
          ))}
        </select>
      </div>

      <div className="flex items-center gap-2 text-sm">
        <label className="w-12 text-gray-400">État</label>
        <select
          value={conditionValue}
          onChange={(e) => setConditionValue(e.target.value as Condition)}
          className="flex-1 rounded border border-white/10 bg-zinc-900 px-2 py-1 text-white"
        >
          {CONDITIONS.map((value) => (
            <option key={value} value={value}>
              {value}
            </option>
          ))}
        </select>
      </div>

      <div className="flex items-center gap-2 text-sm">
        <label className="w-12 text-gray-400">Stock</label>
        <input
          type="number"
          min={0}
          value={stockValue}
          onChange={(e) => setStockValue(e.target.value)}
          className="w-20 rounded border border-white/10 bg-zinc-900 px-2 py-1 text-white"
        />
      </div>

      <div className="flex items-center gap-2 text-sm">
        <label className="w-12 text-gray-400">Prix</label>
        <input
          type="number"
          min={0}
          step="0.01"
          value={priceValue}
          onChange={(e) => setPriceValue(e.target.value)}
          className="w-24 rounded border border-white/10 bg-zinc-900 px-2 py-1 text-white"
        />
        <span className="text-xs text-gray-500">€</span>
      </div>

      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={create}
          disabled={!valid || saving}
          className={`rounded px-3 py-1 text-xs font-medium transition ${
            valid
              ? "bg-brand-500 text-white hover:bg-brand-600"
              : "cursor-not-allowed bg-white/10 text-gray-400"
          }`}
        >
          {saving ? "..." : "Créer"}
        </button>

        <button
          type="button"
          onClick={onCancel}
          className="rounded bg-white/10 px-3 py-1 text-xs text-white hover:bg-white/20"
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
  initialCondition,
  initialStock,
  initialPrice,
  hidden,
  fromCatalog,
  isNew,
}: {
  card: Card;
  variantKey: VariantKey;
  label: string;
  rarity: Rarity;
  initialCondition: Condition;
  initialStock: number;
  initialPrice: number;
  hidden: boolean;
  fromCatalog: boolean;
  isNew: boolean;
}) {
  const router = useRouter();
  const [rarityValue, setRarityValue] = useState<string>(rarity);
  const [conditionValue, setConditionValue] =
    useState<Condition>(initialCondition);
  const [stockValue, setStockValue] = useState<string>(String(initialStock));
  const [priceValue, setPriceValue] = useState<string>(String(initialPrice));
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setRarityValue(rarity);
    setConditionValue(initialCondition);
    setStockValue(String(initialStock));
    setPriceValue(String(initialPrice));
    setError(null);
  }, [rarity, initialCondition, initialStock, initialPrice]);

  const currentStock = Number.parseInt(stockValue, 10);
  const currentPrice = Number.parseFloat(priceValue.replace(",", "."));
  const stockValid = Number.isInteger(currentStock) && currentStock >= 0;
  const priceValid = Number.isFinite(currentPrice) && currentPrice >= 0;

  const stockChanged = currentStock !== initialStock;
  const priceChanged = Math.abs(currentPrice - initialPrice) > 0.0001;
  const rarityChanged = rarityValue !== rarity;
  const conditionChanged = conditionValue !== initialCondition;
  const hasChanges =
    stockChanged || priceChanged || rarityChanged || conditionChanged;
  const canSave = hasChanges && stockValid && priceValid;

  async function save() {
    if (!canSave) return;

    setSaving(true);
    setError(null);

    try {
      const body: Record<string, unknown> = {
        cardId: card.id,
        variant: variantKey,
      };

      if (stockChanged) body.stock = currentStock;
      if (priceChanged) body.price = currentPrice;
      if (rarityChanged) body.rarity = rarityValue;
      if (conditionChanged) body.condition = conditionValue;

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
    <div
      className={`flex min-w-[240px] flex-col gap-2 rounded-lg border p-3 ${
        hidden
          ? "border-amber-400/40 bg-amber-950/20"
          : "border-white/10 bg-zinc-900/60"
      }`}
    >
      <div className="flex items-center gap-2 text-xs">
        <span className="rounded bg-violet-500/20 px-2 py-0.5 font-semibold uppercase tracking-wider text-violet-300">
          {label}
        </span>
        <span className="font-mono text-[10px] text-gray-500">
          {variantKey}
        </span>
        {hidden && (
          <span className="rounded bg-amber-500/20 px-2 py-0.5 font-semibold uppercase tracking-wider text-amber-300">
            Masquée
          </span>
        )}
      </div>

      <div className="flex items-center gap-2 text-sm">
        <label className="w-12 text-gray-400">Rareté</label>
        <select
          value={rarityValue}
          onChange={(e) => setRarityValue(e.target.value)}
          className="flex-1 rounded border border-white/10 bg-zinc-900 px-2 py-1 text-white"
        >
          {RARITIES.map((r) => (
            <option key={r} value={r}>
              {formatRarityLabel(r)}
            </option>
          ))}
        </select>
      </div>

      <div className="flex items-center gap-2 text-sm">
        <label className="w-12 text-gray-400">État</label>
        <select
          value={conditionValue}
          onChange={(e) => setConditionValue(e.target.value as Condition)}
          className="flex-1 rounded border border-white/10 bg-zinc-900 px-2 py-1 text-white"
        >
          {CONDITIONS.map((value) => (
            <option key={value} value={value}>
              {value}
            </option>
          ))}
        </select>
      </div>

      <div className="flex items-center gap-2 text-sm">
        <label className="w-12 text-gray-400">Stock</label>
        <input
          type="number"
          min={0}
          value={stockValue}
          onChange={(e) => setStockValue(e.target.value)}
          className="w-20 rounded border border-white/10 bg-zinc-900 px-2 py-1 text-white"
        />
      </div>

      <div className="flex items-center gap-2 text-sm">
        <label className="w-12 text-gray-400">Prix</label>
        <input
          type="number"
          min={0}
          step="0.01"
          value={priceValue}
          onChange={(e) => setPriceValue(e.target.value)}
          className="w-24 rounded border border-white/10 bg-zinc-900 px-2 py-1 text-white"
        />
        <span className="text-xs text-gray-500">€</span>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={save}
          disabled={!canSave || saving}
          className={`rounded px-3 py-1 text-xs font-medium transition ${
            saved
              ? "bg-emerald-500 text-white"
              : canSave
                ? "bg-brand-500 text-white hover:bg-brand-600"
                : "cursor-not-allowed bg-white/10 text-gray-400"
          }`}
        >
          {saved ? "OK" : saving ? "..." : "Enregistrer"}
        </button>

        {!isNew && hasChanges && (
          <button
            type="button"
            onClick={() => {
              setRarityValue(rarity);
              setConditionValue(initialCondition);
              setStockValue(String(initialStock));
              setPriceValue(String(initialPrice));
              setError(null);
            }}
            className="rounded bg-white/10 px-3 py-1 text-xs text-white hover:bg-white/20"
          >
            Annuler
          </button>
        )}

        {!isNew && (
          <VariantActionButtons
            card={card}
            variant={variantKey}
            label={label}
            hidden={hidden}
            fromCatalog={fromCatalog}
          />
        )}

        {error && <span className="text-xs text-red-400">{error}</span>}
      </div>
    </div>
  );
}

function VariantActionButtons({
  card,
  variant,
  label,
  hidden,
  fromCatalog,
}: {
  card: Card;
  variant: VariantKey;
  label: string;
  hidden: boolean;
  fromCatalog: boolean;
}) {
  const router = useRouter();
  const [visibilityBusy, setVisibilityBusy] = useState(false);
  const [deleteBusy, setDeleteBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function setHidden(nextHidden: boolean) {
    const ok = window.confirm(
      `${nextHidden ? "Supprimer" : "Restaurer"} la variante ${label} de ${card.name} ?\n\n` +
        (nextHidden
          ? `Elle sera cachée du site sans modifier son stock ni son prix.`
          : `Elle sera de nouveau visible sur le site.`),
    );

    if (!ok) return;

    setVisibilityBusy(true);
    setError(null);

    try {
      const res = await fetch("/api/admin/variant-visibility", {
        method: nextHidden ? "POST" : "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cardId: card.id, variant }),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error ?? "Erreur");

      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erreur");
    } finally {
      setVisibilityBusy(false);
    }
  }

  async function deleteCustomVariant() {
    const ok = window.confirm(
      `Supprimer définitivement la variante ${label} de ${card.name} ?\n\n` +
        `Cela retire cette variante ajoutée manuellement.`,
    );

    if (!ok) return;

    setDeleteBusy(true);
    setError(null);

    try {
      const res = await fetch("/api/admin/stock", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cardId: card.id, variant }),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error ?? "Erreur");

      await fetch("/api/admin/variant-visibility", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cardId: card.id, variant }),
      }).catch(() => {});

      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erreur");
    } finally {
      setDeleteBusy(false);
    }
  }

  const busy = visibilityBusy || deleteBusy;

  return (
    <>
      {hidden ? (
        <button
          type="button"
          onClick={() => setHidden(false)}
          disabled={busy}
          className="rounded bg-emerald-600/80 px-3 py-1 text-xs font-medium text-white hover:bg-emerald-600 disabled:opacity-60"
        >
          {visibilityBusy ? "..." : "Restaurer"}
        </button>
      ) : (
        <button
          type="button"
          onClick={() => (fromCatalog ? setHidden(true) : deleteCustomVariant())}
          disabled={busy}
          className="rounded bg-red-600/80 px-3 py-1 text-xs font-medium text-white hover:bg-red-600 disabled:opacity-60"
        >
          {busy ? "..." : "Supprimer"}
        </button>
      )}

      {hidden && !fromCatalog && (
        <button
          type="button"
          onClick={deleteCustomVariant}
          disabled={busy}
          className="rounded bg-red-600/80 px-3 py-1 text-xs font-medium text-white hover:bg-red-600 disabled:opacity-60"
        >
          {deleteBusy ? "..." : "Supprimer"}
        </button>
      )}

      {error && <span className="text-xs text-red-400">{error}</span>}
    </>
  );
}
