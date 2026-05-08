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
  cartId: string;
  items: CartItem[];
  add: (cardId: string, variant?: VariantKey, quantity?: number, maxStock?: number) => void;
  remove: (cardId: string, variant: VariantKey) => void;
  setQuantity: (cardId: string, variant: VariantKey, quantity: number, maxStock?: number) => void;
  clear: () => void;
  totalItems: () => number;
};

function makeCartId() {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

let syncTimer: ReturnType<typeof setTimeout> | null = null;
function scheduleSync(cartId: string, items: CartItem[]) {
  if (typeof window === "undefined") return;
  if (syncTimer) clearTimeout(syncTimer);
  syncTimer = setTimeout(() => {
    void fetch("/api/cart/sync", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ cartId, items }),
    }).catch(() => {
      // best-effort, le checkout re-validera de toute facon
    });
  }, 250);
}

function clearOnServer(cartId: string) {
  if (typeof window === "undefined") return;
  void fetch("/api/cart/sync", {
    method: "DELETE",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ cartId }),
  }).catch(() => {});
}

export const useCart = create<CartState>()(
  persist(
    (set, get) => ({
      cartId: makeCartId(),
      items: [],
      add: (cardId, variant = "base", quantity = 1, maxStock) =>
        set((state) => {
          const cap = (n: number) =>
            maxStock !== undefined ? Math.min(maxStock, n) : n;
          const existing = state.items.find(
            (i) => i.cardId === cardId && i.variant === variant,
          );
          const nextItems = existing
            ? state.items.map((i) =>
                i.cardId === cardId && i.variant === variant
                  ? { ...i, quantity: cap(i.quantity + quantity) }
                  : i,
              )
            : [...state.items, { cardId, variant, quantity: cap(quantity) }];
          scheduleSync(state.cartId, nextItems);
          return { items: nextItems };
        }),
      remove: (cardId, variant) =>
        set((state) => {
          const nextItems = state.items.filter(
            (i) => !(i.cardId === cardId && i.variant === variant),
          );
          scheduleSync(state.cartId, nextItems);
          return { items: nextItems };
        }),
      setQuantity: (cardId, variant, quantity, maxStock) =>
        set((state) => {
          let nextItems: CartItem[];
          if (quantity <= 0) {
            nextItems = state.items.filter(
              (i) => !(i.cardId === cardId && i.variant === variant),
            );
          } else {
            const max =
              maxStock !== undefined ? Math.min(maxStock, quantity) : quantity;
            nextItems = state.items.map((i) =>
              i.cardId === cardId && i.variant === variant
                ? { ...i, quantity: max }
                : i,
            );
          }
          scheduleSync(state.cartId, nextItems);
          return { items: nextItems };
        }),
      clear: () => {
        const { cartId } = get();
        clearOnServer(cartId);
        set({ items: [] });
      },
      totalItems: () => get().items.reduce((s, i) => s + i.quantity, 0),
    }),
    {
      name: "pokemon-shop-cart-v5",
      partialize: (state) => ({ cartId: state.cartId, items: state.items }),
    },
  ),
);
