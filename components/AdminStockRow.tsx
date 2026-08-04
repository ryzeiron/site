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
  image?: string;
  imageBack?: string;
};

type CardPhotoSide = "front" | "back";

const PHOTO_TARGET_BYTES = 450 * 1024;
const PHOTO_MAX_BYTES = 1024 * 1024;
const PHOTO_SIZES = [1100, 1000, 900, 800];
const PHOTO_QUALITIES = [0.78, 0.68, 0.58, 0.48];

async function compressCardPhoto(file: File): Promise<File> {
  if (!file.type.startsWith("image/")) {
    throw new Error("Choisis une image.");
  }

  const imageUrl = URL.createObjectURL(file);

  try {
    const image = await new Promise<HTMLImageElement>((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = () => reject(new Error("Impossible de lire la photo."));
      img.src = imageUrl;
    });

    let bestBlob: Blob | null = null;

    for (const maxSize of PHOTO_SIZES) {
      const ratio = Math.min(
        1,
        maxSize / Math.max(image.naturalWidth, image.naturalHeight),
      );
      const width = Math.max(1, Math.round(image.naturalWidth * ratio));
      const height = Math.max(1, Math.round(image.naturalHeight * ratio));
      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;

      const ctx = canvas.getContext("2d");
      if (!ctx) throw new Error("Compression impossible.");

      ctx.drawImage(image, 0, 0, width, height);

      for (const quality of PHOTO_QUALITIES) {
        const blob = await new Promise<Blob | null>((resolve) => {
          canvas.toBlob(resolve, "image/webp", quality);
        });

        if (!blob) throw new Error("Compression impossible.");

        if (!bestBlob || blob.size < bestBlob.size) {
          bestBlob = blob;
        }

        if (blob.size <= PHOTO_TARGET_BYTES) {
          return new File([blob], "photo-carte.webp", { type: "image/webp" });
        }
      }
    }

    if (!bestBlob) throw new Error("Compression impossible.");

    if (bestBlob.size > PHOTO_MAX_BYTES) {
      throw new Error("Photo encore trop lourde. Recadre-la puis reessaie.");
    }

    return new File([bestBlob], "photo-carte.webp", { type: "image/webp" });
  } finally {
    URL.revokeObjectURL(imageUrl);
  }
}

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

  return listedVariants.map(({ key, variant }) => {
    const catalogVariant = catalogVariants.get(key);
    const variantImages = card.variantImages?.[key];
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
      condition !== catalogCondition ||
      Boolean(variantImages?.image) ||
      Boolean(variantImages?.imageBack);

    const rarityLabel = formatRarityLabel(variant.rarity);

    return {
      key,
      label: key === "base" ? "Base" : key === "alt" ? "Alt" : rarityLabel,
      rarity: variant.rarity,
      condition,
      stock: variant.stock,
      price: variant.price,
      hidden,
      fromCatalog,
      modified,
      image: variantImages?.image,
      imageBack: variantImages?.imageBack,
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

      <div className="space-y-3 p-3 md:hidden">
        {variants.map((variant) => (
          <VariantEditor
            key={`mobile-${variant.key}`}
            card={card}
            variant={variant}
            layout="mobile"
          />
        ))}
      </div>

      <div className="hidden overflow-x-auto md:block">
        <table className="w-full min-w-[980px] text-left text-sm">
          <thead className="bg-black/20 text-xs uppercase tracking-[0.14em] text-gray-500">
            <tr>
              <th className="px-4 py-3 font-semibold">Carte</th>
              <th className="px-4 py-3 font-semibold">Variante</th>
              <th className="px-4 py-3 font-semibold">Rareté</th>
              <th className="px-4 py-3 font-semibold">Stock</th>
              <th className="px-4 py-3 font-semibold">Prix</th>
              <th className="px-4 py-3 font-semibold">Statut</th>
              <th className="px-4 py-3 font-semibold">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/10">
            {variants.map((variant, index) => (
              <VariantEditor
                key={`table-${variant.key}`}
                card={card}
                variant={variant}
                layout="table"
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
  const [uploadingFront, setUploadingFront] = useState(false);
  const [uploadingBack, setUploadingBack] = useState(false);
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

  async function saveMeta(nextImage: string, nextImageBack: string) {
    const res = await fetch("/api/admin/card", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        cardId: card.id,
        name,
        image: nextImage,
        imageBack: nextImageBack,
        description,
      }),
    });

    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error ?? "Erreur");
  }

  async function uploadPhoto(file: File | undefined, side: CardPhotoSide) {
    if (!file) return;

    const setUploading = side === "front" ? setUploadingFront : setUploadingBack;
    setUploading(true);
    setError(null);

    try {
      const compressed = await compressCardPhoto(file);
      const formData = new FormData();
      formData.set("cardId", card.id);
      formData.set("side", side);
      formData.set("file", compressed);

      const res = await fetch("/api/admin/card-photo", {
        method: "POST",
        body: formData,
      });
      const data = (await res.json().catch(() => ({}))) as {
        url?: string;
        error?: string;
      };

      if (!res.ok || !data.url) {
        throw new Error(data.error ?? "Erreur pendant l'envoi.");
      }

      const nextImage = side === "front" ? data.url : image;
      const nextImageBack = side === "back" ? data.url : imageBack;

      if (side === "front") {
        setImage(data.url);
      } else {
        setImageBack(data.url);
      }

      await saveMeta(nextImage, nextImageBack);
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erreur pendant l'envoi.");
    } finally {
      setUploading(false);
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
          <input
            id={`photo-front-${card.id}`}
            type="file"
            accept="image/*"
            capture="environment"
            className="hidden"
            onChange={(e) => {
              void uploadPhoto(e.currentTarget.files?.[0], "front");
              e.currentTarget.value = "";
            }}
          />
          <button
            type="button"
            onClick={() =>
              document.getElementById(`photo-front-${card.id}`)?.click()
            }
            disabled={uploadingFront}
            className={`mt-2 inline-flex rounded px-3 py-2 text-xs font-medium transition ${
              uploadingFront
                ? "bg-white/10 text-gray-400"
                : "bg-violet-600 text-white hover:bg-violet-700"
            }`}
          >
            {uploadingFront ? "Envoi..." : "Photo devant"}
          </button>
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
          <input
            id={`photo-back-${card.id}`}
            type="file"
            accept="image/*"
            capture="environment"
            className="hidden"
            onChange={(e) => {
              void uploadPhoto(e.currentTarget.files?.[0], "back");
              e.currentTarget.value = "";
            }}
          />
          <button
            type="button"
            onClick={() =>
              document.getElementById(`photo-back-${card.id}`)?.click()
            }
            disabled={uploadingBack}
            className={`mt-2 inline-flex rounded px-3 py-2 text-xs font-medium transition ${
              uploadingBack
                ? "bg-white/10 text-gray-400"
                : "bg-violet-600 text-white hover:bg-violet-700"
            }`}
          >
            {uploadingBack ? "Envoi..." : "Photo dos"}
          </button>
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
  // L'etat n'est plus modifiable dans l'interface : on garde la valeur de la
  // carte pour que l'API continue de recevoir un champ coherent.
  const conditionValue = card.condition;
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

function submittedUpdateMatchesVariant(update: PendingStockUpdate, variant: VariantSpec) {
  const stockMatches = typeof update.stock === "undefined" || update.stock === variant.stock;
  const priceMatches =
    typeof update.price === "undefined" ||
    Math.abs(update.price - variant.price) < 0.0001;
  const rarityMatches =
    typeof update.rarity === "undefined" || update.rarity === variant.rarity;
  const conditionMatches =
    typeof update.condition === "undefined" || update.condition === variant.condition;

  return stockMatches && priceMatches && rarityMatches && conditionMatches;
}

function VariantEditor({
  card,
  variant,
  layout,
  showCardCell = false,
  cardRowSpan = 1,
}: {
  card: Card;
  variant: VariantSpec;
  layout: "mobile" | "table";
  showCardCell?: boolean;
  cardRowSpan?: number;
}) {
  const {
    getPendingUpdate,
    getSubmittedUpdate,
    setPendingUpdate,
    clearPendingUpdate,
    clearSubmittedUpdate,
  } = useAdminStockBatch();
  const pendingUpdate = getPendingUpdate(card.id, variant.key);
  const submittedUpdate = getSubmittedUpdate(card.id, variant.key);
  const activeUpdate = submittedUpdate ?? pendingUpdate;
  const waitingForServer = Boolean(submittedUpdate);
  const [rarityValue, setRarityValue] = useState<string>(variant.rarity);
  const [conditionValue, setConditionValue] = useState<Condition>(
    variant.condition,
  );
  const [stockValue, setStockValue] = useState<string>(String(variant.stock));
  const [priceValue, setPriceValue] = useState<string>(String(variant.price));

  type DraftValues = {
    rarityValue: string;
    conditionValue: Condition;
    stockValue: string;
    priceValue: string;
  };

  function syncPendingUpdate(draft: DraftValues) {
    if (submittedUpdate) return;

    const nextStock = Number.parseInt(draft.stockValue, 10);
    const nextPrice = Number.parseFloat(draft.priceValue.replace(",", "."));
    const nextStockValid = Number.isInteger(nextStock) && nextStock >= 0;
    const nextPriceValid = Number.isFinite(nextPrice) && nextPrice >= 0;
    const nextStockChanged = nextStock !== variant.stock;
    const nextPriceChanged = Math.abs(nextPrice - variant.price) > 0.0001;
    const nextRarityChanged = draft.rarityValue !== variant.rarity;
    const nextConditionChanged = draft.conditionValue !== variant.condition;
    const nextHasChanges =
      nextStockChanged ||
      nextPriceChanged ||
      nextRarityChanged ||
      nextConditionChanged;

    if (!nextHasChanges || !nextStockValid || !nextPriceValid) {
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

    if (nextStockChanged) update.stock = nextStock;
    if (nextPriceChanged) update.price = nextPrice;
    if (nextRarityChanged) update.rarity = draft.rarityValue as Rarity;
    if (nextConditionChanged) update.condition = draft.conditionValue;

    setPendingUpdate(update);
  }

  function updateDraft(next: Partial<DraftValues>) {
    const draft = {
      rarityValue,
      conditionValue,
      stockValue,
      priceValue,
      ...next,
    };

    if (typeof next.rarityValue !== "undefined") setRarityValue(next.rarityValue);
    if (typeof next.conditionValue !== "undefined") {
      setConditionValue(next.conditionValue);
    }
    if (typeof next.stockValue !== "undefined") setStockValue(next.stockValue);
    if (typeof next.priceValue !== "undefined") setPriceValue(next.priceValue);

    syncPendingUpdate(draft);
  }

  function resetDraft() {
    setRarityValue(variant.rarity);
    setConditionValue(variant.condition);
    setStockValue(String(variant.stock));
    setPriceValue(String(variant.price));
    clearPendingUpdate(card.id, variant.key);
  }

  function adjustStock(delta: number) {
    const current = Number.parseInt(stockValue, 10);
    const base = Number.isInteger(current) ? current : variant.stock;
    updateDraft({ stockValue: String(Math.max(0, base + delta)) });
  }

  useEffect(() => {
    if (submittedUpdate && submittedUpdateMatchesVariant(submittedUpdate, variant)) {
      clearSubmittedUpdate(card.id, variant.key);
    }
  }, [card.id, clearSubmittedUpdate, submittedUpdate, variant]);

  useEffect(() => {
    setRarityValue(activeUpdate?.rarity ?? variant.rarity);
    setConditionValue(activeUpdate?.condition ?? variant.condition);
    setStockValue(String(activeUpdate?.stock ?? variant.stock));
    setPriceValue(String(activeUpdate?.price ?? variant.price));
  }, [
    activeUpdate?.rarity,
    activeUpdate?.condition,
    activeUpdate?.stock,
    activeUpdate?.price,
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

  if (layout === "mobile") {
    return (
      <section
        className={`rounded-xl border p-3 ${
          variant.hidden
            ? "border-amber-300/25 bg-amber-950/10"
            : "border-white/10 bg-zinc-950/70"
        }`}
      >
        <div className="flex gap-3">
          <div className="relative h-20 w-14 shrink-0 overflow-hidden rounded border border-white/10 bg-zinc-950">
            {variant.image ?? card.image ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={variant.image ?? card.image}
                alt={card.name}
                className="h-full w-full object-contain"
              />
            ) : null}
          </div>

          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-full bg-violet-500/20 px-2 py-1 text-xs font-semibold text-violet-100">
                {variant.label}
              </span>
              <span className={`rounded-full border px-2 py-1 text-xs font-medium ${stockBadgeClass(currentStock, variant.hidden)}`}>
                {stockLabel(currentStock, variant.hidden)}
              </span>
              {pendingValid ? (
                <span className="rounded-full bg-violet-600 px-2 py-1 text-xs font-medium text-white">
                  En attente
                </span>
              ) : null}
              {waitingForServer ? (
                <span className="rounded-full bg-emerald-500/20 px-2 py-1 text-xs font-medium text-emerald-200">
                  Envoyee
                </span>
              ) : null}
            </div>

            <div className="mt-2 truncate text-sm font-semibold text-white">
              {card.name}
            </div>
            <div className="mt-0.5 font-mono text-xs text-gray-500">
              {card.number} - {variant.key}
            </div>
          </div>
        </div>

        <div className="mt-3 grid gap-3">
          <label className="text-sm">
            <span className="mb-1 block text-xs font-medium text-gray-400">
              Rarete
            </span>
            <select
              value={rarityValue}
              onChange={(e) => updateDraft({ rarityValue: e.target.value })}
              disabled={waitingForServer}
              className="h-11 w-full rounded-lg border border-white/10 bg-zinc-950 px-3 text-base text-white"
            >
              {RARITIES.map((r) => (
                <option key={r} value={r}>
                  {formatRarityLabel(r)}
                </option>
              ))}
            </select>
          </label>

          <div className="grid grid-cols-2 gap-3">
            <label className="text-sm">
              <span className="mb-1 block text-xs font-medium text-gray-400">
                Stock
              </span>
              <div className="grid h-11 grid-cols-[2.75rem_1fr_2.75rem] overflow-hidden rounded-lg border border-white/10 bg-zinc-950">
                <button
                  type="button"
                  onClick={() => adjustStock(-1)}
                  disabled={waitingForServer}
                  className="border-r border-white/10 text-lg font-bold text-white disabled:opacity-40"
                  aria-label="Retirer 1 stock"
                >
                  -
                </button>
                <input
                  type="number"
                  min={0}
                  inputMode="numeric"
                  value={stockValue}
                  onChange={(e) => updateDraft({ stockValue: e.target.value })}
                  disabled={waitingForServer}
                  className="min-w-0 bg-transparent px-2 text-center text-base font-semibold text-white outline-none"
                />
                <button
                  type="button"
                  onClick={() => adjustStock(1)}
                  disabled={waitingForServer}
                  className="border-l border-white/10 text-lg font-bold text-white disabled:opacity-40"
                  aria-label="Ajouter 1 stock"
                >
                  +
                </button>
              </div>
              {!stockValid ? (
                <div className="mt-1 text-xs text-red-300">Stock invalide</div>
              ) : null}
            </label>

            <label className="text-sm">
              <span className="mb-1 block text-xs font-medium text-gray-400">
                Prix
              </span>
              <div className="flex h-11 items-center rounded-lg border border-white/10 bg-zinc-950 px-3">
                <input
                  type="number"
                  min={0}
                  step="0.01"
                  inputMode="decimal"
                  value={priceValue}
                  onChange={(e) => updateDraft({ priceValue: e.target.value })}
                  disabled={waitingForServer}
                  className="min-w-0 flex-1 bg-transparent text-base font-semibold text-white outline-none"
                />
                <span className="ml-2 text-sm text-gray-400">EUR</span>
              </div>
              {!priceValid ? (
                <div className="mt-1 text-xs text-red-300">Prix invalide</div>
              ) : null}
            </label>
          </div>
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-2">
          {variant.modified ? (
            <span className="rounded-full border border-fuchsia-300/30 bg-fuchsia-500/15 px-2.5 py-1 text-xs font-medium text-fuchsia-200">
              Modifiee
            </span>
          ) : null}

          {hasChanges && !pendingValid && !waitingForServer ? (
            <span className="rounded-full bg-red-500/20 px-2.5 py-1 text-xs font-medium text-red-200">
              Corrige avant envoi
            </span>
          ) : null}

          {hasChanges && !waitingForServer ? (
            <button
              type="button"
              onClick={resetDraft}
              className="rounded-lg bg-white/10 px-3 py-2 text-xs font-medium text-white hover:bg-white/20"
            >
              Annuler
            </button>
          ) : null}

          <VariantPhotoButtons
            card={card}
            variant={variant}
            inputScope="mobile"
          />

          <VariantActionButtons
            card={card}
            variant={variant.key}
            label={variant.label}
            hidden={variant.hidden}
            fromCatalog={variant.fromCatalog}
          />
        </div>
      </section>
    );
  }

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
          onChange={(e) => updateDraft({ rarityValue: e.target.value })}
          disabled={waitingForServer}
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
        <input
          type="number"
          min={0}
          value={stockValue}
          onChange={(e) => updateDraft({ stockValue: e.target.value })}
          disabled={waitingForServer}
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
            onChange={(e) => updateDraft({ priceValue: e.target.value })}
            disabled={waitingForServer}
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
          {waitingForServer ? (
            <span className="rounded bg-emerald-500/20 px-3 py-1.5 text-xs font-medium text-emerald-200">
              Envoyee
            </span>
          ) : pendingValid ? (
            <span className="rounded bg-violet-600/90 px-3 py-1.5 text-xs font-medium text-white">
              En attente
            </span>
          ) : null}

          {hasChanges && !pendingValid && !waitingForServer ? (
            <span className="rounded bg-red-500/20 px-3 py-1.5 text-xs font-medium text-red-200">
              Corrige avant envoi
            </span>
          ) : null}

          {hasChanges && !waitingForServer ? (
            <button
              type="button"
              onClick={resetDraft}
              className="rounded bg-white/10 px-3 py-1.5 text-xs text-white hover:bg-white/20"
            >
              Annuler
            </button>
          ) : null}

          <VariantPhotoButtons
            card={card}
            variant={variant}
            inputScope="table"
          />

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

function VariantPhotoButtons({
  card,
  variant,
  inputScope,
}: {
  card: Card;
  variant: VariantSpec;
  inputScope: "mobile" | "table";
}) {
  const router = useRouter();
  const [uploadingFront, setUploadingFront] = useState(false);
  const [uploadingBack, setUploadingBack] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const frontInputId = `variant-photo-front-${inputScope}-${card.id}-${variant.key}`;
  const backInputId = `variant-photo-back-${inputScope}-${card.id}-${variant.key}`;

  async function saveVariantImage(url: string, side: CardPhotoSide) {
    const res = await fetch("/api/admin/stock", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        cardId: card.id,
        variant: variant.key,
        ...(side === "front" ? { image: url } : { imageBack: url }),
      }),
    });

    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error ?? "Erreur");
  }

  async function uploadPhoto(file: File | undefined, side: CardPhotoSide) {
    if (!file) return;

    const setUploading = side === "front" ? setUploadingFront : setUploadingBack;
    setUploading(true);
    setError(null);

    try {
      const compressed = await compressCardPhoto(file);
      const formData = new FormData();
      formData.set("cardId", card.id);
      formData.set("variant", variant.key);
      formData.set("side", side);
      formData.set("file", compressed);

      const res = await fetch("/api/admin/card-photo", {
        method: "POST",
        body: formData,
      });
      const data = (await res.json().catch(() => ({}))) as {
        url?: string;
        error?: string;
      };

      if (!res.ok || !data.url) {
        throw new Error(data.error ?? "Erreur pendant l'envoi.");
      }

      await saveVariantImage(data.url, side);
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erreur pendant l'envoi.");
    } finally {
      setUploading(false);
    }
  }

  return (
    <span className="inline-flex flex-wrap items-center gap-1.5">
      <input
        id={frontInputId}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={(e) => {
          void uploadPhoto(e.currentTarget.files?.[0], "front");
          e.currentTarget.value = "";
        }}
      />
      <input
        id={backInputId}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={(e) => {
          void uploadPhoto(e.currentTarget.files?.[0], "back");
          e.currentTarget.value = "";
        }}
      />

      <button
        type="button"
        onClick={() => document.getElementById(frontInputId)?.click()}
        disabled={uploadingFront || uploadingBack}
        className={`rounded px-3 py-1.5 text-xs font-medium transition ${
          variant.image
            ? "bg-sky-500/20 text-sky-200 hover:bg-sky-500/30"
            : "bg-white/10 text-white hover:bg-white/20"
        } disabled:opacity-60`}
        title={`Photo devant pour ${variant.label}`}
      >
        {uploadingFront ? "..." : variant.image ? "Devant OK" : "Devant"}
      </button>

      <button
        type="button"
        onClick={() => document.getElementById(backInputId)?.click()}
        disabled={uploadingFront || uploadingBack}
        className={`rounded px-3 py-1.5 text-xs font-medium transition ${
          variant.imageBack
            ? "bg-sky-500/20 text-sky-200 hover:bg-sky-500/30"
            : "bg-white/10 text-white hover:bg-white/20"
        } disabled:opacity-60`}
        title={`Photo dos pour ${variant.label}`}
      >
        {uploadingBack ? "..." : variant.imageBack ? "Dos OK" : "Dos"}
      </button>

      {error ? <span className="text-xs text-red-400">{error}</span> : null}
    </span>
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
