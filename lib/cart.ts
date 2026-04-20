"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import { getCard } from "./catalog";

export type CartItem = {
  cardId: string;
  quantity: number;
};

type CartState = {
  items: CartItem[];
  add: (cardId: string, quantity?: number) => void;
  remove: (cardId: string) => void;
  setQuantity: (cardId: string, quantity: number) => void;
  clear: () => void;
  totalItems: () => number;
  totalCents: () => number;
};

export const useCart = create<CartState>()(
  persist(
    (set, get) => ({
      items: [],
      add: (cardId, quantity = 1) =>
        set((state) => {
          const existing = state.items.find((i) => i.cardId === cardId);
          const card = getCard(cardId);
          if (!card) return state;
          const max = card.stock;
          if (existing) {
            return {
              items: state.items.map((i) =>
                i.cardId === cardId
                  ? { ...i, quantity: Math.min(max, i.quantity + quantity) }
                  : i,
              ),
            };
          }
          return {
            items: [...state.items, { cardId, quantity: Math.min(max, quantity) }],
          };
        }),
      remove: (cardId) =>
        set((state) => ({ items: state.items.filter((i) => i.cardId !== cardId) })),
      setQuantity: (cardId, quantity) =>
        set((state) => {
          if (quantity <= 0) {
            return { items: state.items.filter((i) => i.cardId !== cardId) };
          }
          const card = getCard(cardId);
          const max = card?.stock ?? quantity;
          return {
            items: state.items.map((i) =>
              i.cardId === cardId ? { ...i, quantity: Math.min(max, quantity) } : i,
            ),
          };
        }),
      clear: () => set({ items: [] }),
      totalItems: () => get().items.reduce((s, i) => s + i.quantity, 0),
      totalCents: () =>
        get().items.reduce((sum, item) => {
          const card = getCard(item.cardId);
          return sum + (card ? card.priceCents * item.quantity : 0);
        }, 0),
    }),
    { name: "pokemon-shop-cart-v3" },
  ),
);
