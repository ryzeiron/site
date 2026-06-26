"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import ConditionBadge from "@/components/ConditionBadge";
import MondialRelayPicker, {
  type SelectedRelay,
} from "@/components/MondialRelayPicker";
import { isCardCartItem, isSleeveCartItem, useCart } from "@/lib/cart";
import { resolveVariant, type Card } from "@/lib/catalog";
import { formatPrice } from "@/lib/format";
import {
  MONDIAL_RELAY_MAX_INSURANCE_CENTS,
  getMondialRelayInsurance,
} from "@/lib/mondial-relay-shipping";
import { isPromoExcludedCard } from "@/lib/promo-exclusions";

type AppliedPromo =
  | {
      code: string;
      source?: "local" | "stripe";
      type: "percent_off";
      percent: number;
      label: string;
    }
  | {
      code: string;
      source?: "local" | "stripe";
      type: "free_shipping";
      label: string;
    }
  | {
      code: string;
      source?: "stripe";
      type: "amount_off";
      amountOffCents: number;
      currency: "eur";
      label: string;
    };

type SleeveProduct = {
  id: string;
  name: string;
  description: string | null;
  image: string | null;
  priceCents: number;
  stock: number;
  active: boolean;
};

type DeliveryProfileResponse = {
  authenticated?: boolean;
  profile?: {
    postcode?: string | null;
    city?: string | null;
    country?: string | null;
    relayCode?: string | null;
    relayName?: string | null;
    relayAddress?: string | null;
    relayPostcode?: string | null;
    relayCity?: string | null;
  } | null;
};

type Country = "FR" | "BE" | "LU" | "NL" | "ES" | "PT" | "DE" | "IT" | "AT";

const PROMO_NO_ELIGIBLE_ITEMS_MESSAGE =
  "Code valide, mais aucun article de ce panier n'est eligible a cette offre.";

const MR_PRICE_BY_COUNTRY: Record<Country, number> = {
  FR: 490,
  BE: 690,
  LU: 690,
  NL: 850,
  ES: 690,
  PT: 790,
  DE: 990,
  IT: 990,
  AT: 1190,
};

function isCountry(value: unknown): value is Country {
  return (
    typeof value === "string" &&
    Object.prototype.hasOwnProperty.call(MR_PRICE_BY_COUNTRY, value)
  );
}

function getRelayPostcodeLength(country: Country) {
  return country === "BE" ? 4 : 5;
}

