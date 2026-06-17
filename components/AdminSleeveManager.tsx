"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import type { SleeveProduct } from "@/lib/sleeves";

type SleeveFormState = {
  price: string;
  stock: string;
  active: boolean;
};

function toForm(product: SleeveProduct): SleeveFormState {
  return {
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
  return (
    <div className="space-y-5">
      <div className="rounded-lg border border-violet-300/20 bg-violet-500/10 p-4 text-sm text-violet-100">
        Les sleeves sont maintenant dans le catalogue du site. Ici, tu modifies
        seulement le prix, le stock et la visibilité.
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
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const price = Number.parseFloat(form.price.replace(",", "."));
  const stock = Number.parseInt(form.stock, 10);
  const canSave =
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
          id: product.id,
          price,
          stock,
          active: form.active,
        }),
      });

      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error ?? "Erreur");

      setSaved(true);
      setTimeout(() => setSaved(false), 1500);
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erreur");
    } finally {
      setSaving(false);
    }
  }

  async function resetOverride() {
    const ok = window.confirm(
      `Réinitialiser le prix, le stock et la visibilité de ${product.name} ?`,
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
      <div className="mb-3 flex flex-wrap items-start justify-between gap-3">
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
              Valeurs par défaut du catalogue.
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

      {product.image ? (
        <div className="mb-3 rounded border border-white/10 bg-zinc-950 px-3 py-2 text-xs text-gray-400">
          Image : {product.image}
        </div>
      ) : null}

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
            {resetting ? "..." : "Réinitialiser"}
          </button>
        ) : null}

        {error ? <span className="text-sm text-red-300">{error}</span> : null}
      </div>
    </section>
  );
}
