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
import {
  compareCardsBySortMode,
  type CardSortMode,
} from "@/lib/card-sort";
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

type ListedVariant = { key: VariantKey; variant: CardVariant };

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
  const [onlyInStock, setOnlyInStock] = useState(false);
  const [sortMode, setSortMode] = useState<CardSortMode>("number");
  const [minPrice, setMinPrice] = useState("");
  const [maxPrice, setMaxPrice] = useState("");
  const [filtersOpen, setFiltersOpen] = useState(false);

  const availableRarities = useMemo(() => {
    const present = new Set<Rarity>();

    for (const card of cards) {
      for (const { variant } of listVariants(card)) {
        present.add(variant.rarity);
      }
    }

    return RARITY_ORDER.filter((rarity) => present.has(rarity));
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

      const variantForFilters =
        selectedDisplayVariant(card)?.variant ?? variants[0]?.variant;

      const totalStock = variants.reduce(
        (total, { variant }) => total + Math.max(0, variant.stock),
        0,
      );

      const stockToCheck =
        selectedRarities.length > 0
          ? variantForFilters?.stock ?? 0
          : totalStock;

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
            ]),
          ].join(" "),
        );

        if (!haystack.includes(normalizedQuery)) return false;
      }

      return true;
    });

    return result.sort((a, b) =>
      compareCardsBySortMode(
        a,
        b,
        sortMode,
        (card) => selectedDisplayVariant(card)?.variant,
      ),
    );
  }, [
    cards,
    selectedRarities,
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

  function showPremiumCards() {
    setSelectedRarities(["Ultra Rare", "Secrete"]);
  }

  function resetFilters() {
    setSelectedRarities([]);
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

  const activeFilterCount =
    selectedRarities.length +
    (onlyInStock ? 1 : 0) +
    (minPrice ? 1 : 0) +
    (maxPrice ? 1 : 0) +
    (sortMode !== "number" ? 1 : 0);

  return (
    <div>
      {/* garde tout ton JSX restant identique à partir d'ici,
          sauf le bloc "État" qui est supprimé */}
    </div>
  );
}
