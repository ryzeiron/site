"use client";

import { useEffect, useMemo, useState } from "react";

const CHANGE_EVENT = "pokedel-admin-order-preparation-change";
const preparedCache = new Map<string, string[]>();
const inflightLoads = new Map<string, Promise<string[]>>();

type PreparationChangeDetail = {
  orderId: string;
  items: string[];
};

function unitIds(itemKey: string, quantity: number) {
  const count = Math.max(0, Math.floor(quantity));
  return Array.from({ length: count }, (_, index) => `${itemKey}:${index + 1}`);
}

function normalizePrepared(items: string[], validItems?: Set<string>) {
  return new Set(
    items.filter((item) => typeof item === "string" && (!validItems || validItems.has(item))),
  );
}

function dispatchPrepared(orderId: string, items: string[]) {
  preparedCache.set(orderId, items);
  window.dispatchEvent(
    new CustomEvent<PreparationChangeDetail>(CHANGE_EVENT, {
      detail: { orderId, items },
    }),
  );
}

async function loadPrepared(orderId: string) {
  const cached = preparedCache.get(orderId);
  if (cached) return cached;

  const existingLoad = inflightLoads.get(orderId);
  if (existingLoad) return existingLoad;

  const load = fetch(
    `/api/admin/order-preparation?orderId=${encodeURIComponent(orderId)}`,
    { cache: "no-store" },
  )
    .then(async (response) => {
      const data = (await response.json()) as { items?: string[]; error?: string };
      if (!response.ok) {
        throw new Error(data.error ?? "Impossible de charger la preparation.");
      }
      const items = Array.isArray(data.items) ? data.items : [];
      preparedCache.set(orderId, items);
      return items;
    })
    .finally(() => {
      inflightLoads.delete(orderId);
    });

  inflightLoads.set(orderId, load);
  return load;
}

async function replacePrepared(orderId: string, items: string[]) {
  const response = await fetch("/api/admin/order-preparation", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ orderId, mode: "replace", items }),
  });
  const data = (await response.json()) as { items?: string[]; error?: string };
  if (!response.ok) {
    throw new Error(data.error ?? "Sauvegarde impossible.");
  }
  return Array.isArray(data.items) ? data.items : items;
}

async function setPreparedItem(orderId: string, itemKey: string, prepared: boolean) {
  const response = await fetch("/api/admin/order-preparation", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ orderId, itemKey, prepared }),
  });
  const data = (await response.json()) as { items?: string[]; error?: string };
  if (!response.ok) {
    throw new Error(data.error ?? "Sauvegarde impossible.");
  }
  return Array.isArray(data.items) ? data.items : [];
}

function usePreparedState(orderId: string, validItems?: Set<string>) {
  const [prepared, setPrepared] = useState<Set<string>>(() =>
    normalizePrepared(preparedCache.get(orderId) ?? [], validItems),
  );
  const [loading, setLoading] = useState(!preparedCache.has(orderId));
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    const syncFromItems = (items: string[]) => {
      if (!active) return;
      setPrepared(normalizePrepared(items, validItems));
      setLoading(false);
    };

    const cached = preparedCache.get(orderId);
    if (cached) {
      syncFromItems(cached);
    } else {
      setLoading(true);
      loadPrepared(orderId)
        .then(syncFromItems)
        .catch((err) => {
          if (!active) return;
          setError(err instanceof Error ? err.message : "Chargement impossible.");
          setLoading(false);
        });
    }

    const onChange = (event: Event) => {
      const detail = (event as CustomEvent<PreparationChangeDetail>).detail;
      if (detail?.orderId === orderId) {
        syncFromItems(detail.items);
      }
    };

    window.addEventListener(CHANGE_EVENT, onChange);
    return () => {
      active = false;
      window.removeEventListener(CHANGE_EVENT, onChange);
    };
  }, [orderId, validItems]);

  return { prepared, loading, error, setError };
}

