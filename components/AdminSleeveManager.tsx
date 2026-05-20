"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import type { SleeveProduct } from "@/lib/sleeves";

type SleeveFormState = {
  id: string;
  name: string;
  description: string;
  image: string;
  price: string;
  stock: string;
  active: boolean;
};

const EMPTY_FORM: SleeveFormState = {
  id: "",
  name: "",
  description: "",
  image: "",
  price: "0",
  stock: "0",
  active: true,
};

function toForm(product: SleeveProduct): SleeveFormState {
  return {
    id: product.id,
    name: product.name,
    description: product.description ?? "",
    image: product.image ?? "",
    price: String(product.priceCents / 100),
    stock: String(product.stock),
    active: product.active,
  };
}

export default function AdminSleeveManager({
  sleeves,
}: {
  sleeves: SleeveProduct[];
}) {
  const [createForm, setCreateForm] = useState<SleeveFormState>(EMPTY_FORM);

  return (
    <div className="space-y-5">
      <SleeveEditor
        title="Ajouter un sleeve"
        form={createForm}
        setForm={setCreateForm}
        afterSave={() => setCreateForm(EMPTY_FORM)}
      />

      <div className="space-y-3">
        {sleeves.length === 0 ? (
          <div className="rounded-lg border border-white/10 bg-zinc-900/70 p-5 text-sm text-gray-300">
            Aucun sleeve ajouté pour le moment.
          </div>
        ) : (
          sleeves.map((product) => (
            <SleeveEditor
              key={product.id}
              title={product.name}
              form={toForm(product)}
              productId={product.id}
            />
          ))
        )}
      </div>
    </div>
  );
}

function SleeveEditor({
  title,
  form: initialForm,
  setForm: externalSetForm,
  productId,
  afterSave,
}: {
  title: string;
  form: SleeveFormState;
  setForm?: (form: SleeveFormState) => void;
  productId?: string;
  afterSave?: () => void;
}) {
  const router = useRouter();
  const [localForm, setLocalForm] = useState(initialForm);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const form = externalSetForm ? initialForm : localForm;
  const setForm = externalSetForm ?? setLocalForm;
  const price = Number.parseFloat(form.price.replace(",", "."));
  const stock = Number.parseInt(form.stock, 10);
  const canSave =
    form.name.trim().length > 0 &&
    Number.isFinite(price) &&
    price >= 0 &&
    Number.isInteger(stock) &&
    stock >= 0;

  function update(patch: Partial<SleeveFormState>) {
    setForm({ ...form, ...patch });
  }

  async function save() {
    if (!canSave) return;

    setSaving(true);
    setSaved(false);
    setError(null);

    try {
      const response = await fetch("/api/admin/sleeves", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: productId ?? form.id,
          name: form.name,
          description: form.description,
          image: form.image,
          price,
          stock,
          active: form.active,
        }),
      });

      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error ?? "Erreur");

      afterSave?.();
      setSaved(true);
      setTimeout(() => setSaved(false), 1500);
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erreur");
    } finally {
      setSaving(false);
    }
  }

  async function remove() {
    if (!productId) return;

    const ok = window.confirm(`Supprimer définitivement ${form.name} ?`);
    if (!ok) return;

    setDeleting(true);
    setError(null);

    try {
      const response = await fetch("/api/admin/sleeves", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: productId }),
      });

      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error ?? "Erreur");

      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erreur");
    } finally {
      setDeleting(false);
    }
  }

  return (
    <section className="rounded-lg border border-white/10 bg-zinc-900/70 p-4 text-gray-200">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="font-semibold text-white">{title}</h2>
          {productId ? (
            <p className="mt-1 font-mono text-xs text-gray-500">{productId}</p>
          ) : (
            <p className="mt-1 text-xs text-gray-500">
              L'identifiant est créé automatiquement depuis le nom.
            </p>
          )}
        </div>

        <label className="flex items-center gap-2 text-sm text-gray-300">
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
          <span className="mb-1 block text-gray-400">Nom</span>
          <input
            type="text"
            value={form.name}
            onChange={(e) => update({ name: e.target.value })}
            className="w-full rounded border border-white/10 bg-zinc-950 px-3 py-2 text-white"
          />
        </label>

        <label className="text-sm">
          <span className="mb-1 block text-gray-400">Image</span>
          <input
            type="text"
            value={form.image}
            onChange={(e) => update({ image: e.target.value })}
            placeholder="/sleeves/nom-image.webp"
            className="w-full rounded border border-white/10 bg-zinc-950 px-3 py-2 text-white"
          />
        </label>

        <label className="text-sm">
          <span className="mb-1 block text-gray-400">Prix</span>
          <div className="flex items-center gap-2">
            <input
              type="number"
              min={0}
              step="0.01"
              value={form.price}
              onChange={(e) => update({ price: e.target.value })}
              className="w-32 rounded border border-white/10 bg-zinc-950 px-3 py-2 text-white"
            />
            <span className="text-sm text-gray-400">€</span>
          </div>
        </label>

        <label className="text-sm">
          <span className="mb-1 block text-gray-400">Stock</span>
          <input
            type="number"
            min={0}
            value={form.stock}
            onChange={(e) => update({ stock: e.target.value })}
            className="w-32 rounded border border-white/10 bg-zinc-950 px-3 py-2 text-white"
          />
        </label>

        <label className="text-sm md:col-span-2">
          <span className="mb-1 block text-gray-400">Description</span>
          <textarea
            value={form.description}
            onChange={(e) => update({ description: e.target.value })}
            rows={2}
            className="w-full rounded border border-white/10 bg-zinc-950 px-3 py-2 text-white"
          />
        </label>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={save}
          disabled={!canSave || saving}
          className={`rounded px-4 py-2 text-sm font-medium transition ${
            saved
              ? "bg-emerald-500 text-white"
              : canSave
                ? "bg-brand-500 text-white hover:bg-brand-600"
                : "cursor-not-allowed bg-white/10 text-gray-400"
          }`}
        >
          {saved ? "OK" : saving ? "..." : productId ? "Enregistrer" : "Ajouter"}
        </button>

        {productId ? (
          <button
            type="button"
            onClick={remove}
            disabled={deleting}
            className="rounded bg-red-600/80 px-4 py-2 text-sm font-medium text-white hover:bg-red-600 disabled:opacity-60"
          >
            {deleting ? "..." : "Supprimer"}
          </button>
        ) : null}

        {error ? <span className="text-sm text-red-300">{error}</span> : null}
      </div>
    </section>
  );
}
