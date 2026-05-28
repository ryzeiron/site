"use client";

import { useMemo, useState } from "react";
import CardTile from "@/components/CardTile";
import {
  CONDITIONS,
  listVariants,
  type Card,
  type CardVariant,
  type Condition,
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
  const [selectedConditions, setSelectedConditions] = useState<Condition[]>([]);
  const [query, setQuery] = useState("");
  const [onlyInStock, setOnlyInStock] = useState(false);
  const [sortMode, setSortMode] = useState<SortMode>("number");
  const [minPrice, setMinPrice] = useState("");
  const [maxPrice, setMaxPrice] = useState("");

  const availableRarities = useMemo(() => {
    const present = new Set<Rarity>();

    for (const card of cards) {
      for (const { variant } of listVariants(card)) {
        present.add(variant.rarity);
      }
    }

    return RARITY_ORDER.filter((rarity) => present.has(rarity));
  }, [cards]);

  const availableConditions = useMemo(() => {
    const present = new Set<Condition>();

    for (const card of cards) {
      for (const { variant } of listVariants(card)) {
        present.add(variant.condition ?? card.condition);
      }
    }

    return CONDITIONS.filter((condition) => present.has(condition));
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
    const min = Number.parseFloat(minPrice.replace(",", "."));
    const max = Number.parseFloat(maxPrice.replace(",", "."));

    const result = cards.filter((card) => {
      const variants = listVariants(card);
      if (variants.length === 0) return false;

      if (selectedRarities.length > 0) {
        const matchRarity = variants.some(({ variant }) =>
          selectedRarities.includes(variant.rarity),
        );
        if (!matchRarity) return false;
      }

      if (selectedConditions.length > 0) {
        const matchCondition = variants.some(({ variant }) =>
          selectedConditions.includes(variant.condition ?? card.condition),
        );
        if (!matchCondition) return false;
      }

      const variantForFilters =
        selectedDisplayVariant(card)?.variant ?? variants[0]?.variant;
      const totalStock = variants.reduce(
        (total, { variant }) => total + Math.max(0, variant.stock),
        0,
      );
      const stockToCheck =
        selectedRarities.length > 0 ? variantForFilters?.stock ?? 0 : totalStock;

      if (onlyInStock && stockToCheck <= 0) return false;

      const price = variantForFilters?.price ?? 0;
      if (Number.isFinite(min) && price < min) return false;
      if (Number.isFinite(max) && price > max) return false;

      if (normalizedQuery) {
        const haystack = normalizeText(
          [
            card.name,
            card.number,
            card.language,
            ...variants.flatMap(({ variant }) => [
              variant.rarity,
              variant.condition ?? card.condition,
            ]),
          ].join(" "),
        );
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
        return (
          aRank - bRank ||
          a.number.localeCompare(b.number, "fr", { numeric: true })
        );
      }

      return a.number.localeCompare(b.number, "fr", { numeric: true });
    });
  }, [
    cards,
    selectedRarities,
    selectedConditions,
    normalizedQuery,
    onlyInStock,
    minPrice,
    maxPrice,
    sortMode,
  ]);

  function toggleRarity(rarity: Rarity) {
    setSelectedRarities((current) =>
      current.includes(rarity)
        ? current.filter((item) => item !== rarity)
        : [...current, rarity],
    );
  }

  function toggleCondition(condition: Condition) {
    setSelectedConditions((current) =>
      current.includes(condition)
        ? current.filter((item) => item !== condition)
        : [...current, condition],
    );
  }

  function showPremiumCards() {
    setSelectedRarities(["Ultra Rare", "Secrete"]);
  }

  function resetFilters() {
    setSelectedRarities([]);
    setSelectedConditions([]);
    setQuery("");
    setOnlyInStock(false);
    setMinPrice("");
    setMaxPrice("");
    setSortMode("number");
  }

  const pillBase =
    "rounded-full border px-3 py-1.5 text-xs font-medium transition";
  const pillIdle = "border-white/20 bg-white/5 text-gray-300 hover:bg-white/10";
  const pillActive = "border-violet-400 bg-violet-600 text-white";

  return (
    <div>
      <div className="mt-6 rounded-2xl border border-white/10 bg-zinc-950/60 p-4">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
          <div className="relative flex-1">
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Nom, numéro, rareté ou état"
              className="w-full rounded-lg border border-white/10 bg-zinc-900 py-2 pl-9 pr-9 text-sm text-white placeholder-gray-500 focus:border-violet-400 focus:outline-none"
            />
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400"
            >
              <circle cx="11" cy="11" r="8" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
            {query ? (
              <button
                type="button"
                onClick={() => setQuery("")}
                aria-label="Effacer"
                className="absolute right-2 top-1/2 -translate-y-1/2 text-lg leading-none text-gray-400 hover:text-white"
              >
                &times;
              </button>
            ) : null}
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <label className="inline-flex min-h-10 items-center gap-2 rounded-lg border border-white/10 bg-zinc-900 px-3 text-sm text-white">
              <input
                type="checkbox"
                checked={onlyInStock}
                onChange={(e) => setOnlyInStock(e.target.checked)}
                className="h-4 w-4 accent-violet-500"
              />
              En stock uniquement
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
            onClick={showPremiumCards}
            className={`${pillBase} ${
              selectedRarities.includes("Ultra Rare") &&
              selectedRarities.includes("Secrete")
                ? pillActive
                : pillIdle
            }`}
          >
            Ultra + Secrètes
          </button>

          <button
            type="button"
            onClick={() => setSelectedRarities([])}
            className={`${pillBase} ${
              selectedRarities.length === 0 ? pillActive : pillIdle
            }`}
          >
            Toutes
          </button>
          {availableRarities.map((rarity) => (
            <button
              key={rarity}
              type="button"
              onClick={() => toggleRarity(rarity)}
              className={`${pillBase} ${
                selectedRarities.includes(rarity) ? pillActive : pillIdle
              }`}
            >
              {formatRarityLabel(rarity)}
            </button>
          ))}
        </div>

        <div className="mt-3 grid gap-3 lg:grid-cols-[1fr_auto] lg:items-center">
          <div className="flex flex-wrap gap-2">
            <span className="self-center text-xs font-semibold uppercase tracking-[0.16em] text-gray-500">
              État
            </span>
            {availableConditions.map((condition) => (
              <button
                key={condition}
                type="button"
                onClick={() => toggleCondition(condition)}
                className={`${pillBase} ${
                  selectedConditions.includes(condition) ? pillActive : pillIdle
                }`}
              >
                {condition}
              </button>
            ))}
          </div>

          <div className="flex flex-wrap gap-2">
            <input
              type="number"
              min={0}
              step="0.01"
              value={minPrice}
              onChange={(e) => setMinPrice(e.target.value)}
              placeholder="Prix min"
              className="h-9 w-28 rounded-lg border border-white/10 bg-zinc-900 px-3 text-sm text-white placeholder:text-gray-500"
            />
            <input
              type="number"
              min={0}
              step="0.01"
              value={maxPrice}
              onChange={(e) => setMaxPrice(e.target.value)}
              placeholder="Prix max"
              className="h-9 w-28 rounded-lg border border-white/10 bg-zinc-900 px-3 text-sm text-white placeholder:text-gray-500"
            />
            <button
              type="button"
              onClick={resetFilters}
              className="rounded-lg bg-white/10 px-3 py-2 text-sm text-white hover:bg-white/20"
            >
              Réinitialiser
            </button>
          </div>
        </div>
      </div>

      {filtered.length === 0 ? (
        <p className="mt-8 text-gray-400">
          {normalizedQuery
            ? `Aucune carte ne correspond à "${query.trim()}".`
            : "Aucune carte pour ces filtres."}
        </p>
      ) : (
        <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {filtered.map((card) => (
            <CardTile
              key={card.id}
              card={card}
              variantKey={displayVariantKey(card)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
