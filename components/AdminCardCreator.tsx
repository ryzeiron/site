"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import AdminImageDropzone from "@/components/AdminImageDropzone";

type Props = {
  serieId: string;
  serieLabel: string;
  rarities: readonly string[];
};

export default function AdminCardCreator({
  serieId,
  serieLabel,
  rarities,
}: Props) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [number, setNumber] = useState("");
  const [rarity, setRarity] = useState(rarities[0] ?? "Commune");
  const [price, setPrice] = useState("0.50");
  const [stock, setStock] = useState("1");
  const [image, setImage] = useState("");
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const priceValue = Number.parseFloat(price.replace(",", "."));
  const stockValue = Number.parseInt(stock, 10);
  const canSave =
    name.trim().length > 0 &&
    number.trim().length > 0 &&
    Number.isFinite(priceValue) &&
    priceValue >= 0 &&
    Number.isInteger(stockValue) &&
    stockValue >= 0 &&
    !uploading;

  // La photo part sur R2 avant la creation : la carte n'existe pas encore, on
  // passe donc un identifiant temporaire base sur la serie et le numero.
  async function uploadImage(file: File) {
    setUploading(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.set("cardId", `${serieId}-nouvelle`);
      formData.set("side", "front");
      formData.set("file", file);

      const res = await fetch("/api/admin/card-photo", {
        method: "POST",
        body: formData,
      });
      const data = (await res.json().catch(() => ({}))) as {
        url?: string;
        error?: string;
      };

      if (!res.ok || !data.url) {
        throw new Error(data.error ?? "Envoi impossible.");
      }

      setImage(data.url);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Envoi impossible.");
    } finally {
      setUploading(false);
    }
  }

  async function create() {
    if (!canSave || saving) return;

    setSaving(true);
    setError(null);

    try {
      const res = await fetch("/api/admin/custom-cards", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          serieId,
          name: name.trim(),
          number: number.trim(),
          rarity,
          price: priceValue,
          stock: stockValue,
          image: image || null,
        }),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error ?? "Erreur");

      setName("");
      setNumber("");
      setPrice("0.50");
      setStock("1");
      setImage("");
      setOpen(false);
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erreur");
    } finally {
      setSaving(false);
    }
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="mb-4 inline-flex items-center gap-2 rounded-full bg-violet-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-violet-700"
      >
        <span className="text-lg leading-none">+</span>
        Ajouter une carte
      </button>
    );
  }

  return (
    <div className="mb-4 rounded-2xl border border-violet-400/30 bg-violet-500/10 p-4">
      <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
        <div>
          <h2 className="font-bold text-white">Ajouter une carte</h2>
          <p className="text-xs text-gray-300">
            Elle sera ajoutee a la serie {serieLabel} et visible immediatement.
          </p>
        </div>

        <button
          type="button"
          onClick={() => setOpen(false)}
          className="text-xs text-gray-300 underline hover:text-white"
        >
          Annuler
        </button>
      </div>

      <div className="grid gap-3 lg:grid-cols-[14rem_1fr]">
        <AdminImageDropzone
          label={image ? "Changer l'image" : "Choisir une image"}
          currentUrl={image || undefined}
          busy={uploading}
          onFile={(file) => void uploadImage(file)}
        />

        <div className="grid gap-3 sm:grid-cols-2">
          <label className="text-sm sm:col-span-2">
            <span className="mb-1 block text-xs text-gray-400">Nom</span>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Dracaufeu"
              className="w-full rounded border border-white/10 bg-zinc-950 px-3 py-2 text-white"
            />
          </label>

          <label className="text-sm">
            <span className="mb-1 block text-xs text-gray-400">Numero</span>
            <input
              type="text"
              value={number}
              onChange={(e) => setNumber(e.target.value)}
              placeholder="004/102"
              className="w-full rounded border border-white/10 bg-zinc-950 px-3 py-2 text-white"
            />
          </label>

          <label className="text-sm">
            <span className="mb-1 block text-xs text-gray-400">Rarete</span>
            <select
              value={rarity}
              onChange={(e) => setRarity(e.target.value)}
              className="h-[42px] w-full rounded border border-white/10 bg-zinc-950 px-3 text-white"
            >
              {rarities.map((value) => (
                <option key={value} value={value}>
                  {value}
                </option>
              ))}
            </select>
          </label>

          <label className="text-sm">
            <span className="mb-1 block text-xs text-gray-400">Prix (EUR)</span>
            <input
              type="number"
              min={0}
              step="0.01"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              className="w-full rounded border border-white/10 bg-zinc-950 px-3 py-2 text-white"
            />
          </label>

          <label className="text-sm">
            <span className="mb-1 block text-xs text-gray-400">Stock</span>
            <input
              type="number"
              min={0}
              step="1"
              value={stock}
              onChange={(e) => setStock(e.target.value)}
              className="w-full rounded border border-white/10 bg-zinc-950 px-3 py-2 text-white"
            />
          </label>
        </div>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={create}
          disabled={!canSave || saving}
          className={`rounded px-4 py-2 text-sm font-medium transition ${
            canSave && !saving
              ? "bg-violet-600 text-white hover:bg-violet-700"
              : "cursor-not-allowed bg-white/10 text-gray-400"
          }`}
        >
          {saving ? "Creation..." : "Creer la carte"}
        </button>

        {uploading && (
          <span className="text-xs text-gray-300">Envoi de l&apos;image...</span>
        )}
        {error && <span className="text-xs text-red-400">{error}</span>}
      </div>
    </div>
  );
}
