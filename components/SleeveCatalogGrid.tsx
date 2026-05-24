"use client";

import { useMemo, useState } from "react";
import FavoriteSleeveButton from "@/components/FavoriteSleeveButton";
import SleeveAddToCartButton from "@/components/SleeveAddToCartButton";
import StockBadge from "@/components/StockBadge";
import { formatPrice } from "@/lib/format";

type SleeveProduct = {
  id: string;
  name: string;
  description: string | null;
  image: string | null;
  priceCents: number;
  stock: number;
  active: boolean;
  hasOverride: boolean;
};

type StockFilter = "all" | "available" | "low" | "out";
type SortMode = "name" | "price-asc" | "price-desc" | "stock-desc";

function normalize(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

export default function SleeveCatalogGrid({
  products,
}: {
  products: SleeveProduct[];
}) {
  const [query, setQuery] = useState("");
  const [stockFilter, setStockFilter] = useState<StockFilter>("all");
  const [sortMode, setSortMode] = useState<SortMode>("name");

  const filteredProducts = useMemo(() => {
    const terms = normalize(query).split(/\s+/).filter(Boolean);

    return products
      .filter((product) => {
        if (stockFilter === "available" && product.stock <= 0) return false;
        if (stockFilter === "low" && (product.stock <= 0 || product.stock > 3)) {
          return false;
        }
        if (stockFilter === "out" && product.stock > 0) return false;

        if (terms.length === 0) return true;

        const text = normalize(
          [product.name, product.description].filter(Boolean).join(" "),
        );
        return terms.every((term) => text.includes(term));
      })
      .sort((a, b) => {
        if (sortMode === "price-asc") return a.priceCents - b.priceCents;
        if (sortMode === "price-desc") return b.priceCents - a.priceCents;
        if (sortMode === "stock-desc") return b.stock - a.stock;
        return a.name.localeCompare(b.name, "fr");
      });
  }, [products, query, sortMode, stockFilter]);

  return (
    <div>
      <div className="mb-5 rounded-xl border border-white/10 bg-black/25 p-3">
        <div className="grid gap-3 lg:grid-cols-[1fr_180px_180px_auto]">
          <input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Rechercher une sleeve"
            className="min-h-11 rounded-full border border-white/10 bg-zinc-950/80 px-4 text-sm text-white outline-none placeholder:text-gray-500 focus:border-violet-400 focus:ring-2 focus:ring-violet-500/30"
          />

          <select
            value={stockFilter}
            onChange={(event) => setStockFilter(event.target.value as StockFilter)}
            className="min-h-11 rounded-full border border-white/10 bg-zinc-950/80 px-4 text-sm text-white outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-500/30"
          >
            <option value="all">Tous les stocks</option>
            <option value="available">En stock</option>
            <option value="low">Stock faible</option>
            <option value="out">Rupture</option>
          </select>

          <select
            value={sortMode}
            onChange={(event) => setSortMode(event.target.value as SortMode)}
            className="min-h-11 rounded-full border border-white/10 bg-zinc-950/80 px-4 text-sm text-white outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-500/30"
          >
            <option value="name">Nom A-Z</option>
            <option value="price-asc">Prix croissant</option>
            <option value="price-desc">Prix décroissant</option>
            <option value="stock-desc">Stock décroissant</option>
          </select>

          {(query || stockFilter !== "all" || sortMode !== "name") ? (
            <button
              type="button"
              onClick={() => {
                setQuery("");
                setStockFilter("all");
                setSortMode("name");
              }}
              className="min-h-11 rounded-full border border-white/10 bg-white/5 px-5 text-sm font-semibold text-white transition hover:bg-white/10"
            >
              Réinitialiser
            </button>
          ) : null}
        </div>
      </div>

      {filteredProducts.length === 0 ? (
        <div className="rounded-lg border border-white/10 bg-white/[0.03] p-5 text-sm text-gray-300">
          Aucune sleeve ne correspond aux filtres.
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filteredProducts.map((product) => (
            <SleeveCard key={product.id} product={product} />
          ))}
        </div>
      )}
    </div>
  );
}

function SleeveCard({ product }: { product: SleeveProduct }) {
  return (
    <article className="rounded-lg border border-white/10 bg-zinc-900/70 p-4 text-gray-200">
      <div className="relative aspect-[4/3] overflow-hidden rounded-lg border border-white/10 bg-zinc-950">
        {product.image ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={product.image}
            alt={product.name}
            className={`h-full w-full object-contain p-2 ${
              product.stock <= 0 ? "opacity-40 grayscale" : ""
            }`}
          />
        ) : (
          <div className="flex h-full items-center justify-center text-center text-sm font-bold uppercase tracking-[0.18em] text-violet-200">
            Sleeve
          </div>
        )}

        {product.stock <= 0 ? (
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="rounded-full bg-red-600 px-4 py-1.5 text-xs font-bold uppercase tracking-wider text-white shadow">
              Rupture
            </span>
          </div>
        ) : null}
      </div>

      <div className="mt-4">
        <h3 className="font-semibold text-white">{product.name}</h3>
        {product.description ? (
          <p className="mt-2 line-clamp-3 text-sm leading-6 text-gray-400">
            {product.description}
          </p>
        ) : null}

        <div className="mt-3 flex items-center justify-between gap-3">
          <span className="text-lg font-extrabold text-brand-400">
            {formatPrice(product.priceCents / 100)}
          </span>
          <StockBadge
            stock={product.stock}
            compact
            label={product.stock <= 0 ? "Rupture" : `${product.stock} dispo`}
          />
        </div>

        <SleeveAddToCartButton sleeveId={product.id} stock={product.stock} />
        <FavoriteSleeveButton sleeveId={product.id} />
      </div>
    </article>
  );
}
