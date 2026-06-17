"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import type { SleeveProduct } from "@/lib/sleeves";

type SleeveFormState = {
  price: string;
  stock: string;
  active: boolean;
  image: string;
};

const PHOTO_TARGET_BYTES = 450 * 1024;
const PHOTO_MAX_BYTES = 1024 * 1024;
const PHOTO_SIZES = [1100, 1000, 900, 800];
const PHOTO_QUALITIES = [0.78, 0.68, 0.58, 0.48];

async function compressSleevePhoto(file: File): Promise<File> {
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
          return new File([blob], "photo-sleeve.webp", { type: "image/webp" });
        }
      }
    }

    if (!bestBlob) throw new Error("Compression impossible.");

    if (bestBlob.size > PHOTO_MAX_BYTES) {
      throw new Error("Photo encore trop lourde. Recadre-la puis reessaie.");
    }

    return new File([bestBlob], "photo-sleeve.webp", { type: "image/webp" });
  } finally {
    URL.revokeObjectURL(imageUrl);
  }
}

function toForm(product: SleeveProduct): SleeveFormState {
  return {
    price: String(product.priceCents / 100),
    stock: String(product.stock),
    active: product.active,
    image: product.image ?? "",
  };
}

export default function AdminSleeveManager({
  sleeves,
}: {
  sleeves: SleeveProduct[];
}) {
  return (
    <div className="space-y-5">
      <div className="rounded-lg border border-violet-300/20 bg-violet-500/10 p-4 text-sm text-violet-100">
        Les sleeves sont dans le catalogue du site. Ici, tu modifies le prix,
        le stock, la visibilite et la photo affichee sur le site.
      </div>

      <div className="space-y-3">
        {sleeves.length === 0 ? (
          <div className="rounded-lg border border-white/10 bg-zinc-900/70 p-5 text-sm text-gray-300">
            Aucun sleeve dans le catalogue pour le moment.
          </div>
        ) : (
          sleeves.map((product) => (
            <SleeveEditor key={product.id} product={product} />
          ))
        )}
      </div>
    </div>
  );
}

