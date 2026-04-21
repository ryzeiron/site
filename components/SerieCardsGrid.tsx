"use client";

import { useMemo, useState } from "react";
import CardTile from "@/components/CardTile";
import type { Card, Rarity } from "@/lib/catalog";

const RARITY_ORDER: Rarity[] = [
  "Reverse",
  "Holo",
  "Rare Reverse",
  "Rare Holo",
  "Ultra Rare",
  "Secrete",
];

export default function SerieCardsGrid({ cards }: { cards: Card[] }) {
  const [selected, setSelected] = useState<Rarity | "all">("all");

  const availableRarities = useMemo(() => {
    const present = new Set(cards.map((c) => c.rarity));
    return RARITY_ORDER.filter((r) => present.has(r));
  }, [cards]);

  const filtered =
    selected === "all" ? cards : cards.filter((c) => c.rarity === selected);

  const pillBase =
    "rounded-full border px-3 py-1.5 text-xs font-medium transition";
  const pillIdle = "border-white/20 bg-white/5 text-gray-300 hover:bg-white/10";
  const pillActive = "border-violet-400 bg-violet-600 text-white";

  return (
    <div>
      <div className="mt-6 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => setSelected("all")}
          className={`${pillBase} ${selected === "all" ? pillActive : pillIdle}`}
        >
          Toutes
        </button>
        {availableRarities.map((r) => (
          <button
            key={r}
            type="button"
            onClick={() => setSelected(r)}
            className={`${pillBase} ${selected === r ? pillActive : pillIdle}`}
          >
            {r}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <p className="mt-8 text-gray-400">
          Aucune carte pour cette rarete.
        </p>
      ) : (
        <div className="mt-6 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
          {filtered.map((c) => (
            <CardTile key={c.id} card={c} />
          ))}
        </div>
      )}
    </div>
  );
}
