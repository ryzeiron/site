"use client";

import { useMemo, useState } from "react";
import CardTile from "@/components/CardTile";
import {
  listVariants,
  type Card,
  type Rarity,
  type VariantKey,
} from "@/lib/catalog";

const RARITY_ORDER: Rarity[] = [
  "Commune",
  "Reverse",
  "Reverse Pokéball",
  "Reverse Masterball",
  "Holo",
  "Holo Cracked Ice",
  "Holo ligne",
  "Stamp",
  "Rare Reverse",
  "Rare Holo",
  "Ultra Rare",
  "Secrete",
];

export default function SerieCardsGrid({ cards }: { cards: Card[] }) {
  const [selectedRarities, setSelectedRarities] = useState<Rarity[]>([]);
  const [query, setQuery] = useState("");

  const availableRarities = useMemo(() => {
    const present = new Set<Rarity>();
    for (const c of cards) {
      present.add(c.rarity);
      if (c.altVariant) present.add(c.altVariant.rarity);
      if (c.extraVariants) {
        for (const v of c.extraVariants) present.add(v.rarity);
      }
    }
    return RARITY_ORDER.filter((r) => present.has(r));
  }, [cards]);

  const normalizedQuery = query.trim().toLowerCase();

  function displayVariantKey(card: Card): VariantKey | undefined {
    if (selectedRarities.length === 0) return undefined;

    return listVariants(card).find(({ variant }) =>
      selectedRarities.includes(variant.rarity),
    )?.key;
  }

  const filtered = useMemo(() => {
    return cards.filter((c) => {
      if (selectedRarities.length > 0) {
        const matchRarity = listVariants(c).some(({ variant }) =>
          selectedRarities.includes(variant.rarity),
        );
        if (!matchRarity) return false;
      }
      if (normalizedQuery) {
        const haystack = `${c.name} ${c.number}`.toLowerCase();
        if (!haystack.includes(normalizedQuery)) return false;
      }
      return true;
    });
  }, [cards, selectedRarities, normalizedQuery]);

  function toggleRarity(rarity: Rarity) {
    setSelectedRarities((current) =>
      current.includes(rarity)
        ? current.filter((item) => item !== rarity)
        : [...current, rarity],
    );
  }

  const pillBase =
    "rounded-full border px-3 py-1.5 text-xs font-medium transition";
  const pillIdle = "border-white/20 bg-white/5 text-gray-300 hover:bg-white/10";
  const pillActive = "border-violet-400 bg-violet-600 text-white";

  return (
    <div>
      <div className="mt-6 flex flex-col sm:flex-row gap-3 sm:items-center">
        <div className="relative flex-1 max-w-md">
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Rechercher (nom ou numero)"
            className="w-full rounded-lg bg-zinc-900 border border-white/10 text-white placeholder-gray-500 pl-9 pr-9 py-2 text-sm focus:outline-none focus:border-violet-400"
          />
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none"
          >
            <circle cx="11" cy="11" r="8" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
          {query && (
            <button
              type="button"
              onClick={() => setQuery("")}
              aria-label="Effacer"
              className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white text-lg leading-none"
            >
              &times;
            </button>
          )}
        </div>
      </div>

      <div className="mt-3 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => setSelectedRarities([])}
          className={`${pillBase} ${
            selectedRarities.length === 0 ? pillActive : pillIdle
          }`}
        >
          Toutes
        </button>
        {availableRarities.map((r) => (
          <button
            key={r}
            type="button"
            onClick={() => toggleRarity(r)}
            className={`${pillBase} ${
              selectedRarities.includes(r) ? pillActive : pillIdle
            }`}
          >
            {r}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <p className="mt-8 text-gray-400">
          {normalizedQuery
            ? `Aucune carte ne correspond a "${query.trim()}".`
            : "Aucune carte pour ces filtres."}
        </p>
      ) : (
        <div className="mt-6 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
          {filtered.map((c) => (
            <CardTile key={c.id} card={c} variantKey={displayVariantKey(c)} />
          ))}
        </div>
      )}
    </div>
  );
}
