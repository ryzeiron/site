"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { VariantKey } from "./catalog";

export type CartItem = {
  cardId: string;
  variant: VariantKey;
  quantity: number;
};

type CartState = {
  items: CartItem[];
  add: (cardId: string, variant?: VariantKey, quantity?: number, maxStock?: number) => void;
  remove: (cardId: string, variant: VariantKey) => void;
  setQuantity: (cardId: string, variant: VariantKey, quantity: number, maxStock?: number) => void;
  clear: () => void;
  totalItems: () => number;
};

export const useCart = create<CartState>()(
  persist(
    (set, get) => ({
      items: [],
      add: (cardId, variant = "base", quantity = 1, maxStock) =>
        set((state) => {
          const cap = (n: number) =>
            maxStock !== undefined ? Math.min(maxStock, n) : n;
          const existing = state.items.find(
            (i) => i.cardId === cardId && i.variant === variant,
          );
          if (existing) {
            return {
              items: state.items.map((i) =>
                i.cardId === cardId && i.variant === variant
                  ? { ...i, quantity: cap(i.quantity + quantity) }
                  : i,
              ),
            };
          }
          return {
            items: [
              ...state.items,
              { cardId, variant, quantity: cap(quantity) },
            ],
          };
        }),
      remove: (cardId, variant) =>
        set((state) => ({
          items: state.items.filter(
            (i) => !(i.cardId === cardId && i.variant === variant),
          ),
        })),
      setQuantity: (cardId, variant, quantity, maxStock) =>
        set((state) => {
          if (quantity <= 0) {
            return {
              items: state.items.filter(
                (i) => !(i.cardId === cardId && i.variant === variant),
              ),
            };
          }
          const max = maxStock !== undefined ? Math.min(maxStock, quantity) : quantity;
          return {
            items: state.items.map((i) =>
              i.cardId === cardId && i.variant === variant
                ? { ...i, quantity: max }
                : i,
            ),
          };
        }),
      clear: () => set({ items: [] }),
      totalItems: () => get().items.reduce((s, i) => s + i.quantity, 0),
    }),
    { name: "pokemon-shop-cart-v4" },
  ),
);
