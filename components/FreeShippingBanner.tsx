"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { formatPrice } from "@/lib/format";
import {
  formatPromoDate,
  isFreeShippingPromoLive,
  sanitizeFreeShippingPromo,
  type FreeShippingPromo,
} from "@/lib/free-shipping-promo-shared";

// Bandeau affiche seulement pendant la promo livraison offerte (admin > Promos).
// Il apparait / disparait tout seul a l'heure de debut et de fin.
export default function FreeShippingBanner() {
  const [promo, setPromo] = useState<FreeShippingPromo | null>(null);
  const [now, setNow] = useState(0);

  useEffect(() => {
    let cancelled = false;

    fetch("/api/free-shipping", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .then((data: unknown) => {
        if (!cancelled && data) setPromo(sanitizeFreeShippingPromo(data));
      })
      .catch(() => {});

    setNow(Date.now());
    const timer = window.setInterval(() => setNow(Date.now()), 30_000);
    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, []);

  if (!promo || now === 0 || !isFreeShippingPromoLive(promo, now)) return null;

  return (
    <div className="relative z-[150] border-b border-emerald-300/20 bg-gradient-to-r from-emerald-900 via-emerald-700 to-teal-700 text-white">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-center gap-x-3 gap-y-1 px-4 py-2 text-center text-xs sm:text-sm">
        <span className="rounded-full bg-white/15 px-3 py-1 font-black tracking-wide ring-1 ring-white/20">
          LIVRAISON OFFERTE
        </span>
        <span className="font-semibold">
          {promo.insuranceIncluded
            ? "Frais de port et assurance offerts"
            : "Frais de port offerts"}
          {promo.minItemsCents > 0
            ? ` dès ${formatPrice(promo.minItemsCents / 100)} d'achat`
            : " sur toutes les commandes"}
          {promo.endsAt ? ` jusqu'au ${formatPromoDate(promo.endsAt)}` : ""}
        </span>
        <Link
          href="/panier"
          className="font-bold text-white underline decoration-white/60 underline-offset-4 transition hover:decoration-white"
        >
          Voir mon panier
        </Link>
      </div>
    </div>
  );
}
