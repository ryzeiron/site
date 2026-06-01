"use client";

import { useEffect, useMemo, useState } from "react";

const STORAGE_PREFIX = "pokedel-admin-order-preparation:";
const CHANGE_EVENT = "pokedel-admin-order-preparation-change";

function getStorageKey(orderId: string) {
  return `${STORAGE_PREFIX}${orderId}`;
}

function unitIds(itemKey: string, quantity: number) {
  const count = Math.max(0, Math.floor(quantity));
  return Array.from({ length: count }, (_, index) => `${itemKey}:${index + 1}`);
}

function readPrepared(orderId: string, validItems?: Set<string>) {
  if (typeof window === "undefined") return new Set<string>();

  try {
    const raw = window.localStorage.getItem(getStorageKey(orderId));
    const parsed = raw ? (JSON.parse(raw) as unknown) : [];
    if (!Array.isArray(parsed)) return new Set<string>();

    return new Set(
      parsed.filter(
        (item): item is string =>
          typeof item === "string" && (!validItems || validItems.has(item)),
      ),
    );
  } catch {
    return new Set<string>();
  }
}

function writePrepared(orderId: string, prepared: Set<string>) {
  if (typeof window === "undefined") return;

  window.localStorage.setItem(
    getStorageKey(orderId),
    JSON.stringify(Array.from(prepared)),
  );
  window.dispatchEvent(
    new CustomEvent(CHANGE_EVENT, {
      detail: { orderId },
    }),
  );
}

function usePreparedState(orderId: string, validItems?: Set<string>) {
  const [prepared, setPrepared] = useState<Set<string>>(new Set());

  useEffect(() => {
    const sync = () => setPrepared(readPrepared(orderId, validItems));
    sync();

    const onStorage = (event: StorageEvent) => {
      if (event.key === getStorageKey(orderId)) sync();
    };
    const onChange = (event: Event) => {
      const detail = (event as CustomEvent<{ orderId?: string }>).detail;
      if (detail?.orderId === orderId) sync();
    };

    window.addEventListener("storage", onStorage);
    window.addEventListener(CHANGE_EVENT, onChange);
    return () => {
      window.removeEventListener("storage", onStorage);
      window.removeEventListener(CHANGE_EVENT, onChange);
    };
  }, [orderId, validItems]);

  return prepared;
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
  const prepared = usePreparedState(orderId, validSet);
  const preparedCount = validItems.filter((item) => prepared.has(item)).length;
  const total = validItems.length;
  const percent = total > 0 ? Math.round((preparedCount / total) * 100) : 0;

  function markAllPrepared() {
    writePrepared(orderId, new Set(validItems));
  }

  function resetPrepared() {
    writePrepared(orderId, new Set());
  }

  return (
    <div className="mb-4 rounded-xl border border-violet-400/20 bg-violet-500/10 p-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="text-sm font-semibold text-white">
            Préparation : {preparedCount}/{total}
          </div>
          <div className="mt-1 text-xs text-violet-100/70">
            Les cases sont sauvegardées sur ce navigateur.
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
  const prepared = usePreparedState(orderId);
  const checkedCount = ids.filter((id) => prepared.has(id)).length;

  function toggle(id: string) {
    const next = readPrepared(orderId);
    if (next.has(id)) {
      next.delete(id);
    } else {
      next.add(id);
    }
    writePrepared(orderId, next);
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
    </div>
  );
}
