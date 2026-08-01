"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { LOYALTY_TIERS, getNextTier } from "@/lib/loyalty-tiers";

const COUNT_UP_MS = 1100;
const REVEAL_DELAY_MS = 250;

function easeOutCubic(t: number): number {
  return 1 - Math.pow(1 - t, 3);
}

function prefersReducedMotion(): boolean {
  return (
    typeof window !== "undefined" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches
  );
}

// Anime une valeur de 0 vers `target` en easeOut, en respectant reduced-motion.
function useCountUp(target: number, start: boolean): number {
  const [value, setValue] = useState(0);
  const frameRef = useRef<number | null>(null);

  useEffect(() => {
    if (!start) return;

    if (prefersReducedMotion() || target <= 0) {
      setValue(target);
      return;
    }

    const startedAt = performance.now();

    const tick = (now: number) => {
      const progress = Math.min(1, (now - startedAt) / COUNT_UP_MS);
      setValue(Math.round(target * easeOutCubic(progress)));

      if (progress < 1) {
        frameRef.current = requestAnimationFrame(tick);
      }
    };

    frameRef.current = requestAnimationFrame(tick);

    return () => {
      if (frameRef.current !== null) cancelAnimationFrame(frameRef.current);
    };
  }, [target, start]);

  return value;
}

export default function LoyaltyRewardAnimation({
  earned,
  spent,
  balance,
}: {
  earned: number;
  spent: number;
  balance: number;
}) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setVisible(true), REVEAL_DELAY_MS);
    return () => clearTimeout(timer);
  }, []);

  const animatedEarned = useCountUp(earned, visible);
  const animatedBalance = useCountUp(balance, visible);

  const nextTier = getNextTier(balance);
  const previousTierPoints = [...LOYALTY_TIERS]
    .reverse()
    .find((tier) => tier.points <= balance)?.points;
  const floor = previousTierPoints ?? 0;
  const ceiling = nextTier?.points ?? floor;

  // Progression entre le palier atteint et le suivant (100 % si tout est debloque).
  const progressRatio =
    ceiling > floor ? Math.min(1, (balance - floor) / (ceiling - floor)) : 1;

  const unlockedCount = LOYALTY_TIERS.filter(
    (tier) => tier.points <= balance,
  ).length;

  return (
    <section
      className={`mt-6 overflow-hidden rounded-2xl border border-violet-300/25 bg-gradient-to-br from-violet-600/25 via-fuchsia-500/10 to-transparent p-5 transition-all duration-700 ${
        visible ? "translate-y-0 opacity-100" : "translate-y-3 opacity-0"
      }`}
    >
      <div className="flex flex-wrap items-baseline justify-between gap-3">
        <div className="text-xs font-semibold uppercase tracking-[0.18em] text-violet-200">
          Points fidélité
        </div>

        <Link
          href="/compte?section=fidelite"
          className="text-xs font-semibold text-violet-200 transition hover:text-white"
        >
          Voir mes paliers
        </Link>
      </div>

      {earned > 0 ? (
        <div className="mt-3 flex items-baseline gap-2">
          <span className="text-5xl font-bold tabular-nums text-emerald-300">
            +{animatedEarned}
          </span>
          <span className="text-lg font-semibold text-emerald-100">
            point{earned > 1 ? "s" : ""} gagné{earned > 1 ? "s" : ""}
          </span>
        </div>
      ) : null}

      {spent > 0 ? (
        <p className="mt-2 text-sm text-violet-100">
          {spent} point{spent > 1 ? "s" : ""} utilisé{spent > 1 ? "s" : ""} sur
          cette commande.
        </p>
      ) : null}

      <div className="mt-4">
        <div className="flex items-baseline justify-between gap-3 text-sm">
          <span className="text-gray-300">Nouveau solde</span>
          <span className="text-xl font-bold tabular-nums text-white">
            {animatedBalance} pts
          </span>
        </div>

        <div
          className="mt-2 h-3 overflow-hidden rounded-full bg-black/40"
          role="progressbar"
          aria-valuenow={balance}
          aria-valuemin={floor}
          aria-valuemax={ceiling}
          aria-label="Progression vers le prochain palier"
        >
          <div
            className="h-full rounded-full bg-gradient-to-r from-violet-400 to-fuchsia-400 transition-[width] duration-1000 ease-out"
            style={{ width: visible ? `${progressRatio * 100}%` : "0%" }}
          />
        </div>

        <p className="mt-2 text-sm text-violet-100">
          {nextTier ? (
            <>
              Plus que{" "}
              <strong className="text-white">
                {nextTier.points - balance} point
                {nextTier.points - balance > 1 ? "s" : ""}
              </strong>{" "}
              pour débloquer <strong className="text-white">{nextTier.label}</strong>.
            </>
          ) : (
            <>Tous les paliers sont débloqués. Bravo !</>
          )}
        </p>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        {LOYALTY_TIERS.map((tier, index) => {
          const unlocked = tier.points <= balance;

          return (
            <span
              key={tier.points}
              title={tier.label}
              className={`rounded-full border px-3 py-1 text-xs font-semibold transition-all duration-500 ${
                unlocked
                  ? "border-emerald-300/40 bg-emerald-400/20 text-emerald-100"
                  : "border-white/10 bg-black/20 text-gray-400"
              } ${visible ? "translate-y-0 opacity-100" : "translate-y-2 opacity-0"}`}
              style={{
                transitionDelay: visible ? `${300 + index * 70}ms` : "0ms",
              }}
            >
              {unlocked ? "✓ " : ""}
              {tier.points} pts
            </span>
          );
        })}
      </div>

      {unlockedCount > 0 ? (
        <p className="mt-3 text-xs text-gray-400">
          {unlockedCount} palier{unlockedCount > 1 ? "s" : ""} disponible
          {unlockedCount > 1 ? "s" : ""} à utiliser sur ta prochaine commande.
        </p>
      ) : null}
    </section>
  );
}