function SleeveEditor({ product }: { product: SleeveProduct }) {
  const router = useRouter();
  const [form, setForm] = useState<SleeveFormState>(toForm(product));
  const [saving, setSaving] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const price = Number.parseFloat(form.price.replace(",", "."));
  const stock = Number.parseInt(form.stock, 10);
  const canSave =
    Number.isFinite(price) &&
    price >= 0 &&
    Number.isInteger(stock) &&
    stock >= 0;
  const inputId = `sleeve-photo-${product.id}`;

  function update(patch: Partial<SleeveFormState>) {
    setForm((current) => ({ ...current, ...patch }));
  }

  async function savePatch(
    patch: Partial<{
      price: number;
      stock: number;
      active: boolean;
      image: string | null;
    }>,
  ) {
    const response = await fetch("/api/admin/sleeves", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        id: product.id,
        ...patch,
      }),
    });

    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data.error ?? "Erreur");
  }

  async function save() {
    if (!canSave) return;

    setSaving(true);
    setSaved(false);
    setError(null);

    try {
      await savePatch({
        price,
        stock,
        active: form.active,
      });

      setSaved(true);
      setTimeout(() => setSaved(false), 1500);
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erreur");
    } finally {
      setSaving(false);
    }
  }

  async function uploadPhoto(file: File | undefined) {
    if (!file) return;

    setUploadingPhoto(true);
    setSaved(false);
    setError(null);

    try {
      const compressed = await compressSleevePhoto(file);
      const formData = new FormData();
      formData.set("sleeveId", product.id);
      formData.set("file", compressed);

      const response = await fetch("/api/admin/sleeve-photo", {
        method: "POST",
        body: formData,
      });
      const data = (await response.json().catch(() => ({}))) as {
        error?: string;
        url?: string;
      };

      if (!response.ok || !data.url) {
        throw new Error(data.error ?? "Erreur pendant l'envoi.");
      }

      await savePatch({ image: data.url });
      update({ image: data.url });
      setSaved(true);
      setTimeout(() => setSaved(false), 1500);
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erreur");
    } finally {
      setUploadingPhoto(false);
    }
  }

  async function resetOverride() {
    const ok = window.confirm(
      `Reinitialiser le prix, le stock, la visibilite et la photo de ${product.name} ?`,
    );
    if (!ok) return;

    setResetting(true);
    setError(null);

    try {
      const response = await fetch("/api/admin/sleeves", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: product.id }),
      });

      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error ?? "Erreur");

      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erreur");
    } finally {
      setResetting(false);
    }
  }

  return (
    <section className="rounded-lg border border-white/10 bg-zinc-900/70 p-4 text-gray-200">
      <div className="mb-3 grid gap-4 lg:grid-cols-[8rem_1fr_auto]">
        <div>
          <div className="flex aspect-[4/3] items-center justify-center overflow-hidden rounded-lg border border-white/10 bg-zinc-950">
            {form.image ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={form.image}
                alt={product.name}
                className="h-full w-full object-contain p-2"
              />
            ) : (
              <span className="text-center text-xs font-bold uppercase tracking-[0.16em] text-violet-200">
                Sleeve
              </span>
            )}
          </div>

          <input
            id={inputId}
            type="file"
            accept="image/*"
            capture="environment"
            className="hidden"
            onChange={(e) => {
              void uploadPhoto(e.currentTarget.files?.[0]);
              e.currentTarget.value = "";
            }}
          />

          <button
            type="button"
            onClick={() => document.getElementById(inputId)?.click()}
            disabled={uploadingPhoto}
            className="mt-2 w-full rounded bg-violet-600 px-3 py-2 text-xs font-medium text-white transition hover:bg-violet-700 disabled:opacity-60"
          >
            {uploadingPhoto
              ? "Envoi..."
              : form.image
                ? "Changer la photo"
                : "Ajouter une photo"}
          </button>
        </div>

        <div>
          <h2 className="font-semibold text-white">{product.name}</h2>
          <p className="mt-1 font-mono text-xs text-gray-500">{product.id}</p>
          {product.description ? (
            <p className="mt-2 max-w-2xl text-sm text-gray-400">
              {product.description}
            </p>
          ) : null}
          {product.hasOverride ? (
            <p className="mt-2 text-xs text-emerald-300">
              Modification admin active.
            </p>
          ) : (
            <p className="mt-2 text-xs text-gray-500">
              Valeurs par defaut du catalogue.
            </p>
          )}
          <p className="mt-2 text-xs text-gray-500">
            La photo ajoutee ici remplace l'image catalogue de ce sleeve.
          </p>
        </div>

        <label className="flex items-center gap-2 text-sm text-gray-300 lg:justify-end">
          <input
            type="checkbox"
            checked={form.active}
            onChange={(e) => update({ active: e.target.checked })}
            className="h-4 w-4 rounded border-white/20 bg-zinc-900 accent-brand-500"
          />
          Visible sur le site
        </label>
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        <label className="text-sm">
          <span className="mb-1 block text-gray-400">Prix</span>
          <div className="flex items-center gap-2">
            <input
              type="number"
              min={0}
              step="0.01"
              value={form.price}
              onChange={(e) => update({ price: e.target.value })}
              className="h-11 w-full rounded border border-white/10 bg-zinc-950 px-3 py-2 text-base text-white sm:w-32 sm:text-sm"
            />
            <span className="text-sm text-gray-400">EUR</span>
          </div>
        </label>

        <label className="text-sm">
          <span className="mb-1 block text-gray-400">Stock</span>
          <input
            type="number"
            min={0}
            value={form.stock}
            onChange={(e) => update({ stock: e.target.value })}
            className="h-11 w-full rounded border border-white/10 bg-zinc-950 px-3 py-2 text-base text-white sm:w-32 sm:text-sm"
          />
        </label>
      </div>

      <div className="mt-4 grid gap-2 sm:flex sm:flex-wrap sm:items-center">
        <button
          type="button"
          onClick={save}
          disabled={!canSave || saving}
          className={`rounded px-4 py-3 text-sm font-medium transition sm:py-2 ${
            saved
              ? "bg-emerald-500 text-white"
              : canSave
                ? "bg-brand-500 text-white hover:bg-brand-600"
                : "cursor-not-allowed bg-white/10 text-gray-400"
          }`}
        >
          {saved ? "OK" : saving ? "..." : "Enregistrer"}
        </button>

        {product.hasOverride ? (
          <button
            type="button"
            onClick={resetOverride}
            disabled={resetting}
            className="rounded bg-white/10 px-4 py-3 text-sm font-medium text-white hover:bg-white/20 disabled:opacity-60 sm:py-2"
          >
            {resetting ? "..." : "Reinitialiser"}
          </button>
        ) : null}

        {error ? <span className="text-sm text-red-300">{error}</span> : null}
      </div>
    </section>
  );
}
