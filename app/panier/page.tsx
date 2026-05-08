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
