"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import { getCard, resolveVariant, type Variant } from "./catalog";

export type CartItem = {
  cardId: string;
  variant: Variant;
  quantity: number;
};

type CartState = {
  items: CartItem[];
  add: (cardId: string, variant?: Variant, quantity?: number) => void;
  remove: (cardId: string, variant: Variant) => void;
  setQuantity: (cardId: string, variant: Variant, quantity: number) => void;
  clear: () => void;
  totalItems: () => number;
  totalCents: () => number;
};

function maxStock(cardId: string, variant: Variant): number {
  const card = getCard(cardId);
  if (!card) return 0;
  return resolveVariant(card, variant).stock;
}

export const useCart = create<CartState>()(
  persist(
    (set, get) => ({
      items: [],
      add: (cardId, variant = "base", quantity = 1) =>
        set((state) => {
          const card = getCard(cardId);
          if (!card) return state;
          const max = resolveVariant(card, variant).stock;
          const existing = state.items.find(
            (i) => i.cardId === cardId && i.variant === variant,
          );
          if (existing) {
            return {
              items: state.items.map((i) =>
                i.cardId === cardId && i.variant === variant
                  ? { ...i, quantity: Math.min(max, i.quantity + quantity) }
                  : i,
              ),
            };
          }
          return {
            items: [
              ...state.items,
              { cardId, variant, quantity: Math.min(max, quantity) },
            ],
          };
        }),
      remove: (cardId, variant) =>
        set((state) => ({
          items: state.items.filter(
            (i) => !(i.cardId === cardId && i.variant === variant),
          ),
        })),
      setQuantity: (cardId, variant, quantity) =>
        set((state) => {
          if (quantity <= 0) {
            return {
              items: state.items.filter(
                (i) => !(i.cardId === cardId && i.variant === variant),
              ),
            };
          }
          const max = maxStock(cardId, variant);
          return {
            items: state.items.map((i) =>
              i.cardId === cardId && i.variant === variant
                ? { ...i, quantity: Math.min(max, quantity) }
                : i,
            ),
          };
        }),
      clear: () => set({ items: [] }),
      totalItems: () => get().items.reduce((s, i) => s + i.quantity, 0),
      totalCents: () =>
        get().items.reduce((sum, item) => {
          const card = getCard(item.cardId);
          if (!card) return sum;
          const { priceCents } = resolveVariant(card, item.variant);
          return sum + priceCents * item.quantity;
        }, 0),
    }),
    { name: "pokemon-shop-cart-v2" },
  ),
);
