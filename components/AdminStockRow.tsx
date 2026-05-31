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
import { useAdminStockBatch, type PendingStockUpdate } from "@/components/AdminStockBatchContext";

type VariantSpec = {
  key: VariantKey;
  label: string;
  rarity: Rarity;
  condition: Condition;
  stock: number;
  price: number;
  hidden: boolean;
  fromCatalog: boolean;
  modified: boolean;
};

function buildVariants(card: Card): VariantSpec[] {
  const catalogCard = getCard(card.id);
  const catalogVariants = new Map(
    catalogCard
      ? listVariants(catalogCard, { includeHidden: true }).map(({ key, variant }) => [
          key,
          variant,
        ])
      : [],
  );
  const listedVariants = listVariants(card, { includeHidden: true });
  const conditionsByRarity = new Map<Rarity, Set<Condition>>();

  for (const { variant } of listedVariants) {
    const condition = variant.condition ?? card.condition;
    const conditions = conditionsByRarity.get(variant.rarity) ?? new Set<Condition>();
    conditions.add(condition);
    conditionsByRarity.set(variant.rarity, conditions);
  }

  return listedVariants.map(({ key, variant }) => {
    const catalogVariant = catalogVariants.get(key);
    const condition = variant.condition ?? card.condition;
    const catalogCondition =
      catalogVariant && catalogCard
        ? catalogVariant.condition ?? catalogCard.condition
        : undefined;
    const hidden = isVariantHidden(card, key);
    const fromCatalog = catalogVariants.has(key);
    const modified =
      hidden ||
      !fromCatalog ||
      !catalogVariant ||
      variant.stock !== catalogVariant.stock ||
      Math.abs(variant.price - catalogVariant.price) > 0.0001 ||
      variant.rarity !== catalogVariant.rarity ||
      condition !== catalogCondition;

    const rarityLabel = formatRarityLabel(variant.rarity);
    const hasSameRarityWithOtherCondition =
      (conditionsByRarity.get(variant.rarity)?.size ?? 0) > 1;
    const detailedLabel = hasSameRarityWithOtherCondition
      ? `${rarityLabel} - ${condition}`
      : rarityLabel;

    return {
      key,
      label:
        key === "base"
          ? hasSameRarityWithOtherCondition
            ? `Base - ${detailedLabel}`
            : "Base"
          : key === "alt"
            ? hasSameRarityWithOtherCondition
              ? `Alt - ${detailedLabel}`
              : "Alt"
            : detailedLabel,
      rarity: variant.rarity,
      condition,
      stock: variant.stock,
      price: variant.price,
      hidden,
      fromCatalog,
      modified,
    };
  });
}

function slugifyValue(value: string): string {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 24);
}

