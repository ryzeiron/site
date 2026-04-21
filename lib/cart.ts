"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import { getCard, resolveVariant, type VariantKey } from "./catalog";

export type CartItem = {
  cardId: string;
  variant: VariantKey;
  quantity: number;
};

type CartState = {
  items: CartItem[];
  add: (cardId: string, variant?: VariantKey, quantity?: number) => void;
  remove: (cardId: string, variant: VariantKey) => void;
  setQuantity: (cardId: string, variant: VariantKey, quantity: number) => void;
  clear: () => void;
  totalItems: () => number;
  totalEuros: () => number;
};

export const useCart = create<CartState>()(
  persist(
    (set, get) => ({
      items: [],
      add: (cardId, variant = "base", quantity = 1) =>
        set((state) => {
          const card = getCard(cardId);
          if (!card) return state;
          const v = resolveVariant(card, variant);
          const existing = state.items.find(
            (i) => i.cardId === cardId && i.variant === variant,
          );
          if (existing) {
            return {
              items: state.items.map((i) =>
                i.cardId === cardId && i.variant === variant
                  ? { ...i, quantity: Math.min(v.stock, i.quantity + quantity) }
                  : i,
              ),
            };
          }
          return {
            items: [
              ...state.items,
              { cardId, variant, quantity: Math.min(v.stock, quantity) },
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
          const card = getCard(cardId);
          const v = card ? resolveVariant(card, variant) : null;
          const max = v?.stock ?? quantity;
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
      totalEuros: () =>
        get().items.reduce((sum, item) => {
          const card = getCard(item.cardId);
          if (!card) return sum;
          const v = resolveVariant(card, item.variant);
          return sum + v.price * item.quantity;
        }, 0),
    }),
    { name: "pokemon-shop-cart-v4" },
  ),
);
