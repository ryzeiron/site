"use client";

import { useState } from "react";

type PromoResult = {
  code: string;
  couponId: string;
  promotionCodeId: string;
};

type DiscountType = "percent" | "amount";

export default function AdminPromoCreator() {
  const [discountType, setDiscountType] = useState<DiscountType>("amount");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<PromoResult | null>(null);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError("");
    setResult(null);

    const form = new FormData(event.currentTarget);
    const payload = {
      code: String(form.get("code") ?? ""),
      discountType,
      amountOffEuros: Number(form.get("amountOffEuros") || 0),
      percentOff: Number(form.get("percentOff") || 0),
      expiresAt: String(form.get("expiresAt") ?? ""),
      maxRedemptions: Number(form.get("maxRedemptions") || 0),
      customerEmail: String(form.get("customerEmail") ?? ""),
      minimumAmountEuros: Number(form.get("minimumAmountEuros") || 0),
    };

    try {
      const response = await fetch("/api/admin/promos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = (await response.json()) as {
        promo?: PromoResult;
        error?: string;
      };

      if (!response.ok || !data.promo) {
        throw new Error(data.error || "Impossible de creer le code promo.");
      }

      setResult(data.promo);
      event.currentTarget.reset();
      setDiscountType("amount");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erreur inconnue.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="rounded-2xl border border-white/10 bg-zinc-950/70 p-4">
      <div className="mb-4">
        <h2 className="text-xl font-bold text-white">Creer un bon</h2>
        <p className="mt-1 text-sm text-gray-400">
          Le code est cree dans Stripe et sera utilisable directement dans le panier.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="grid gap-4 lg:grid-cols-2">
        <label className="space-y-1">
          <span className="text-sm font-medium text-gray-300">Code</span>
          <input
            name="code"
            required
            placeholder="MORGANE5"
            className="w-full rounded-xl border border-white/10 bg-zinc-900 px-3 py-2 text-white outline-none focus:border-violet-400"
          />
        </label>

        <label className="space-y-1">
          <span className="text-sm font-medium text-gray-300">Type de reduction</span>
          <select
            value={discountType}
            onChange={(event) =>
              setDiscountType(event.currentTarget.value as DiscountType)
            }
            className="w-full rounded-xl border border-white/10 bg-zinc-900 px-3 py-2 text-white outline-none focus:border-violet-400"
          >
            <option value="amount">Montant fixe</option>
            <option value="percent">Pourcentage</option>
          </select>
        </label>

        {discountType === "amount" ? (
          <label className="space-y-1">
            <span className="text-sm font-medium text-gray-300">Montant offert</span>
            <input
              name="amountOffEuros"
              type="number"
              min="0.5"
              step="0.01"
              placeholder="5"
              className="w-full rounded-xl border border-white/10 bg-zinc-900 px-3 py-2 text-white outline-none focus:border-violet-400"
            />
          </label>
        ) : (
          <label className="space-y-1">
            <span className="text-sm font-medium text-gray-300">Pourcentage</span>
            <input
              name="percentOff"
              type="number"
              min="1"
              max="99"
              step="0.1"
              placeholder="10"
              className="w-full rounded-xl border border-white/10 bg-zinc-900 px-3 py-2 text-white outline-none focus:border-violet-400"
            />
          </label>
        )}

        <label className="space-y-1">
          <span className="text-sm font-medium text-gray-300">Date limite</span>
          <input
            name="expiresAt"
            type="date"
            className="w-full rounded-xl border border-white/10 bg-zinc-900 px-3 py-2 text-white outline-none focus:border-violet-400"
          />
          <span className="block text-xs text-gray-500">
            Vide = pas de date limite.
          </span>
        </label>

        <label className="space-y-1">
          <span className="text-sm font-medium text-gray-300">Utilisations max</span>
          <input
            name="maxRedemptions"
            type="number"
            min="1"
            step="1"
            placeholder="1"
            className="w-full rounded-xl border border-white/10 bg-zinc-900 px-3 py-2 text-white outline-none focus:border-violet-400"
          />
          <span className="block text-xs text-gray-500">
            Vide = illimite. Mets 1 pour un bon unique.
          </span>
        </label>

        <label className="space-y-1">
          <span className="text-sm font-medium text-gray-300">Email client reserve</span>
          <input
            name="customerEmail"
            type="email"
            placeholder="client@email.fr"
            className="w-full rounded-xl border border-white/10 bg-zinc-900 px-3 py-2 text-white outline-none focus:border-violet-400"
          />
          <span className="block text-xs text-gray-500">
            Vide = utilisable par tout le monde.
          </span>
        </label>

        <label className="space-y-1">
          <span className="text-sm font-medium text-gray-300">Minimum commande</span>
          <input
            name="minimumAmountEuros"
            type="number"
            min="0"
            step="0.01"
            placeholder="0"
            className="w-full rounded-xl border border-white/10 bg-zinc-900 px-3 py-2 text-white outline-none focus:border-violet-400"
          />
          <span className="block text-xs text-gray-500">
            Hors frais de port.
          </span>
        </label>

        <div className="lg:col-span-2">
          <button
            type="submit"
            disabled={loading}
            className="rounded-xl bg-violet-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-violet-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading ? "Creation..." : "Creer le bon dans Stripe"}
          </button>
        </div>
      </form>

      {error ? (
        <div className="mt-4 rounded-xl border border-red-400/30 bg-red-500/10 p-3 text-sm text-red-100">
          {error}
        </div>
      ) : null}

      {result ? (
        <div className="mt-4 rounded-xl border border-emerald-400/30 bg-emerald-500/10 p-3 text-sm text-emerald-100">
          Code <span className="font-bold">{result.code}</span> cree dans Stripe.
        </div>
      ) : null}
    </section>
  );
}