function pickUniqueKey(card: Card, rarity: Rarity, condition: Condition): string {
  const base = slugifyValue(`${rarity}-${condition}`) || "variante";
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

function stockBadgeClass(stock: number, hidden: boolean) {
  if (hidden) return "border-amber-400/40 bg-amber-500/15 text-amber-200";
  if (stock <= 0) return "border-red-400/40 bg-red-500/15 text-red-200";
  if (stock <= 2) return "border-orange-400/40 bg-orange-500/15 text-orange-200";
  return "border-emerald-400/40 bg-emerald-500/15 text-emerald-200";
}

function stockLabel(stock: number, hidden: boolean) {
  if (hidden) return "Masquée";
  if (stock <= 0) return "Rupture";
  if (stock <= 2) return "Stock faible";
  return "Disponible";
}

export default function AdminStockRow({ card }: { card: Card }) {
  const variants = buildVariants(card);
  const totalStock = variants.reduce((total, variant) => total + variant.stock, 0);
  const hiddenCount = variants.filter((variant) => variant.hidden).length;
  const modifiedCount = variants.filter((variant) => variant.modified).length;
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingMeta, setEditingMeta] = useState(false);

  return (
    <section className="overflow-hidden rounded-lg border border-white/10 bg-zinc-950/55 text-gray-200">
      <div className="flex flex-wrap items-start justify-between gap-3 border-b border-white/10 bg-white/[0.03] p-4">
        <div className="flex min-w-0 gap-3">
          <div className="relative hidden h-16 w-12 shrink-0 overflow-hidden rounded border border-white/10 bg-zinc-950 sm:block">
            {card.image ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={card.image} alt={card.name} className="h-full w-full object-contain" />
            ) : null}
          </div>

          <div className="min-w-0">
            <div className="font-mono text-xs text-gray-500">{card.number}</div>
            <h3 className="truncate text-lg font-bold text-white">{card.name}</h3>
            <div className="mt-2 flex flex-wrap gap-2 text-xs">
              <span className={`rounded-full border px-2 py-1 ${stockBadgeClass(totalStock, false)}`}>
                {totalStock} en stock
              </span>
              <span className="rounded-full border border-violet-300/30 bg-violet-500/15 px-2 py-1 text-violet-200">
                {variants.length} variante{variants.length > 1 ? "s" : ""}
              </span>
              {hiddenCount > 0 ? (
                <span className="rounded-full border border-amber-300/30 bg-amber-500/15 px-2 py-1 text-amber-200">
                  {hiddenCount} masquée{hiddenCount > 1 ? "s" : ""}
                </span>
              ) : null}
              {modifiedCount > 0 ? (
                <span className="rounded-full border border-fuchsia-300/30 bg-fuchsia-500/15 px-2 py-1 text-fuchsia-200">
                  {modifiedCount} modifiée{modifiedCount > 1 ? "s" : ""}
                </span>
              ) : null}
            </div>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setEditingMeta((value) => !value)}
            className="rounded bg-white/10 px-3 py-2 text-xs font-medium text-white hover:bg-white/20"
          >
            {editingMeta ? "Fermer les infos" : "Modifier les infos"}
          </button>
          <button
            type="button"
            onClick={() => setShowAddForm((value) => !value)}
            className="rounded bg-violet-600 px-3 py-2 text-xs font-medium text-white hover:bg-violet-700"
          >
            {showAddForm ? "Fermer ajout" : "+ Variante"}
          </button>
        </div>
      </div>

      {editingMeta ? (
        <div className="border-b border-white/10 p-4">
          <CardMetaForm card={card} onClose={() => setEditingMeta(false)} />
        </div>
      ) : null}

      <div className="overflow-x-auto">
        <table className="w-full min-w-[980px] text-left text-sm">
          <thead className="bg-black/20 text-xs uppercase tracking-[0.14em] text-gray-500">
            <tr>
              <th className="px-4 py-3 font-semibold">Carte</th>
              <th className="px-4 py-3 font-semibold">Variante</th>
              <th className="px-4 py-3 font-semibold">Rareté</th>
              <th className="px-4 py-3 font-semibold">État</th>
              <th className="px-4 py-3 font-semibold">Stock</th>
              <th className="px-4 py-3 font-semibold">Prix</th>
              <th className="px-4 py-3 font-semibold">Statut</th>
              <th className="px-4 py-3 font-semibold">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/10">
            {variants.map((variant, index) => (
              <VariantRow
                key={variant.key}
                card={card}
                variant={variant}
                showCardCell={index === 0}
                cardRowSpan={variants.length}
              />
            ))}
          </tbody>
        </table>
      </div>

      {showAddForm ? (
        <div className="border-t border-white/10 p-4">
          <NewVariantForm card={card} onCancel={() => setShowAddForm(false)} />
        </div>
      ) : null}
    </section>
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
    <div className="space-y-3 rounded-lg border border-violet-400/40 bg-zinc-900/80 p-3">
      <div className="text-xs font-semibold uppercase tracking-wider text-violet-300">
        Modifier les infos de la carte
      </div>

      <div className="grid gap-3 lg:grid-cols-2">
        <label className="text-sm">
          <span className="mb-1 block text-gray-400">Nom</span>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full rounded border border-white/10 bg-zinc-950 px-3 py-2 text-white"
          />
        </label>

        <label className="text-sm">
          <span className="mb-1 block text-gray-400">Image devant</span>
          <input
            type="text"
            value={image}
            onChange={(e) => setImage(e.target.value)}
            placeholder="/cartes/serie/numero.webp"
            className="w-full rounded border border-white/10 bg-zinc-950 px-3 py-2 text-white"
          />
        </label>

        <label className="text-sm">
          <span className="mb-1 block text-gray-400">Image dos</span>
          <input
            type="text"
            value={imageBack}
            onChange={(e) => setImageBack(e.target.value)}
            placeholder="/cartes/serie/numero-dos.webp"
            className="w-full rounded border border-white/10 bg-zinc-950 px-3 py-2 text-white"
          />
        </label>

        <label className="text-sm">
          <span className="mb-1 block text-gray-400">Description</span>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={2}
            className="w-full rounded border border-white/10 bg-zinc-950 px-3 py-2 text-white"
          />
        </label>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={save}
          disabled={!canSave || saving}
          className={`rounded px-3 py-2 text-xs font-medium transition ${
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
          className="rounded bg-white/10 px-3 py-2 text-xs text-white hover:bg-white/20"
        >
          Annuler
        </button>

        <button
          type="button"
          onClick={reset}
          disabled={resetting}
          className="ml-auto rounded bg-red-600/80 px-3 py-2 text-xs font-medium text-white hover:bg-red-600 disabled:opacity-60"
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
      const key = pickUniqueKey(card, rarityValue as Rarity, conditionValue);

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
    <div className="rounded-lg border border-dashed border-violet-400/50 bg-violet-500/10 p-3">
      <div className="mb-3 text-xs font-semibold uppercase tracking-wider text-violet-200">
        Nouvelle variante
      </div>

      <div className="grid gap-3 md:grid-cols-[1fr_1fr_7rem_8rem_auto] md:items-end">
        <label className="text-sm">
          <span className="mb-1 block text-gray-400">Rareté</span>
          <select
            value={rarityValue}
            onChange={(e) => setRarityValue(e.target.value)}
            className="w-full rounded border border-white/10 bg-zinc-950 px-3 py-2 text-white"
          >
            <option value="">-- Choisir --</option>
            {RARITIES.map((r) => (
              <option key={r} value={r}>
                {formatRarityLabel(r)}
              </option>
            ))}
          </select>
        </label>

        <label className="text-sm">
          <span className="mb-1 block text-gray-400">État</span>
          <select
            value={conditionValue}
            onChange={(e) => setConditionValue(e.target.value as Condition)}
            className="w-full rounded border border-white/10 bg-zinc-950 px-3 py-2 text-white"
          >
            {CONDITIONS.map((value) => (
              <option key={value} value={value}>
                {value}
              </option>
            ))}
          </select>
        </label>

        <label className="text-sm">
          <span className="mb-1 block text-gray-400">Stock</span>
          <input
            type="number"
            min={0}
            value={stockValue}
            onChange={(e) => setStockValue(e.target.value)}
            className="w-full rounded border border-white/10 bg-zinc-950 px-3 py-2 text-white"
          />
        </label>

        <label className="text-sm">
          <span className="mb-1 block text-gray-400">Prix</span>
          <input
            type="number"
            min={0}
            step="0.01"
            value={priceValue}
            onChange={(e) => setPriceValue(e.target.value)}
            className="w-full rounded border border-white/10 bg-zinc-950 px-3 py-2 text-white"
          />
        </label>

        <div className="flex gap-2">
          <button
            type="button"
            onClick={create}
            disabled={!valid || saving}
            className={`rounded px-3 py-2 text-xs font-medium transition ${
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
            className="rounded bg-white/10 px-3 py-2 text-xs text-white hover:bg-white/20"
          >
            Annuler
          </button>
        </div>
      </div>

      {error && <div className="mt-2 text-xs text-red-300">{error}</div>}
    </div>
  );
}

