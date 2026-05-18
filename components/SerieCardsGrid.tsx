"use client";

import { useMemo, useState } from "react";
import CardTile from "@/components/CardTile";
import {
  listVariants,
  type Card,
  type CardVariant,
  type Rarity,
  type VariantKey,
} from "@/lib/catalog";
import { formatRarityLabel, orderDisplayVariants } from "@/lib/display-variants";

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

type SortMode = "number" | "name" | "price-asc" | "price-desc" | "rarity";
type ListedVariant = { key: VariantKey; variant: CardVariant };

const RARITY_RANK = new Map(RARITY_ORDER.map((rarity, index) => [rarity, index]));

function normalizeText(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

export default function SerieCardsGrid({ cards }: { cards: Card[] }) {
  const [selectedRarities, setSelectedRarities] = useState<Rarity[]>([]);
  const [query, setQuery] = useState("");
  const [stockOnly, setStockOnly] = useState(false);
  const [sortMode, setSortMode] = useState<SortMode>("number");

  const availableRarities = useMemo(() => {
    const present = new Set<Rarity>();
    for (const c of cards) {
      for (const { variant } of listVariants(c)) {
        present.add(variant.rarity);
      }
    }
    return RARITY_ORDER.filter((r) => present.has(r));
  }, [cards]);

  const normalizedQuery = normalizeText(query);

  function selectedDisplayVariant(card: Card): ListedVariant | undefined {
    const variants = orderDisplayVariants(card);

    if (selectedRarities.length === 0) return variants[0];

    return variants.find(({ variant }) =>
      selectedRarities.includes(variant.rarity),
    );
  }

  function displayVariantKey(card: Card): VariantKey | undefined {
    if (selectedRarities.length === 0) return undefined;

    return selectedDisplayVariant(card)?.key;
  }

  const filtered = useMemo(() => {
    const result = cards.filter((c) => {
      const variants = listVariants(c);
      if (variants.length === 0) return false;

      if (selectedRarities.length > 0) {
        const matchRarity = variants.some(({ variant }) =>
          selectedRarities.includes(variant.rarity),
        );
        if (!matchRarity) return false;
      }

      if (stockOnly) {
        const available = selectedRarities.length > 0
          ? selectedDisplayVariant(c)?.variant.stock ?? 0
          : variants.reduce((total, { variant }) => total + variant.stock, 0);
        if (available <= 0) return false;
      }

      if (normalizedQuery) {
        const haystack = normalizeText(`${c.name} ${c.number}`);
        if (!haystack.includes(normalizedQuery)) return false;
      }

      return true;
    });

    return result.sort((a, b) => {
      const aVariant = selectedDisplayVariant(a)?.variant;
      const bVariant = selectedDisplayVariant(b)?.variant;

      if (sortMode === "name") {
        return a.name.localeCompare(b.name, "fr", { sensitivity: "base" });
      }

      if (sortMode === "price-asc" || sortMode === "price-desc") {
        const aPrice = aVariant?.price ?? 0;
        const bPrice = bVariant?.price ?? 0;
        return sortMode === "price-asc" ? aPrice - bPrice : bPrice - aPrice;
      }

      if (sortMode === "rarity") {
        const aRank = RARITY_RANK.get(aVariant?.rarity ?? "Commune") ?? 999;
        const bRank = RARITY_RANK.get(bVariant?.rarity ?? "Commune") ?? 999;
        return aRank - bRank || a.number.localeCompare(b.number, "fr", { numeric: true });
      }

      return a.number.localeCompare(b.number, "fr", { numeric: true });
    });
  }, [cards, selectedRarities, normalizedQuery, stockOnly, sortMode]);

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
      <div className="mt-6 flex flex-col gap-3 lg:flex-row lg:items-center">
        <div className="relative flex-1 max-w-md">
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Rechercher (nom ou numéro)"
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

        <div className="flex flex-wrap items-center gap-3">
          <label className="flex min-h-10 items-center gap-2 rounded-lg border border-white/10 bg-zinc-900 px-3 text-sm text-gray-200">
            <input
              type="checkbox"
              checked={stockOnly}
              onChange={(e) => setStockOnly(e.target.checked)}
              className="h-4 w-4 rounded border-white/20 bg-zinc-950 accent-violet-500"
            />
            En stock
          </label>

          <select
            value={sortMode}
            onChange={(e) => setSortMode(e.target.value as SortMode)}
            className="min-h-10 rounded-lg border border-white/10 bg-zinc-900 px-3 text-sm text-white"
          >
            <option value="number">Numéro</option>
            <option value="name">Nom</option>
            <option value="price-asc">Prix croissant</option>
            <option value="price-desc">Prix décroissant</option>
            <option value="rarity">Rareté</option>
          </select>

          <span className="text-sm text-gray-400">
            {filtered.length} carte{filtered.length > 1 ? "s" : ""}
          </span>
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
            {formatRarityLabel(r)}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <p className="mt-8 text-gray-400">
          {normalizedQuery
            ? `Aucune carte ne correspond à "${query.trim()}".`
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
