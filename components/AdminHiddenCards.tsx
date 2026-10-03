"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

type HiddenCard = {
  id: string;
  name: string;
  number: string;
  serieId: string;
  image: string | null;
};

export default function AdminHiddenCards() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [cards, setCards] = useState<HiddenCard[] | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open || cards !== null) return;

    let cancelled = false;

    (async () => {
      try {
        const res = await fetch("/api/admin/card-visibility");
        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(data.error ?? "Erreur");
        if (!cancelled) setCards(data.cards ?? []);
      } catch (e) {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : "Erreur");
          setCards([]);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [open, cards]);

  async function restore(cardId: string) {
    setBusy(cardId);
    setError(null);

    try {
      const res = await fetch("/api/admin/card-visibility", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cardIds: [cardId] }),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error ?? "Erreur");

      // Retrait immediat de la liste, sans attendre un rechargement.
      setCards((current) =>
        (current ?? []).filter((card) => card.id !== cardId),
      );
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erreur");
    } finally {
      setBusy(null);
    }
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="mb-4 rounded-full border border-white/15 bg-white/5 px-4 py-2 text-sm text-gray-200 transition hover:bg-white/10"
      >
        Cartes masquees
      </button>
    );
  }

  return (
    <div className="mb-4 rounded-2xl border border-white/10 bg-zinc-950/70 p-4">
      <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
        <div>
          <h2 className="font-bold text-white">Cartes masquees</h2>
          <p className="text-xs text-gray-400">
            Elles n&apos;apparaissent plus en boutique. Leur stock et leur prix
            sont conserves.
          </p>
        </div>

        <button
          type="button"
          onClick={() => setOpen(false)}
          className="text-xs text-gray-300 underline hover:text-white"
        >
          Fermer
        </button>
      </div>

      {error ? (
        <p className="mb-2 text-xs text-red-400">{error}</p>
      ) : null}

      {cards === null ? (
        <p className="text-sm text-gray-400">Chargement...</p>
      ) : cards.length === 0 ? (
        <p className="text-sm text-gray-400">Aucune carte masquee.</p>
      ) : (
        <ul className="divide-y divide-white/10">
          {cards.map((card) => (
            <li
              key={card.id}
              className="flex items-center justify-between gap-3 py-2"
            >
              <div className="flex min-w-0 items-center gap-3">
                <div className="h-12 w-9 shrink-0 overflow-hidden rounded border border-white/10 bg-zinc-900">
                  {card.image ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={card.image}
                      alt=""
                      className="h-full w-full object-contain"
                    />
                  ) : null}
                </div>

                <div className="min-w-0">
                  <div className="truncate text-sm font-semibold text-white">
                    {card.name}
                  </div>
                  <div className="font-mono text-xs text-gray-500">
                    {card.number} - {card.serieId}
                  </div>
                </div>
              </div>

              <button
                type="button"
                onClick={() => restore(card.id)}
                disabled={busy === card.id}
                className="shrink-0 rounded bg-emerald-600/80 px-3 py-1.5 text-xs font-medium text-white transition hover:bg-emerald-600 disabled:opacity-60"
              >
                {busy === card.id ? "..." : "Restaurer"}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
