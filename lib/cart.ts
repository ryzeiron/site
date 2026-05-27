"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { VariantKey } from "./catalog";

export type CardCartItem = {
  type?: "card";
  cardId: string;
  variant: VariantKey;
  quantity: number;
};

export type SleeveCartItem = {
  type: "sleeve";
  sleeveId: string;
  quantity: number;
};

export type CartItem = CardCartItem | SleeveCartItem;

type CartState = {
  cartId: string;
  items: CartItem[];
  add: (cardId: string, variant?: VariantKey, quantity?: number, maxStock?: number) => void;
  remove: (cardId: string, variant: VariantKey) => void;
  setQuantity: (cardId: string, variant: VariantKey, quantity: number, maxStock?: number) => void;
  addSleeve: (sleeveId: string, quantity?: number, maxStock?: number) => void;
  removeSleeve: (sleeveId: string) => void;
  setSleeveQuantity: (sleeveId: string, quantity: number, maxStock?: number) => void;
  clear: () => void;
  totalItems: () => number;
};

export function isCardCartItem(item: CartItem): item is CardCartItem {
  return item.type !== "sleeve";
}

export function isSleeveCartItem(item: CartItem): item is SleeveCartItem {
  return item.type === "sleeve";
}

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
    const cardItems = items.filter(isCardCartItem);

    void fetch("/api/cart/sync", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ cartId, items: cardItems }),
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
            (i) =>
              isCardCartItem(i) &&
              i.cardId === cardId &&
              i.variant === variant,
          );
          const nextItems = existing
            ? state.items.map((i) =>
                isCardCartItem(i) &&
                i.cardId === cardId &&
                i.variant === variant
                  ? { ...i, type: "card" as const, quantity: cap(i.quantity + quantity) }
                  : i,
              )
            : [
                ...state.items,
                { type: "card" as const, cardId, variant, quantity: cap(quantity) },
              ];
          scheduleSync(state.cartId, nextItems);
          return { items: nextItems };
        }),
      remove: (cardId, variant) =>
        set((state) => {
          const nextItems = state.items.filter(
            (i) =>
              !(
                isCardCartItem(i) &&
                i.cardId === cardId &&
                i.variant === variant
              ),
          );
          scheduleSync(state.cartId, nextItems);
          return { items: nextItems };
        }),
      setQuantity: (cardId, variant, quantity, maxStock) =>
        set((state) => {
          let nextItems: CartItem[];
          if (quantity <= 0) {
            nextItems = state.items.filter(
              (i) =>
                !(
                  isCardCartItem(i) &&
                  i.cardId === cardId &&
                  i.variant === variant
                ),
            );
          } else {
            const max =
              maxStock !== undefined ? Math.min(maxStock, quantity) : quantity;
            nextItems = state.items.map((i) =>
              isCardCartItem(i) &&
              i.cardId === cardId &&
              i.variant === variant
                ? { ...i, type: "card" as const, quantity: max }
                : i,
            );
          }
          scheduleSync(state.cartId, nextItems);
          return { items: nextItems };
        }),
      addSleeve: (sleeveId, quantity = 1, maxStock) =>
        set((state) => {
          const cap = (n: number) =>
            maxStock !== undefined ? Math.min(maxStock, n) : n;
          const existing = state.items.find(
            (i) => isSleeveCartItem(i) && i.sleeveId === sleeveId,
          );
          const nextItems = existing
            ? state.items.map((i) =>
                isSleeveCartItem(i) && i.sleeveId === sleeveId
                  ? { ...i, quantity: cap(i.quantity + quantity) }
                  : i,
              )
            : [
                ...state.items,
                { type: "sleeve" as const, sleeveId, quantity: cap(quantity) },
              ];
          return { items: nextItems };
        }),
      removeSleeve: (sleeveId) =>
        set((state) => {
          const nextItems = state.items.filter(
            (i) => !(isSleeveCartItem(i) && i.sleeveId === sleeveId),
          );
          return { items: nextItems };
        }),
      setSleeveQuantity: (sleeveId, quantity, maxStock) =>
        set((state) => {
          let nextItems: CartItem[];
          if (quantity <= 0) {
            nextItems = state.items.filter(
              (i) => !(isSleeveCartItem(i) && i.sleeveId === sleeveId),
            );
          } else {
            const max =
              maxStock !== undefined ? Math.min(maxStock, quantity) : quantity;
            nextItems = state.items.map((i) =>
              isSleeveCartItem(i) && i.sleeveId === sleeveId
                ? { ...i, quantity: max }
                : i,
            );
          }
          return { items: nextItems };
        }),
      clear: () => {
        const { cartId, items } = get();
        if (items.some(isCardCartItem)) {
          clearOnServer(cartId);
        }
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
