"use client";

import { useEffect, useState } from "react";

type Discount = {
  id: string;
  type: "percent" | "amount";
  label: string;
  note: string | null;
};

export default function AdminClientDiscounts({
  userId,
  clientLabel,
}: {
  userId: string;
  clientLabel: string;
}) {
  const [discounts, setDiscounts] = useState<Discount[] | null>(null);
  const [open, setOpen] = useState(false);
  const [type, setType] = useState<"percent" | "amount">("amount");
  const [percent, setPercent] = useState("10");
  const [amount, setAmount] = useState("5");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const res = await fetch(
          `/api/admin/user-discounts?userId=${encodeURIComponent(userId)}`,
        );
        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(data.error ?? "Erreur");
        if (!cancelled) setDiscounts(data.discounts ?? []);
      } catch (e) {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : "Erreur");
          setDiscounts([]);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [userId]);

  async function grant() {
    if (busy) return;

    setBusy(true);
    setError(null);

    try {
      const res = await fetch("/api/admin/user-discounts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId,
          type,
          percent: Number.parseInt(percent, 10),
          amount: Number.parseFloat(amount.replace(",", ".")),
          note: note.trim() || undefined,
        }),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error ?? "Erreur");

      setDiscounts((current) => [data.discount, ...(current ?? [])]);
      setNote("");
      setOpen(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erreur");
    } finally {
      setBusy(false);
    }
  }

  async function revoke(discountId: string) {
    setBusy(true);
    setError(null);

    try {
      const res = await fetch("/api/admin/user-discounts", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, discountId }),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error ?? "Erreur");

      setDiscounts((current) =>
        (current ?? []).filter((d) => d.id !== discountId),
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erreur");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mt-4 rounded-xl border border-violet-400/25 bg-violet-500/10 p-3">
      <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
        <div>
          <h3 className="text-sm font-bold text-white">Remises attribuees</h3>
          <p className="text-[11px] text-gray-300">
            Appliquees directement dans le panier de {clientLabel}, sans code a
            saisir.
          </p>
        </div>

        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className="rounded-full bg-violet-600 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-violet-700"
        >
          {open ? "Annuler" : "+ Remise"}
        </button>
      </div>

      {open ? (
        <div className="mb-3 grid gap-2 rounded-lg bg-black/20 p-3 sm:grid-cols-2">
          <label className="text-xs">
            <span className="mb-1 block text-gray-400">Type</span>
            <select
              value={type}
              onChange={(e) =>
                setType(e.target.value === "percent" ? "percent" : "amount")
              }
              className="h-9 w-full rounded border border-white/10 bg-zinc-950 px-2 text-white"
            >
              <option value="amount">Montant fixe</option>
              <option value="percent">Pourcentage</option>
            </select>
          </label>

          <label className="text-xs">
            <span className="mb-1 block text-gray-400">
              {type === "percent" ? "Pourcentage" : "Montant (EUR)"}
            </span>
            <input
              type="number"
              min={type === "percent" ? 1 : 0.5}
              step={type === "percent" ? 1 : 0.5}
              value={type === "percent" ? percent : amount}
              onChange={(e) =>
                type === "percent"
                  ? setPercent(e.target.value)
                  : setAmount(e.target.value)
              }
              className="h-9 w-full rounded border border-white/10 bg-zinc-950 px-2 text-white"
            />
          </label>

          <label className="text-xs sm:col-span-2">
            <span className="mb-1 block text-gray-400">Note interne</span>
            <input
              type="text"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Geste commercial colis retarde"
              className="h-9 w-full rounded border border-white/10 bg-zinc-950 px-2 text-white"
            />
          </label>

          <div className="sm:col-span-2">
            <button
              type="button"
              onClick={grant}
              disabled={busy}
              className="rounded bg-violet-600 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-violet-700 disabled:opacity-60"
            >
              {busy ? "..." : "Attribuer"}
            </button>
          </div>
        </div>
      ) : null}

      {error ? <p className="mb-2 text-xs text-red-400">{error}</p> : null}

      {discounts === null ? (
        <p className="text-xs text-gray-400">Chargement...</p>
      ) : discounts.length === 0 ? (
        <p className="text-xs text-gray-400">Aucune remise en attente.</p>
      ) : (
        <ul className="space-y-1">
          {discounts.map((discount) => (
            <li
              key={discount.id}
              className="flex items-center justify-between gap-2 rounded bg-black/20 px-2 py-1.5 text-xs"
            >
              <span className="text-emerald-200">
                {discount.label}
                {discount.note ? (
                  <span className="ml-2 text-gray-400">{discount.note}</span>
                ) : null}
              </span>

              <button
                type="button"
                onClick={() => revoke(discount.id)}
                disabled={busy}
                className="shrink-0 text-gray-400 transition hover:text-red-400 disabled:opacity-60"
              >
                Retirer
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
