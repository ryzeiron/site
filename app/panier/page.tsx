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
    return <div className="py-12 text-center text-gray-500">Chargement du panier...</div>;
  }

  if (items.length === 0) {
    return (
      <div className="py-12 text-center">
        <h1 className="text-2xl font-bold">Votre panier est vide</h1>
        <p className="mt-2 text-gray-600">Decouvrez nos cartes par bloc.</p>
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
      <h1 className="text-3xl font-bold">Votre panier</h1>

      <div className="mt-6 space-y-3">
        {items.map((item) => {
          const card = getCard(item.cardId);
          if (!card) return null;
          return (
            <div
              key={item.cardId}
              className="flex items-center gap-4 rounded-lg border border-amber-100 bg-white p-4"
            >
              <div className="w-16 h-20 bg-gradient-to-br from-amber-100 to-orange-100 rounded flex items-center justify-center text-xs font-semibold text-amber-800 text-center px-1 overflow-hidden">
                {card.image ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={card.image}
                    alt={card.name}
                    className="w-full h-full object-contain"
                  />
                ) : (
                  <span>{card.name}</span>
                )}
              </div>
              <div className="flex-1">
                <Link href={`/carte/${card.id}`} className="font-semibold hover:underline">
                  {card.name}
                </Link>
                <div className="text-xs text-gray-500">
                  n {card.number} - {card.rarity} - {card.condition}
                </div>
                <div className="text-sm mt-1">{formatPrice(card.priceCents)}</div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setQuantity(card.id, item.quantity - 1)}
                  className="w-8 h-8 rounded bg-gray-100 hover:bg-gray-200"
                  aria-label="Diminuer"
                >
                  -
                </button>
                <span className="w-8 text-center">{item.quantity}</span>
                <button
                  type="button"
                  onClick={() => setQuantity(card.id, item.quantity + 1)}
                  disabled={item.quantity >= card.stock}
                  className="w-8 h-8 rounded bg-gray-100 hover:bg-gray-200 disabled:opacity-50"
                  aria-label="Augmenter"
                >
                  +
                </button>
              </div>
              <div className="w-20 text-right font-semibold">
                {formatPrice(card.priceCents * item.quantity)}
              </div>
              <button
                type="button"
                onClick={() => remove(card.id)}
                className="text-xs text-gray-500 hover:text-red-600"
              >
                Retirer
              </button>
            </div>
          );
        })}
      </div>

      <div className="mt-6 rounded-lg border border-amber-200 bg-amber-50 p-4">
        <div className="flex items-center justify-between text-lg">
          <span>Total</span>
          <strong>{formatPrice(totalCents)}</strong>
        </div>
        <p className="text-xs text-gray-500 mt-1">
          Les frais de livraison sont calcules a l&apos;etape de paiement.
        </p>

        {error && (
          <p className="mt-3 text-sm text-red-700 bg-red-50 border border-red-200 rounded p-2">
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
            className="rounded-full bg-white border border-gray-300 hover:bg-gray-50 px-6 py-3 text-sm"
          >
            Vider le panier
          </button>
        </div>
      </div>
    </div>
  );
}
