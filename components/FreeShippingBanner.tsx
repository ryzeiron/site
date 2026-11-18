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
    <div className="free-ship-banner relative z-[150] overflow-hidden border-b border-emerald-300/20 text-white">
      {/* Decor anime : reflet qui balaie + camion qui traverse (voir globals.css) */}
      <span aria-hidden="true" className="free-ship-shine" />
      <span aria-hidden="true" className="free-ship-truck">
        <TruckIcon />
      </span>

      <div className="relative mx-auto flex max-w-6xl flex-wrap items-center justify-center gap-x-3 gap-y-1 px-4 py-2 text-center text-xs sm:text-sm">
        <span className="free-ship-badge inline-flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1 font-black tracking-wide ring-1 ring-white/25">
          <TruckIcon className="h-4 w-4" />
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

function TruckIcon({ className = "h-5 w-6" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <path d="M1 4h13v11H1z" />
      <path d="M14 8h4l3 3v4h-7z" />
      <circle cx="5.5" cy="17.5" r="2" />
      <circle cx="17.5" cy="17.5" r="2" />
    </svg>
  );
}
