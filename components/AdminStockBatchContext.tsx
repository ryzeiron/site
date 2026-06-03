"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { useRouter } from "next/navigation";
import type { Condition, Rarity, VariantKey } from "@/lib/catalog";

export type PendingStockUpdate = {
  cardId: string;
  cardName: string;
  cardNumber: string;
  variant: VariantKey;
  label: string;
  stock?: number;
  price?: number;
  rarity?: Rarity;
  condition?: Condition;
};

type AdminStockBatchContextValue = {
  pendingUpdates: PendingStockUpdate[];
  pendingCount: number;
  saving: boolean;
  syncingAfterSave: boolean;
  message: string | null;
  error: string | null;
  getPendingUpdate: (cardId: string, variant: VariantKey) => PendingStockUpdate | undefined;
  getSubmittedUpdate: (cardId: string, variant: VariantKey) => PendingStockUpdate | undefined;
  setPendingUpdate: (update: PendingStockUpdate) => void;
  clearPendingUpdate: (cardId: string, variant: VariantKey) => void;
  clearSubmittedUpdate: (cardId: string, variant: VariantKey) => void;
  discardAll: () => void;
  saveAll: () => Promise<void>;
};

const AdminStockBatchContext = createContext<AdminStockBatchContextValue | null>(null);

function pendingKey(cardId: string, variant: VariantKey) {
  return `${cardId}:${variant}`;
}

function samePendingUpdate(a: PendingStockUpdate | undefined, b: PendingStockUpdate) {
  return (
    a?.cardId === b.cardId &&
    a?.cardName === b.cardName &&
    a?.cardNumber === b.cardNumber &&
    a?.variant === b.variant &&
    a?.label === b.label &&
    a?.stock === b.stock &&
    a?.price === b.price &&
    a?.rarity === b.rarity &&
    a?.condition === b.condition
  );
}

export function AdminStockBatchProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const [pending, setPending] = useState<Map<string, PendingStockUpdate>>(() => new Map());
  const [submitted, setSubmitted] = useState<Map<string, PendingStockUpdate>>(() => new Map());
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const pendingUpdates = useMemo(() => Array.from(pending.values()), [pending]);
  const pendingCount = pendingUpdates.length;
  const syncingAfterSave = submitted.size > 0;

  const getPendingUpdate = useCallback(
    (cardId: string, variant: VariantKey) => pending.get(pendingKey(cardId, variant)),
    [pending],
  );

  const getSubmittedUpdate = useCallback(
    (cardId: string, variant: VariantKey) => submitted.get(pendingKey(cardId, variant)),
    [submitted],
  );

  const setPendingUpdate = useCallback((update: PendingStockUpdate) => {
    setPending((current) => {
      const key = pendingKey(update.cardId, update.variant);
      if (samePendingUpdate(current.get(key), update)) return current;
      const next = new Map(current);
      next.set(key, update);
      return next;
    });
    setMessage(null);
    setError(null);
  }, []);

  const clearPendingUpdate = useCallback((cardId: string, variant: VariantKey) => {
    setPending((current) => {
      const key = pendingKey(cardId, variant);
      if (!current.has(key)) return current;
      const next = new Map(current);
      next.delete(key);
      return next;
    });
  }, []);

  const clearSubmittedUpdate = useCallback((cardId: string, variant: VariantKey) => {
    setSubmitted((current) => {
      const key = pendingKey(cardId, variant);
      if (!current.has(key)) return current;
      const next = new Map(current);
      next.delete(key);
      return next;
    });
  }, []);

  const discardAll = useCallback(() => {
    setPending(new Map());
    setSubmitted(new Map());
    setMessage(null);
    setError(null);
  }, []);

  const saveAll = useCallback(async () => {
    if (pendingUpdates.length === 0 || saving) return;
    setSaving(true);
    setMessage(null);
    setError(null);

    const updates = pendingUpdates.map(({ cardName, cardNumber, label, ...payload }) => payload);

    try {
      const response = await fetch("/api/admin/stock", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ updates }),
      });
      const data = await response.json().catch(() => null);
      if (!response.ok) {
        throw new Error(data?.error ?? "Impossible d'enregistrer les modifications.");
      }
      setSubmitted(() => {
        const next = new Map<string, PendingStockUpdate>();
        for (const update of pendingUpdates) {
          next.set(pendingKey(update.cardId, update.variant), update);
        }
        return next;
      });
      setPending(new Map());
      setMessage(`${pendingUpdates.length} modification${pendingUpdates.length > 1 ? "s" : ""} envoyee${pendingUpdates.length > 1 ? "s" : ""}.`);
      router.refresh();
      window.setTimeout(() => setSubmitted(new Map()), 30000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Impossible d'enregistrer les modifications.");
      setSubmitted(new Map());
    } finally {
      setSaving(false);
    }
  }, [pendingUpdates, router, saving]);

  useEffect(() => {
    if (pendingCount === 0) return;
    const warnBeforeLeaving = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = "";
    };
    window.addEventListener("beforeunload", warnBeforeLeaving);
    return () => window.removeEventListener("beforeunload", warnBeforeLeaving);
  }, [pendingCount]);

  const value = useMemo(
    () => ({
      pendingUpdates,
      pendingCount,
      saving,
      syncingAfterSave,
      message,
      error,
      getPendingUpdate,
      getSubmittedUpdate,
      setPendingUpdate,
      clearPendingUpdate,
      clearSubmittedUpdate,
      discardAll,
      saveAll,
    }),
    [
      clearPendingUpdate,
      discardAll,
      error,
      getSubmittedUpdate,
      getPendingUpdate,
      message,
      pendingCount,
      pendingUpdates,
      saveAll,
      saving,
      syncingAfterSave,
      clearSubmittedUpdate,
      setPendingUpdate,
    ],
  );

  return <AdminStockBatchContext.Provider value={value}>{children}</AdminStockBatchContext.Provider>;
}

export function useAdminStockBatch() {
  const context = useContext(AdminStockBatchContext);
  if (!context) {
    throw new Error("useAdminStockBatch must be used inside AdminStockBatchProvider");
  }
  return context;
}
