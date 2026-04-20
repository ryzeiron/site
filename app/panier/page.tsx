"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useCart } from "@/lib/cart";
import { getCard } from "@/lib/catalog";
import { formatPrice } from "@/lib/format";

export default function CartPage() {
  const items = useCart((s) => s.items);
  const setQuantity = useCart((s) => s.setQuantity);
  const remove = useCart((s) => s.remove);
  const clear = useCart((s) => s.clear);
  const totalCents = useCart((s) => s.totalCents());

  const [mounted, setMounted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => setMounted(true), []);

  async function handleCheckout() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ items }),
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

  if (!mounted) {
    return <div className="py-12 text-center text-gray-400">Chargement du panier...</div>;
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
          const card = getCard(item.cardId);
          if (!card) return null;
          return (
            <div
              key={item.cardId}
              className="flex items-center gap-4 rounded-lg border border-white/10 bg-zinc-900/70 backdrop-blur-sm p-4 text-gray-200"
            >
              <div className="relative w-16 h-20 bg-gradient-to-br from-zinc-800 to-zinc-950 rounded flex items-center justify-center text-xs font-semibold text-gray-300 text-center px-1 overflow-hidden">
                {card.image ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={card.image}
                    alt={card.name}
                    className={`w-full h-full object-contain ${card.stock <= 0 ? "opacity-40 grayscale" : ""}`}
                  />
                ) : (
                  <span>{card.name}</span>
                )}
                {card.stock <= 0 && (
                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                    <span className="rounded bg-red-600 text-white text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 shadow -rotate-12">
                      Rupture
                    </span>
                  </div>
                )}
              </div>
              <div className="flex-1">
                <Link href={`/carte/${card.id}`} className="font-semibold hover:underline text-white">
                  {card.name}
                </Link>
                <div className="text-xs text-gray-400">
                  {card.number} - {card.rarity} - {card.condition}
                </div>
                <div className="text-sm mt-1 text-gray-200">{formatPrice(card.priceCents)}</div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setQuantity(card.id, item.quantity - 1)}
                  className="w-8 h-8 rounded bg-white/10 hover:bg-white/20 text-white"
                  aria-label="Diminuer"
                >
                  -
                </button>
                <span className="w-8 text-center text-white">{item.quantity}</span>
                <button
                  type="button"
                  onClick={() => setQuantity(card.id, item.quantity + 1)}
                  disabled={item.quantity >= card.stock}
                  className="w-8 h-8 rounded bg-white/10 hover:bg-white/20 disabled:opacity-50 text-white"
                  aria-label="Augmenter"
                >
                  +
                </button>
              </div>
              <div className="w-20 text-right font-semibold text-white">
                {formatPrice(card.priceCents * item.quantity)}
              </div>
              <button
                type="button"
                onClick={() => remove(card.id)}
                className="text-xs text-gray-400 hover:text-red-400"
              >
                Retirer
              </button>
            </div>
          );
        })}
      </div>

      <div className="mt-6 rounded-lg border border-white/10 bg-zinc-900/70 backdrop-blur-sm p-4 text-gray-200">
        <div className="flex items-center justify-between text-lg">
          <span>Total</span>
          <strong className="text-white">{formatPrice(totalCents)}</strong>
        </div>
        <p className="text-xs text-gray-400 mt-1">
          Les frais de livraison sont calcules a l&apos;etape de paiement.
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