export function AdminOrderPreparationProgress({
  orderId,
  items,
}: {
  orderId: string;
  items: string[];
}) {
  const validItems = useMemo(() => Array.from(new Set(items)), [items]);
  const validSet = useMemo(() => new Set(validItems), [validItems]);
  const { prepared, loading, error, setError } = usePreparedState(orderId, validSet);
  const preparedCount = validItems.filter((item) => prepared.has(item)).length;
  const total = validItems.length;
  const percent = total > 0 ? Math.round((preparedCount / total) * 100) : 0;

  async function markAllPrepared() {
    setError(null);
    dispatchPrepared(orderId, validItems);
    try {
      dispatchPrepared(orderId, await replacePrepared(orderId, validItems));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Sauvegarde impossible.");
    }
  }

  async function resetPrepared() {
    setError(null);
    dispatchPrepared(orderId, []);
    try {
      dispatchPrepared(orderId, await replacePrepared(orderId, []));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Sauvegarde impossible.");
    }
  }

  return (
    <div className="mb-4 rounded-xl border border-violet-400/20 bg-violet-500/10 p-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="text-sm font-semibold text-white">
            Préparation : {preparedCount}/{total}
          </div>
          <div className="mt-1 text-xs text-violet-100/70">
            {loading
              ? "Chargement de la checklist..."
              : "Les cases sont synchronisées entre tes ordinateurs."}
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={markAllPrepared}
            className="rounded-full bg-violet-600 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-violet-700"
          >
            Tout cocher
          </button>
          <button
            type="button"
            onClick={resetPrepared}
            className="rounded-full bg-white/10 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-white/20"
          >
            Réinitialiser
          </button>
        </div>
      </div>

      {error ? <div className="mt-2 text-xs text-red-200">{error}</div> : null}

      <div className="mt-3 h-2 overflow-hidden rounded-full bg-white/10">
        <div
          className="h-full rounded-full bg-violet-500 transition-all"
          style={{ width: `${percent}%` }}
        />
      </div>
    </div>
  );
}

export function AdminOrderPreparedCheckboxes({
  orderId,
  itemKey,
  quantity,
}: {
  orderId: string;
  itemKey: string;
  quantity: number;
}) {
  const ids = useMemo(() => unitIds(itemKey, quantity), [itemKey, quantity]);
  const { prepared, error, setError } = usePreparedState(orderId);
  const checkedCount = ids.filter((id) => prepared.has(id)).length;

  async function toggle(id: string) {
    const nextPrepared = !prepared.has(id);
    const currentItems = preparedCache.get(orderId) ?? Array.from(prepared);
    const optimistic = new Set(currentItems);

    if (nextPrepared) {
      optimistic.add(id);
    } else {
      optimistic.delete(id);
    }

    setError(null);
    dispatchPrepared(orderId, Array.from(optimistic));

    try {
      dispatchPrepared(orderId, await setPreparedItem(orderId, id, nextPrepared));
    } catch (err) {
      dispatchPrepared(orderId, currentItems);
      setError(err instanceof Error ? err.message : "Sauvegarde impossible.");
    }
  }

  if (ids.length === 0) return null;

  return (
    <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-gray-300">
      <span className="font-semibold text-violet-200">
        Préparé{ids.length > 1 ? "es" : ""} : {checkedCount}/{ids.length}
      </span>
      <div className="flex flex-wrap gap-1.5">
        {ids.map((id, index) => (
          <label
            key={id}
            className="inline-flex cursor-pointer items-center gap-1 rounded-full border border-white/10 bg-white/5 px-2 py-1 transition hover:bg-white/10"
          >
            <input
              type="checkbox"
              checked={prepared.has(id)}
              onChange={() => toggle(id)}
              className="h-3.5 w-3.5 rounded border-white/20 bg-zinc-950 accent-violet-500"
              aria-label={`Article ${index + 1} préparé`}
            />
            <span>{ids.length > 1 ? index + 1 : "OK"}</span>
          </label>
        ))}
      </div>
      {error ? <div className="basis-full text-red-200">{error}</div> : null}
    </div>
  );
}
