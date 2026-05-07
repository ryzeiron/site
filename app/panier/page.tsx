"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import MondialRelayPicker, { type SelectedRelay } from "@/components/MondialRelayPicker";
import { useCart } from "@/lib/cart";
import { resolveVariant, type Card } from "@/lib/catalog";
import { formatPrice } from "@/lib/format";

type AppliedPromo =
  | { code: string; type: "percent_off"; percent: number; label: string }
  | { code: string; type: "free_shipping"; label: string };

export default function CartPage() {
  const items = useCart((s) => s.items);
  const setQuantity = useCart((s) => s.setQuantity);
  const remove = useCart((s) => s.remove);
  const clear = useCart((s) => s.clear);

  const [mounted, setMounted] = useState(false);
  const [loadingCards, setLoadingCards] = useState(true);
  const [cards, setCards] = useState<Record<string, Card>>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [promoInput, setPromoInput] = useState("");
  const [applyingPromo, setApplyingPromo] = useState(false);
  const [promoError, setPromoError] = useState<string | null>(null);
  const [appliedPromo, setAppliedPromo] = useState<AppliedPromo | null>(null);

  const [showRelayPicker, setShowRelayPicker] = useState(false);
  const [relayPostcode, setRelayPostcode] = useState("");
  const [selectedRelay, setSelectedRelay] = useState<SelectedRelay | null>(null);
  const [country, setCountry] = useState<
    "FR" | "BE" | "LU" | "NL" | "ES" | "PT" | "DE" | "IT" | "AT"
  >("FR");

  const COUNTRIES: { code: typeof country; label: string; price: string }[] = [
    { code: "FR", label: "France", price: "4,90 €" },
    { code: "BE", label: "Belgique", price: "6,90 €" },
    { code: "LU", label: "Luxembourg", price: "6,90 €" },
    { code: "ES", label: "Espagne", price: "6,90 €" },
    { code: "PT", label: "Portugal", price: "7,90 €" },
    { code: "NL", label: "Pays-Bas", price: "8,50 €" },
    { code: "DE", label: "Allemagne", price: "9,90 €" },
    { code: "IT", label: "Italie", price: "9,90 €" },
    { code: "AT", label: "Autriche", price: "11,90 €" },
  ];

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    if (!mounted) return;

    const ids = Array.from(new Set(items.map((i) => i.cardId)));

    if (ids.length === 0) {
      setCards({});
      setLoadingCards(false);
      return;
    }

    setLoadingCards(true);

    fetch("/api/cards/batch", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ids }),
    })
      .then((r) => r.json())
      .then((data: { cards?: Card[] }) => {
        const map: Record<string, Card> = {};
        for (const c of data.cards ?? []) map[c.id] = c;
        setCards(map);
      })
      .catch(() => setCards({}))
      .finally(() => setLoadingCards(false));
  }, [items, mounted]);

  const subtotal = useMemo(() => {
    return items.reduce((sum, item) => {
      const card = cards[item.cardId];
      if (!card) return sum;

      const v = resolveVariant(card, item.variant);
      return sum + v.price * item.quantity;
    }, 0);
  }, [items, cards]);

  const discount =
    appliedPromo?.type === "percent_off"
      ? (subtotal * appliedPromo.percent) / 100
      : 0;

  const total = Math.max(0, subtotal - discount);

  async function applyPromo() {
    if (!promoInput.trim()) return;

    setApplyingPromo(true);
    setPromoError(null);

    try {
      const res = await fetch("/api/promo", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: promoInput }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error ?? "Code invalide.");
      }

      setAppliedPromo(data.promo);
      setPromoError(null);
    } catch (e) {
      setAppliedPromo(null);
      setPromoError(e instanceof Error ? e.message : "Code invalide.");
    } finally {
      setApplyingPromo(false);
    }
  }

  function clearPromo() {
    setAppliedPromo(null);
    setPromoInput("");
    setPromoError(null);
  }

  async function handleCheckout() {
    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          items,
          promoCode: appliedPromo?.code,
          relay: selectedRelay,
          country,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error ?? "Erreur lors du paiement.");
      }

      window.location.href = data.url;
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erreur inconnue.");
      setLoading(false);
    }
  }

  if (!mounted || loadingCards) {
    return (
      <div className="py-12 text-center text-gray-400">
        Chargement du panier...
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="py-12 text-center">
        <h1 className="text-2xl font-bold text-white">Votre panier est vide</h1>
        <p className="mt-2 text-gray-300">Decouvrez nos cartes par bloc.</p>
        <Link
          href="/blocs"
          className="mt-6 inline-block rounded-full bg-brand-500 hover:bg-brand-600 text-white px-6 py-3 font-medium"
        >
          Parcourir le catalogue
        </Link>
      </div>
    );
  }

  return (
    <div>
      <h1 className="text-3xl font-bold text-white">Votre panier</h1>

      <div className="mt-6 space-y-3">
        {items.map((item) => {
          const card = cards[item.cardId];
          if (!card) return null;

          const v = resolveVariant(card, item.variant);
          const outOfStock = v.stock <= 0;

          return (
            <div
              key={`${item.cardId}-${item.variant}`}
              className="flex items-center gap-4 rounded-lg border border-white/10 bg-zinc-900/70 backdrop-blur-sm p-4 text-gray-200"
            >
              <div className="relative w-16 h-20 bg-gradient-to-br from-zinc-800 to-zinc-950 rounded flex items-center justify-center text-xs font-semibold text-gray-300 text-center px-1 overflow-hidden">
                {card.image ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={card.image}
                    alt={card.name}
                    className={`w-full h-full object-contain ${
                      outOfStock ? "opacity-40 grayscale" : ""
                    }`}
                  />
                ) : (
                  <span>{card.name}</span>
                )}

                {outOfStock && (
                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                    <span className="rounded bg-red-600 text-white text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 shadow -rotate-12">
                      Rupture
                    </span>
                  </div>
                )}
              </div>

              <div className="flex-1">
                <Link
                  href={`/carte/${card.id}`}
                  className="font-semibold hover:underline text-white"
                >
                  {card.name}
                </Link>
                <div className="text-xs text-gray-400">
                  {card.number} - {v.rarity} - {card.condition}
                </div>
                <div className="text-sm mt-1 text-gray-200">
                  {formatPrice(v.price)}
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() =>
                    setQuantity(card.id, item.variant, item.quantity - 1, v.stock)
                  }
                  className="w-8 h-8 rounded bg-white/10 hover:bg-white/20 text-white"
                  aria-label="Diminuer"
                >
                  -
                </button>

                <span className="w-8 text-center text-white">
                  {item.quantity}
                </span>

                <button
                  type="button"
                  onClick={() =>
                    setQuantity(card.id, item.variant, item.quantity + 1, v.stock)
                  }
                  disabled={item.quantity >= v.stock}
                  className="w-8 h-8 rounded bg-white/10 hover:bg-white/20 disabled:opacity-50 text-white"
                  aria-label="Augmenter"
                >
                  +
                </button>
              </div>

              <div className="w-20 text-right font-semibold text-white">
                {formatPrice(v.price * item.quantity)}
              </div>

              <button
                type="button"
                onClick={() => remove(card.id, item.variant)}
                className="text-xs text-gray-400 hover:text-red-400"
              >
                Retirer
              </button>
            </div>
          );
        })}
      </div>

      <div className="mt-6 rounded-lg border border-white/10 bg-zinc-900/70 backdrop-blur-sm p-4 text-gray-200">
        <div className="mb-3">
          <label className="text-sm text-gray-300">Code promo</label>

          {appliedPromo ? (
            <div className="mt-2 flex items-center gap-3 rounded bg-emerald-500/10 border border-emerald-500/30 px-3 py-2">
              <span className="text-sm text-emerald-300 font-medium">
                {appliedPromo.code.toUpperCase()} - {appliedPromo.label}
              </span>

              <button
                type="button"
                onClick={clearPromo}
                className="ml-auto text-xs text-gray-400 hover:text-red-400"
              >
                Retirer
              </button>
            </div>
          ) : (
            <div className="mt-2 flex flex-wrap gap-2">
              <input
                type="text"
                value={promoInput}
                onChange={(e) => setPromoInput(e.target.value)}
                placeholder="Entre ton code"
                className="flex-1 min-w-[180px] rounded bg-zinc-900 border border-white/10 text-white px-3 py-2 text-sm focus:outline-none focus:border-violet-400"
              />

              <button
                type="button"
                onClick={applyPromo}
                disabled={!promoInput.trim() || applyingPromo}
                className="rounded bg-violet-600 hover:bg-violet-700 disabled:opacity-60 text-white px-4 py-2 text-sm font-medium"
              >
                {applyingPromo ? "..." : "Appliquer"}
              </button>
            </div>
          )}

          {promoError && (
            <p className="mt-2 text-xs text-red-300">{promoError}</p>
          )}
        </div>

        <div className="mb-3 border-t border-white/10 pt-3">
          <label className="text-sm text-gray-300">Pays de livraison</label>

          <select
            value={country}
            onChange={(e) => setCountry(e.target.value as typeof country)}
            className="mt-2 w-full rounded bg-zinc-900 border border-white/10 text-white px-3 py-2 text-sm"
          >
            {COUNTRIES.map((c) => (
              <option key={c.code} value={c.code}>
                {c.label} - Mondial Relay {c.price}
              </option>
            ))}
          </select>

          <p className="text-xs text-gray-500 mt-1">
            Livraison via Mondial Relay uniquement.
          </p>
        </div>

        <div className="mb-3 border-t border-white/10 pt-3">
          <label className="text-sm text-gray-300">
            Point relais Mondial Relay (optionnel)
          </label>

          {selectedRelay ? (
            <div className="mt-2 rounded bg-emerald-500/10 border border-emerald-500/30 px-3 py-2 text-sm text-emerald-100">
              <div className="font-semibold">{selectedRelay.name}</div>

              <div className="text-xs text-emerald-200/80">
                {selectedRelay.address} - {selectedRelay.postcode}{" "}
                {selectedRelay.city}
              </div>

              <div className="text-xs text-emerald-200/60 mt-1">
                Code : {selectedRelay.code}
              </div>

              <button
                type="button"
                onClick={() => {
                  setSelectedRelay(null);
                  setShowRelayPicker(false);
                }}
                className="mt-2 text-xs text-gray-300 hover:text-red-300"
              >
                Retirer
              </button>
            </div>
          ) : showRelayPicker ? (
            <div className="mt-2 space-y-2">
              <div className="flex flex-wrap gap-2 items-center">
                <input
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  maxLength={5}
                  value={relayPostcode}
                  onChange={(e) =>
                    setRelayPostcode(e.target.value.replace(/[^0-9]/g, ""))
                  }
                  placeholder="Code postal"
                  className="w-32 rounded bg-zinc-900 border border-white/10 text-white px-3 py-2 text-sm"
                />

                <button
                  type="button"
                  onClick={() => setShowRelayPicker(false)}
                  className="text-xs text-gray-400 hover:text-white"
                >
                  Annuler
                </button>
              </div>

              {relayPostcode.length === 5 && (
                <MondialRelayPicker
                  postcode={relayPostcode}
                  onSelect={(r) => {
                    if (r) setSelectedRelay(r);
                  }}
                />
              )}

              <p className="text-xs text-gray-500">
                Saisis ton code postal puis choisis un point relais sur la
                carte.
              </p>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setShowRelayPicker(true)}
              className="mt-2 rounded border border-dashed border-white/20 text-gray-300 hover:text-white hover:border-white/40 px-3 py-2 text-sm"
            >
              + Choisir mon point relais
            </button>
          )}

          <p className="text-xs text-gray-500 mt-1">
           Livraison via Mondial Relay uniquement.
          </p>
        </div>

        <div className="border-t border-white/10 pt-3 space-y-1 text-sm">
          <div className="flex items-center justify-between text-gray-300">
            <span>Sous-total</span>
            <span>{formatPrice(subtotal)}</span>
          </div>

          {discount > 0 && (
            <div className="flex items-center justify-between text-emerald-300">
              <span>Reduction ({appliedPromo?.code})</span>
              <span>- {formatPrice(discount)}</span>
            </div>
          )}

          {appliedPromo?.type === "free_shipping" && (
            <div className="flex items-center justify-between text-emerald-300">
              <span>Livraison</span>
              <span>Offerte</span>
            </div>
          )}
        </div>

        <div className="mt-2 flex items-center justify-between text-lg">
          <span>Total</span>
          <strong className="text-white">{formatPrice(total)}</strong>
        </div>

        <p className="text-xs text-gray-400 mt-1">
          {appliedPromo?.type === "free_shipping"
            ? "Frais de livraison offerts a l'etape de paiement."
            : "Les frais de livraison sont calcules a l'etape de paiement."}
        </p>

        {error && (
          <p className="mt-3 text-sm text-red-300 bg-red-500/10 border border-red-500/30 rounded p-2">
            {error}
          </p>
        )}

        <div className="mt-4 flex flex-wrap gap-3">
          <button
            type="button"
            onClick={handleCheckout}
            disabled={loading}
            className="rounded-full bg-brand-500 hover:bg-brand-600 disabled:opacity-60 text-white px-6 py-3 font-medium"
          >
            {loading ? "Redirection..." : "Passer au paiement"}
          </button>

          <button
            type="button"
            onClick={() => clear()}
            className="rounded-full bg-white/10 border border-white/20 hover:bg-white/20 text-white px-6 py-3 text-sm"
          >
            Vider le panier
          </button>
        </div>
      </div>
    </div>
  );
}