export default function CartPage() {
  const items = useCart((s) => s.items);
  const cartId = useCart((s) => s.cartId);
  const setQuantity = useCart((s) => s.setQuantity);
  const remove = useCart((s) => s.remove);
  const setSleeveQuantity = useCart((s) => s.setSleeveQuantity);
  const removeSleeve = useCart((s) => s.removeSleeve);
  const clear = useCart((s) => s.clear);

  const [mounted, setMounted] = useState(false);
  const [loadingCards, setLoadingCards] = useState(true);
  const [cards, setCards] = useState<Record<string, Card>>({});
  const [sleeves, setSleeves] = useState<Record<string, SleeveProduct>>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [promoInput, setPromoInput] = useState("");
  const [applyingPromo, setApplyingPromo] = useState(false);
  const [promoError, setPromoError] = useState<string | null>(null);
  const [appliedPromo, setAppliedPromo] = useState<AppliedPromo | null>(null);

  const [showRelayPicker, setShowRelayPicker] = useState(false);
  const [relayPostcode, setRelayPostcode] = useState("");
  const [selectedRelay, setSelectedRelay] = useState<SelectedRelay | null>(
    null,
  );
  const [acceptedCgv, setAcceptedCgv] = useState(false);
  const [country, setCountry] = useState<Country>("FR");

  const expectedRelayPostcodeLength = getRelayPostcodeLength(country);

  const COUNTRIES: { code: Country; label: string; price: string }[] = [
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

    let cancelled = false;

    fetch("/api/account/delivery-profile")
      .then((r) => (r.ok ? r.json() : null))
      .then((data: DeliveryProfileResponse | null) => {
        if (cancelled) return;

        const profile = data?.profile;
        if (!profile) return;

        const profileCountry = isCountry(profile.country)
          ? profile.country
          : "FR";

        setCountry(profileCountry);

        const preferredPostcode =
          profile.relayPostcode ?? profile.postcode ?? "";

        if (preferredPostcode) {
          setRelayPostcode(
            preferredPostcode
              .replace(/[^0-9]/g, "")
              .slice(0, getRelayPostcodeLength(profileCountry)),
          );
        }

        if (profile.relayCode) {
          setSelectedRelay({
            code: profile.relayCode,
            name: profile.relayName ?? "Point relais favori",
            address: profile.relayAddress ?? "",
            postcode: profile.relayPostcode ?? profile.postcode ?? "",
            city: profile.relayCity ?? profile.city ?? "",
          });
          setShowRelayPicker(false);
        }
      })
      .catch(() => {});

    return () => {
      cancelled = true;
    };
  }, [mounted]);

  const cardItems = useMemo(() => items.filter(isCardCartItem), [items]);
  const sleeveItems = useMemo(() => items.filter(isSleeveCartItem), [items]);

  useEffect(() => {
    if (!mounted) return;

    const ids = Array.from(new Set(cardItems.map((i) => i.cardId)));

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
  }, [cardItems, mounted]);

  useEffect(() => {
    if (!mounted) return;

    const ids = Array.from(new Set(sleeveItems.map((i) => i.sleeveId)));

    if (ids.length === 0) {
      setSleeves({});
      return;
    }

    fetch("/api/sleeves/batch", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ids }),
    })
      .then((r) => r.json())
      .then((data: { sleeves?: SleeveProduct[] }) => {
        const map: Record<string, SleeveProduct> = {};
        for (const sleeve of data.sleeves ?? []) map[sleeve.id] = sleeve;
        setSleeves(map);
      })
      .catch(() => setSleeves({}));
  }, [sleeveItems, mounted]);

  const subtotal = useMemo(() => {
    const cardsTotal = cardItems.reduce((sum, item) => {
      const card = cards[item.cardId];
      if (!card) return sum;

      const v = resolveVariant(card, item.variant);
      return sum + v.price * item.quantity;
    }, 0);

    const sleevesTotal = sleeveItems.reduce((sum, item) => {
      const sleeve = sleeves[item.sleeveId];
      if (!sleeve) return sum;

      return sum + (sleeve.priceCents / 100) * item.quantity;
    }, 0);

    return cardsTotal + sleevesTotal;
  }, [cardItems, sleeveItems, cards, sleeves]);

  const promoEligibleSubtotal = useMemo(() => {
    const cardsTotal = cardItems.reduce((sum, item) => {
      if (isPromoExcludedCard(item.cardId)) return sum;

      const card = cards[item.cardId];
      if (!card) return sum;

      const v = resolveVariant(card, item.variant);
      return sum + v.price * item.quantity;
    }, 0);

    const sleevesTotal = sleeveItems.reduce((sum, item) => {
      const sleeve = sleeves[item.sleeveId];
      if (!sleeve) return sum;

      return sum + (sleeve.priceCents / 100) * item.quantity;
    }, 0);

    return cardsTotal + sleevesTotal;
  }, [cardItems, sleeveItems, cards, sleeves]);

  const hasPromoExcludedItems = cardItems.some((item) =>
    isPromoExcludedCard(item.cardId),
  );
  const hasPromoEligibleItems =
    sleeveItems.length > 0 ||
    cardItems.some((item) => !isPromoExcludedCard(item.cardId));

  const discount =
    appliedPromo?.type === "percent_off"
      ? (promoEligibleSubtotal * appliedPromo.percent) / 100
      : appliedPromo?.type === "amount_off"
        ? Math.min(subtotal, appliedPromo.amountOffCents / 100)
        : 0;

  const subtotalCents = Math.round(subtotal * 100);
  const discountCents = Math.round(discount * 100);
  const totalCents = Math.max(0, subtotalCents - discountCents);
  const shippingBaseCents = MR_PRICE_BY_COUNTRY[country];
  const shippingCents =
    appliedPromo?.type === "free_shipping" ? 0 : shippingBaseCents;
  const mondialRelayInsurance = getMondialRelayInsurance(totalCents);
  const insuranceFeeCents =
    appliedPromo?.type === "free_shipping"
      ? 0
      : (mondialRelayInsurance?.feeCents ?? 0);
  const estimatedTotalCents = totalCents + shippingCents + insuranceFeeCents;
  const estimatedTotal = estimatedTotalCents / 100;
  const requiresManualShipping = totalCents > MONDIAL_RELAY_MAX_INSURANCE_CENTS;
  const itemCount = items.reduce((sum, item) => sum + item.quantity, 0);
  const checkoutDisabled =
    loading || !selectedRelay || !acceptedCgv || requiresManualShipping;
  const checkoutLabel = loading
    ? "Redirection..."
    : requiresManualShipping
      ? "Nous contacter"
      : selectedRelay
        ? acceptedCgv
          ? "Passer au paiement"
          : "Accepter les CGV"
        : "Choisir un point relais";

  useEffect(() => {
    if (appliedPromo?.type !== "percent_off" || hasPromoEligibleItems) return;

    setAppliedPromo(null);
    setPromoError(PROMO_NO_ELIGIBLE_ITEMS_MESSAGE);
  }, [appliedPromo, hasPromoEligibleItems]);

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

      const promo = data.promo as AppliedPromo;

      if (promo.type === "percent_off" && !hasPromoEligibleItems) {
        setAppliedPromo(null);
        setPromoError(PROMO_NO_ELIGIBLE_ITEMS_MESSAGE);
        return;
      }

      setAppliedPromo(promo);
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
    setError(null);

    if (!selectedRelay) {
      setShowRelayPicker(true);
      setError(
        "Choisis un point relais Mondial Relay avant de passer au paiement.",
      );
      return;
    }

    if (!acceptedCgv) {
      setError("Tu dois accepter les CGV avant de passer au paiement.");
      return;
    }

    setLoading(true);

    try {
      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          items: cardItems,
          sleeveItems,
          cartId,
          promoCode:
            appliedPromo?.type === "percent_off" && !hasPromoEligibleItems
              ? undefined
              : appliedPromo?.code,
          relay: selectedRelay,
          country,
          acceptedCgv,
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
          className="mt-6 inline-block bg-brand-500 hover:bg-brand-600 text-white px-6 py-3 font-medium rounded-full"
        >
          Parcourir le catalogue
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6 py-2 pb-28 lg:pb-2">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold text-white">Votre panier</h1>
          <p className="mt-2 text-sm text-gray-400">
            {itemCount} article{itemCount > 1 ? "s" : ""} dans votre panier.
          </p>
        </div>

        <Link
          href="/blocs"
          className="rounded-full bg-white/10 px-4 py-2 text-sm font-medium text-white transition hover:bg-white/20"
        >
          Continuer mes achats
        </Link>
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_26rem] lg:items-start">
        <section className="space-y-3">
          <div className="rounded-2xl border border-violet-300/15 bg-zinc-950/70 p-4 text-sm text-gray-300">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <div className="font-semibold text-white">
                  Articles sélectionnés
                </div>
                <div className="mt-1 text-xs text-gray-500">
                  Vérifiez les variantes, les états et les quantités avant le
                  paiement.
                </div>
              </div>
              <div className="rounded-full bg-violet-500/15 px-3 py-1 text-xs font-semibold text-violet-100">
                {cardItems.length} carte{cardItems.length > 1 ? "s" : ""} /{" "}
                {sleeveItems.length} sleeve{sleeveItems.length > 1 ? "s" : ""}
              </div>
            </div>
          </div>

          {cardItems.map((item) => {
            const card = cards[item.cardId];
            if (!card) return null;

            const v = resolveVariant(card, item.variant);
            const myAvailable = v.stock + item.quantity;
            const outOfStock = myAvailable <= 0;

            return (
              <div
                key={`${item.cardId}-${item.variant}`}
                className="flex flex-col gap-3 rounded-xl border border-white/10 bg-zinc-900/70 p-3 text-gray-200 backdrop-blur-sm sm:flex-row sm:items-center sm:gap-4 sm:rounded-2xl sm:p-4"
              >
                <div className="relative flex h-16 w-12 shrink-0 items-center justify-center overflow-hidden rounded bg-gradient-to-br from-zinc-800 to-zinc-950 px-1 text-center text-xs font-semibold text-gray-300 sm:h-20 sm:w-16">
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

                <div className="min-w-0 flex-1">
                  <Link
                    href={`/carte/${card.id}`}
                    className="font-semibold hover:underline text-white"
                  >
                    {card.name}
                  </Link>
                  <div className="mt-1 flex flex-wrap items-center gap-1.5 text-xs text-gray-400">
                    <span>{card.number}</span>
                    <span className="inline-flex items-center rounded-full bg-amber-500/20 px-2 py-1 font-medium text-amber-300">
                      {v.rarity}
                    </span>
                    <ConditionBadge condition={v.condition ?? card.condition} />
                  </div>
                  <div className="text-sm mt-1 text-gray-200">
                    {formatPrice(v.price)}
                  </div>
                </div>

                <div className="flex items-center gap-2 rounded-full border border-white/10 bg-zinc-950/70 p-1">
                  <button
                    type="button"
                    onClick={() =>
                      setQuantity(
                        card.id,
                        item.variant,
                        item.quantity - 1,
                        myAvailable,
                      )
                    }
                    className="h-8 w-8 rounded-full bg-white/10 text-white hover:bg-white/20"
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
                      setQuantity(
                        card.id,
                        item.variant,
                        item.quantity + 1,
                        myAvailable,
                      )
                    }
                    disabled={item.quantity >= myAvailable}
                    className="h-8 w-8 rounded-full bg-white/10 text-white hover:bg-white/20 disabled:opacity-50"
                    aria-label="Augmenter"
                  >
                    +
                  </button>
                </div>

                <div className="w-full text-right text-lg font-semibold text-white sm:w-24">
                  {formatPrice(v.price * item.quantity)}
                </div>

                <button
                  type="button"
                  onClick={() => remove(card.id, item.variant)}
                  className="rounded-full bg-white/10 px-3 py-2 text-xs text-gray-300 hover:bg-red-500/15 hover:text-red-300"
                >
                  Retirer
                </button>
              </div>
            );
          })}

          {sleeveItems.map((item) => {
            const sleeve = sleeves[item.sleeveId];
            if (!sleeve) return null;

            const myAvailable = sleeve.stock + item.quantity;
            const outOfStock = myAvailable <= 0;
            const price = sleeve.priceCents / 100;

            return (
              <div
                key={`sleeve-${item.sleeveId}`}
                className="flex flex-col gap-3 rounded-xl border border-white/10 bg-zinc-900/70 p-3 text-gray-200 backdrop-blur-sm sm:flex-row sm:items-center sm:gap-4 sm:rounded-2xl sm:p-4"
              >
                <div className="relative flex h-16 w-12 shrink-0 items-center justify-center overflow-hidden rounded bg-gradient-to-br from-violet-950 to-zinc-950 px-1 text-center text-xs font-semibold text-violet-200 sm:h-20 sm:w-16">
                  {sleeve.image ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={sleeve.image}
                      alt={sleeve.name}
                      className={`h-full w-full object-contain ${
                        outOfStock ? "opacity-40 grayscale" : ""
                      }`}
                    />
                  ) : (
                    <span>Sleeve</span>
                  )}

                  {outOfStock && (
                    <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
                      <span className="rounded bg-red-600 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-white shadow -rotate-12">
                        Rupture
                      </span>
                    </div>
                  )}
                </div>

                <div className="min-w-0 flex-1">
                  <Link
                    href="/sleeve"
                    className="font-semibold text-white hover:underline"
                  >
                    {sleeve.name}
                  </Link>
                  <div className="mt-1 flex flex-wrap items-center gap-1.5 text-xs text-gray-400">
                    <span className="inline-flex items-center rounded-full bg-violet-500/20 px-2 py-1 font-medium text-violet-300">
                      Sleeve
                    </span>
                    <span>{sleeve.stock} en stock</span>
                  </div>
                  <div className="mt-1 text-sm text-gray-200">
                    {formatPrice(price)}
                  </div>
                </div>

                <div className="flex items-center gap-2 rounded-full border border-white/10 bg-zinc-950/70 p-1">
                  <button
                    type="button"
                    onClick={() =>
                      setSleeveQuantity(
                        sleeve.id,
                        item.quantity - 1,
                        myAvailable,
                      )
                    }
                    className="h-8 w-8 rounded-full bg-white/10 text-white hover:bg-white/20"
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
                      setSleeveQuantity(
                        sleeve.id,
                        item.quantity + 1,
                        myAvailable,
                      )
                    }
                    disabled={item.quantity >= myAvailable}
                    className="h-8 w-8 rounded-full bg-white/10 text-white hover:bg-white/20 disabled:opacity-50"
                    aria-label="Augmenter"
                  >
                    +
                  </button>
                </div>

                <div className="w-full text-right text-lg font-semibold text-white sm:w-24">
                  {formatPrice(price * item.quantity)}
                </div>

                <button
                  type="button"
                  onClick={() => removeSleeve(sleeve.id)}
                  className="rounded-full bg-white/10 px-3 py-2 text-xs text-gray-300 hover:bg-red-500/15 hover:text-red-300"
                >
                  Retirer
                </button>
              </div>
            );
          })}
        </section>

        <aside className="rounded-2xl border border-violet-300/15 bg-zinc-950/85 p-5 text-gray-200 shadow-2xl shadow-black/20 backdrop-blur-sm lg:sticky lg:top-24">
          <div className="mb-4 flex items-center justify-between gap-3">
            <div>
              <h2 className="text-xl font-bold text-white">Résumé</h2>
              <p className="mt-1 text-xs text-gray-500">
                Paiement sécurisé et livraison Mondial Relay.
              </p>
            </div>
            <span className="rounded-full bg-brand-500/15 px-3 py-1 text-xs font-semibold text-brand-200">
              {itemCount} article{itemCount > 1 ? "s" : ""}
            </span>
          </div>

          <div className="mb-4 grid gap-2 text-xs text-gray-300">
            <div className="rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2">
              Paiement sécurisé par Stripe
            </div>
            <div className="rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2">
              Cartes protégées avant expédition
            </div>
            <div className="rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2">
              Livraison suivie en point relais
            </div>
          </div>

          <div className="mb-4 rounded-xl border border-violet-300/15 bg-violet-500/10 p-3 text-xs text-violet-100">
            <div className="font-semibold text-white">Paiement en 3 etapes</div>
            <div className="mt-2 grid gap-2">
              <div>1. Choisir le pays et le point relais.</div>
              <div>2. Verifier le total, l'assurance et les CGV.</div>
              <div>3. Payer sur Stripe, puis suivre la commande.</div>
            </div>
          </div>

          <div className="mb-3">
            <label className="text-sm text-gray-300">
              Code promo ou bon d'achat
            </label>

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

            {appliedPromo?.type === "percent_off" && hasPromoExcludedItems && (
              <p className="mt-2 text-xs text-amber-200">
                Certaines cartes du panier sont exclues de cette offre.
              </p>
            )}
          </div>

          <div className="mb-3 border-t border-white/10 pt-3">
            <label className="text-sm text-gray-300">Pays de livraison</label>

            <select
              value={country}
              onChange={(e) => {
                const nextCountry = e.target.value as Country;
                setCountry(nextCountry);
                setRelayPostcode("");
                setSelectedRelay(null);
                setShowRelayPicker(false);
              }}
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

            {requiresManualShipping ? (
              <p className="mt-2 rounded-lg border border-red-400/30 bg-red-500/10 px-3 py-2 text-xs text-red-100">
                Pour une commande supérieure à 500 €, contacte-nous afin
                d'organiser une livraison assurée adaptée.
              </p>
            ) : mondialRelayInsurance ? (
              <p className="mt-2 rounded-lg border border-violet-400/25 bg-violet-500/10 px-3 py-2 text-xs text-violet-100">
                Assurance Mondial Relay automatique jusqu'à{" "}
                {formatPrice(mondialRelayInsurance.coverageCents / 100)} à
                l'étape de paiement
                {appliedPromo?.type === "free_shipping"
                  ? " (incluse dans la livraison offerte)."
                  : ` (+${formatPrice(
                      mondialRelayInsurance.feeCents / 100,
                    )}).`}
              </p>
            ) : (
              <p className="mt-2 text-xs text-gray-500">
                À partir de 50 € de panier, une assurance Mondial Relay est
                ajoutée automatiquement.
              </p>
            )}
          </div>

          <div className="mb-3 border-t border-white/10 pt-3">
            <label className="text-sm text-gray-300">
              Point relais Mondial Relay (obligatoire)
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
                    maxLength={expectedRelayPostcodeLength}
                    value={relayPostcode}
                    onChange={(e) =>
                      setRelayPostcode(
                        e.target.value
                          .replace(/[^0-9]/g, "")
                          .slice(0, expectedRelayPostcodeLength),
                      )
                    }
                    placeholder={country === "BE" ? "Ex : 1000" : "Code postal"}
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

                {relayPostcode.length === expectedRelayPostcodeLength && (
                  <MondialRelayPicker
                    postcode={relayPostcode}
                    country={country}
                    onSelect={(r) => {
                      if (r) setSelectedRelay(r);
                    }}
                  />
                )}

                <p className="text-xs text-gray-500">
                  Saisis ton code postal puis choisis un point relais sur la
                  carte.
                  {country === "BE" &&
                    " Pour la Belgique, le code postal contient 4 chiffres."}
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

            {!selectedRelay && (
              <p className="mt-2 text-xs text-yellow-300">
                Tu dois choisir un point relais avant de passer au paiement.
              </p>
            )}
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

            <div className="flex items-center justify-between text-gray-300">
              <span>Livraison Mondial Relay</span>
              <span
                className={
                  appliedPromo?.type === "free_shipping"
                    ? "text-emerald-300"
                    : "text-gray-200"
                }
              >
                {appliedPromo?.type === "free_shipping"
                  ? "Offerte"
                  : formatPrice(shippingBaseCents / 100)}
              </span>
            </div>

            {mondialRelayInsurance && (
              <div className="flex items-center justify-between text-violet-200">
                <span>Assurance Mondial Relay</span>
                <span>
                  {appliedPromo?.type === "free_shipping"
                    ? "Offerte"
                    : `+ ${formatPrice(
                        mondialRelayInsurance.feeCents / 100,
                      )}`}
                </span>
              </div>
            )}
          </div>

          <div className="mt-4 border-t border-white/10 pt-3">
            <label className="flex items-start gap-3 rounded-lg border border-white/10 bg-zinc-950/50 p-3 text-sm text-gray-200">
              <input
                type="checkbox"
                checked={acceptedCgv}
                onChange={(e) => setAcceptedCgv(e.target.checked)}
                className="mt-1 h-4 w-4 rounded border-white/20 bg-zinc-900 accent-brand-500"
              />

              <span>
                J'accepte les{" "}
                <Link
                  href="/cgv"
                  className="text-brand-300 underline hover:text-brand-200"
                >
                  conditions générales de vente
                </Link>{" "}
                (CGV) et je comprends que cette acceptation est obligatoire pour
                passer au paiement.
              </span>
            </label>

            {!acceptedCgv && (
              <p className="mt-2 text-xs text-yellow-300">
                Tu dois accepter les CGV avant de passer au paiement.
              </p>
            )}
          </div>

          <div className="mt-2 flex items-center justify-between text-lg">
            <span>Total estime</span>
            <strong className="text-white">{formatPrice(estimatedTotal)}</strong>
          </div>

          <p className="text-xs text-gray-400 mt-1">
            {appliedPromo?.type === "free_shipping"
              ? "Livraison et assurance offertes par le code promo."
              : "Total indicatif avec la livraison et l'assurance applicable."}
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
              disabled={checkoutDisabled}
              className="rounded-full bg-brand-500 hover:bg-brand-600 disabled:opacity-60 text-white px-6 py-3 font-medium"
            >
              {checkoutLabel}
            </button>

            <button
              type="button"
              onClick={() => clear()}
              className="rounded-full bg-white/10 border border-white/20 hover:bg-white/20 text-white px-6 py-3 text-sm"
            >
              Vider le panier
            </button>
          </div>
        </aside>
      </div>

      <div className="fixed inset-x-0 bottom-0 z-[420] border-t border-violet-300/20 bg-zinc-950/95 px-4 py-3 shadow-2xl shadow-black/60 backdrop-blur lg:hidden">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-3">
          <div className="min-w-0">
            <div className="text-xs text-gray-400">Total estime</div>
            <div className="truncate text-lg font-extrabold text-white">
              {formatPrice(estimatedTotal)}
            </div>
          </div>

          <button
            type="button"
            onClick={handleCheckout}
            disabled={checkoutDisabled}
            className="min-h-11 rounded-full bg-brand-500 px-5 text-sm font-semibold text-white transition hover:bg-brand-600 disabled:opacity-60"
          >
            {checkoutLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
