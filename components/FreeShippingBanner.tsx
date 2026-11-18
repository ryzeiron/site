"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { formatPrice } from "@/lib/format";
import { formatPromoDate } from "@/lib/free-shipping-promo-shared";

type State = {
  live: boolean;
  insuranceIncluded: boolean;
  endsAt: string | null;
  minItemsCents: number;
};

// Bandeau affiche seulement quand la promo livraison offerte est active (admin > Promos).
export default function FreeShippingBanner() {
  const [promo, setPromo] = useState<State | null>(null);
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    let cancelled = false;

    fetch("/api/free-shipping")
      .then((r) => (r.ok ? r.json() : null))
      .then((data: Partial<State> | null) => {
        if (cancelled || !data) return;
        setPromo({
          live: Boolean(data.live),
          insuranceIncluded: Boolean(data.insuranceIncluded),
          endsAt: data.endsAt ?? null,
          minItemsCents:
            typeof data.minItemsCents === "number" ? data.minItemsCents : 0,
        });
      })
      .catch(() => {});

    const timer = window.setInterval(() => setNow(Date.now()), 60_000);
    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, []);

  if (!promo?.live) return null;
  if (promo.endsAt && Date.parse(promo.endsAt) <= now) return null;

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
