"use client";

import { useState, useTransition } from "react";
import type { Card, Rarity } from "@/lib/catalog";
import { updateCard } from "./actions";

const RARITIES: Rarity[] = [
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

const STOCK_OPTIONS = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10];

function Row({ card }: { card: Card }) {
  const [stock, setStock] = useState(card.stock);
  const [price, setPrice] = useState(card.price);
  const [rarity, setRarity] = useState<Rarity>(card.rarity);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  function save(patch: { stock?: number; price?: number; rarity?: string }) {
    start(async () => {
      try {
        setError(null);
        await updateCard(card.id, patch);
        setSaved(true);
        setTimeout(() => setSaved(false), 1000);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Erreur");
      }
    });
  }

  return (
    <tr className="border-t border-white/5">
      <td className="p-2 text-xs text-gray-400">{card.number}</td>
      <td className="p-2">
        <div className="flex items-center gap-2">
          {card.image && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={card.image}
              alt=""
              className="w-8 h-10 object-contain bg-zinc-800 rounded"
            />
          )}
          <span className="text-sm text-white">{card.name}</span>
        </div>
      </td>
      <td className="p-2">
        <select
          value={rarity}
          onChange={(e) => {
            const next = e.target.value as Rarity;
            setRarity(next);
            save({ rarity: next });
          }}
          disabled={pending}
          className="rounded bg-zinc-800 border border-white/10 text-white text-xs px-2 py-1"
        >
          {RARITIES.map((r) => (
            <option key={r} value={r}>
              {r}
            </option>
          ))}
        </select>
      </td>
      <td className="p-2">
        <select
          value={stock}
          onChange={(e) => {
            const next = Number(e.target.value);
            setStock(next);
            save({ stock: next });
          }}
          disabled={pending}
          className={`rounded border text-white text-sm px-2 py-1 w-16 ${
            stock === 0
              ? "bg-red-900/30 border-red-500/40"
              : "bg-zinc-800 border-white/10"
          }`}
        >
          {STOCK_OPTIONS.map((n) => (
            <option key={n} value={n}>
              {n}
            </option>
          ))}
        </select>
      </td>
      <td className="p-2">
        <input
          type="number"
          step="0.01"
          min="0"
          value={price}
          onChange={(e) => setPrice(Number(e.target.value))}
          onBlur={() => {
            if (price !== card.price) save({ price });
          }}
          disabled={pending}
          className="rounded bg-zinc-800 border border-white/10 text-white text-sm px-2 py-1 w-24"
        />
        <span className="ml-1 text-xs text-gray-400">€</span>
      </td>
      <td className="p-2 text-xs">
        {error && <span className="text-red-400">{error}</span>}
        {!error && saved && <span className="text-emerald-400">Sauve</span>}
        {!error && !saved && pending && (
          <span className="text-gray-400">...</span>
        )}
      </td>
    </tr>
  );
}

export default function AdminTable({ cards }: { cards: Card[] }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse rounded-lg overflow-hidden bg-zinc-900/70 border border-white/10">
        <thead className="bg-zinc-800/70 text-left">
          <tr>
            <th className="p-2 text-xs uppercase text-gray-400">Numero</th>
            <th className="p-2 text-xs uppercase text-gray-400">Nom</th>
            <th className="p-2 text-xs uppercase text-gray-400">Rarete</th>
            <th className="p-2 text-xs uppercase text-gray-400">Stock</th>
            <th className="p-2 text-xs uppercase text-gray-400">Prix</th>
            <th className="p-2 text-xs uppercase text-gray-400"></th>
          </tr>
        </thead>
        <tbody>
          {cards.map((c) => (
            <Row key={c.id} card={c} />
          ))}
        </tbody>
      </table>
    </div>
  );
}