function VariantRow({
  card,
  variant,
  showCardCell,
  cardRowSpan,
}: {
  card: Card;
  variant: VariantSpec;
  showCardCell: boolean;
  cardRowSpan: number;
}) {
  const { getPendingUpdate, setPendingUpdate, clearPendingUpdate, syncingAfterSave } =
    useAdminStockBatch();
  const pendingUpdate = getPendingUpdate(card.id, variant.key);
  const [rarityValue, setRarityValue] = useState<string>(variant.rarity);
  const [conditionValue, setConditionValue] = useState<Condition>(
    variant.condition,
  );
  const [stockValue, setStockValue] = useState<string>(String(variant.stock));
  const [priceValue, setPriceValue] = useState<string>(String(variant.price));

  useEffect(() => {
    if (syncingAfterSave) {
      setRarityValue(variant.rarity);
      setConditionValue(variant.condition);
      setStockValue(String(variant.stock));
      setPriceValue(String(variant.price));
      return;
    }

    setRarityValue(pendingUpdate?.rarity ?? variant.rarity);
    setConditionValue(pendingUpdate?.condition ?? variant.condition);
    setStockValue(String(pendingUpdate?.stock ?? variant.stock));
    setPriceValue(String(pendingUpdate?.price ?? variant.price));
  }, [
    syncingAfterSave,
    pendingUpdate?.rarity,
    pendingUpdate?.condition,
    pendingUpdate?.stock,
    pendingUpdate?.price,
    variant.rarity,
    variant.condition,
    variant.stock,
    variant.price,
  ]);

  const currentStock = Number.parseInt(stockValue, 10);
  const currentPrice = Number.parseFloat(priceValue.replace(",", "."));
  const stockValid = Number.isInteger(currentStock) && currentStock >= 0;
  const priceValid = Number.isFinite(currentPrice) && currentPrice >= 0;

  const stockChanged = currentStock !== variant.stock;
  const priceChanged = Math.abs(currentPrice - variant.price) > 0.0001;
  const rarityChanged = rarityValue !== variant.rarity;
  const conditionChanged = conditionValue !== variant.condition;
  const hasChanges =
    stockChanged || priceChanged || rarityChanged || conditionChanged;
  const pendingValid = hasChanges && stockValid && priceValid;

  useEffect(() => {
    if (syncingAfterSave) return;

    if (!pendingValid) {
      clearPendingUpdate(card.id, variant.key);
      return;
    }

    const update: PendingStockUpdate = {
      cardId: card.id,
      cardName: card.name,
      cardNumber: card.number,
      variant: variant.key,
      label: variant.label,
    };

    if (stockChanged) update.stock = currentStock;
    if (priceChanged) update.price = currentPrice;
    if (rarityChanged) update.rarity = rarityValue as Rarity;
    if (conditionChanged) update.condition = conditionValue;

    setPendingUpdate(update);
  }, [
    card.id,
    card.name,
    card.number,
    clearPendingUpdate,
    conditionChanged,
    conditionValue,
    currentPrice,
    currentStock,
    pendingValid,
    priceChanged,
    rarityChanged,
    rarityValue,
    setPendingUpdate,
    stockChanged,
    syncingAfterSave,
    variant.key,
    variant.label,
  ]);

  return (
    <tr className={`${variant.hidden ? "bg-amber-950/10" : ""} align-top`}>
      {showCardCell ? (
        <td rowSpan={cardRowSpan} className="w-56 border-r border-white/10 px-4 py-3">
          <div className="font-semibold text-white">{card.name}</div>
          <div className="mt-1 font-mono text-xs text-gray-500">{card.number}</div>
        </td>
      ) : null}

      <td className="px-4 py-3">
        <div className="font-semibold text-white">{variant.label}</div>
        <div className="mt-1 font-mono text-[11px] text-gray-500">
          {variant.key}
        </div>
      </td>

      <td className="px-4 py-3">
        <select
          value={rarityValue}
          onChange={(e) => setRarityValue(e.target.value)}
          className="w-44 rounded border border-white/10 bg-zinc-950 px-2 py-1.5 text-white"
        >
          {RARITIES.map((r) => (
            <option key={r} value={r}>
              {formatRarityLabel(r)}
            </option>
          ))}
        </select>
      </td>

      <td className="px-4 py-3">
        <select
          value={conditionValue}
          onChange={(e) => setConditionValue(e.target.value as Condition)}
          className="w-32 rounded border border-white/10 bg-zinc-950 px-2 py-1.5 text-white"
        >
          {CONDITIONS.map((value) => (
            <option key={value} value={value}>
              {value}
            </option>
          ))}
        </select>
      </td>

      <td className="px-4 py-3">
        <input
          type="number"
          min={0}
          value={stockValue}
          onChange={(e) => setStockValue(e.target.value)}
          className={`w-20 rounded border px-2 py-1.5 text-white ${stockBadgeClass(currentStock, variant.hidden)} bg-opacity-10`}
        />
        {!stockValid ? <div className="mt-1 text-xs text-red-300">Invalide</div> : null}
      </td>

      <td className="px-4 py-3">
        <div className="flex items-center gap-1">
          <input
            type="number"
            min={0}
            step="0.01"
            value={priceValue}
            onChange={(e) => setPriceValue(e.target.value)}
            className="w-24 rounded border border-white/10 bg-zinc-950 px-2 py-1.5 text-white"
          />
          <span className="text-xs text-gray-500">€</span>
        </div>
        {!priceValid ? <div className="mt-1 text-xs text-red-300">Invalide</div> : null}
      </td>

      <td className="px-4 py-3">
        <div className="flex flex-col items-start gap-1.5">
          <span className={`rounded-full border px-2 py-1 text-xs font-medium ${stockBadgeClass(currentStock, variant.hidden)}`}>
            {stockLabel(currentStock, variant.hidden)}
          </span>
          {variant.modified ? (
            <span className="rounded-full border border-fuchsia-300/30 bg-fuchsia-500/15 px-2 py-1 text-xs font-medium text-fuchsia-200">
              Modifiée
            </span>
          ) : null}
        </div>
      </td>

      <td className="px-4 py-3">
        <div className="flex flex-wrap items-center gap-2">
          {pendingValid ? (
            <span className="rounded bg-violet-600/90 px-3 py-1.5 text-xs font-medium text-white">
              En attente
            </span>
          ) : null}

          {hasChanges && !pendingValid ? (
            <span className="rounded bg-red-500/20 px-3 py-1.5 text-xs font-medium text-red-200">
              Corrige avant envoi
            </span>
          ) : null}

          {hasChanges ? (
            <button
              type="button"
              onClick={() => {
                setRarityValue(variant.rarity);
                setConditionValue(variant.condition);
                setStockValue(String(variant.stock));
                setPriceValue(String(variant.price));
                clearPendingUpdate(card.id, variant.key);
              }}
              className="rounded bg-white/10 px-3 py-1.5 text-xs text-white hover:bg-white/20"
            >
              Annuler
            </button>
          ) : null}

          <VariantActionButtons
            card={card}
            variant={variant.key}
            label={variant.label}
            hidden={variant.hidden}
            fromCatalog={variant.fromCatalog}
          />
        </div>
      </td>
    </tr>
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
          ? "Elle sera cachée du site sans modifier son stock ni son prix."
          : "Elle sera de nouveau visible sur le site."),
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
        "Cela retire cette variante ajoutée manuellement.",
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
          className="rounded bg-emerald-600/80 px-3 py-1.5 text-xs font-medium text-white hover:bg-emerald-600 disabled:opacity-60"
        >
          {visibilityBusy ? "..." : "Restaurer"}
        </button>
      ) : (
        <button
          type="button"
          onClick={() => (fromCatalog ? setHidden(true) : deleteCustomVariant())}
          disabled={busy}
          className="rounded bg-red-600/80 px-3 py-1.5 text-xs font-medium text-white hover:bg-red-600 disabled:opacity-60"
        >
          {busy ? "..." : "Supprimer"}
        </button>
      )}

      {hidden && !fromCatalog ? (
        <button
          type="button"
          onClick={deleteCustomVariant}
          disabled={busy}
          className="rounded bg-red-600/80 px-3 py-1.5 text-xs font-medium text-white hover:bg-red-600 disabled:opacity-60"
        >
          {deleteBusy ? "..." : "Supprimer"}
        </button>
      ) : null}

      {error && <span className="text-xs text-red-400">{error}</span>}
    </>
  );
}
