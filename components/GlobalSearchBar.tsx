"use client";

import Link from "next/link";
import { Children, useEffect, useRef, useState } from "react";
import type { ReactNode } from "react";

type CardSuggestion = {
  id: string;
  name: string;
  number: string;
  image: string | null;
  serieName: string | null;
  serieCode: string | null;
  blocName: string | null;
};

type SerieSuggestion = {
  id: string;
  name: string;
  code: string;
  image: string | null;
  blocId: string;
  blocName: string | null;
};

type SleeveSuggestion = {
  id: string;
  name: string;
  image: string | null;
  stock: number;
  priceCents: number;
};

type SearchSuggestions = {
  cards: CardSuggestion[];
  series: SerieSuggestion[];
  sleeves: SleeveSuggestion[];
};

const EMPTY_SUGGESTIONS: SearchSuggestions = {
  cards: [],
  series: [],
  sleeves: [],
};

function formatPrice(value: number) {
  return new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency: "EUR",
  }).format(value);
}

export default function GlobalSearchBar() {
  const [query, setQuery] = useState("");
  const [suggestions, setSuggestions] =
    useState<SearchSuggestions>(EMPTY_SUGGESTIONS);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const trimmedQuery = query.trim();
  const hasSuggestions =
    suggestions.cards.length > 0 ||
    suggestions.series.length > 0 ||
    suggestions.sleeves.length > 0;

  useEffect(() => {
    function onPointerDown(event: PointerEvent) {
      if (!containerRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    }

    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, []);

  useEffect(() => {
    const q = trimmedQuery;

    if (q.length < 2) {
      setSuggestions(EMPTY_SUGGESTIONS);
      setLoading(false);
      return;
    }

    const controller = new AbortController();
    const timeout = window.setTimeout(async () => {
      setLoading(true);
      try {
        const response = await fetch(
          `/api/search/suggestions?q=${encodeURIComponent(q)}`,
          { signal: controller.signal },
        );
        const data = (await response.json()) as SearchSuggestions;
        setSuggestions(data);
        setOpen(true);
      } catch (error) {
        if (!(error instanceof DOMException && error.name === "AbortError")) {
          setSuggestions(EMPTY_SUGGESTIONS);
        }
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }, 180);

    return () => {
      controller.abort();
      window.clearTimeout(timeout);
    };
  }, [trimmedQuery]);

  return (
    <div className="border-b border-white/10 bg-black/35 backdrop-blur-sm">
      <div className="mx-auto max-w-6xl px-4 py-3">
        <div ref={containerRef} className="relative">
          <form action="/recherche" className="relative">
            <input
              type="search"
              name="q"
              value={query}
              onChange={(event) => {
                setQuery(event.target.value);
                setOpen(true);
              }}
              onFocus={() => setOpen(true)}
              placeholder="Rechercher une carte, une série ou une sleeve"
              className="h-11 w-full rounded-full border border-white/10 bg-zinc-950/80 pl-11 pr-28 text-sm text-white outline-none placeholder:text-gray-500 transition focus:border-violet-400 focus:ring-2 focus:ring-violet-500/30"
            />
            <SearchIcon />
            <button
              type="submit"
              className="absolute right-1.5 top-1/2 h-8 -translate-y-1/2 rounded-full bg-violet-600 px-4 text-xs font-bold text-white transition hover:bg-violet-700"
            >
              Rechercher
            </button>
          </form>

          {open && trimmedQuery.length >= 2 ? (
            <div className="absolute left-0 right-0 top-[calc(100%+0.5rem)] z-50 overflow-hidden rounded-2xl border border-violet-300/20 bg-zinc-950/95 shadow-2xl shadow-black/60 backdrop-blur">
              <div className="max-h-[70vh] overflow-y-auto p-3">
                {loading ? (
                  <div className="rounded-xl bg-white/[0.04] px-4 py-3 text-sm text-gray-300">
                    Recherche en cours...
                  </div>
                ) : hasSuggestions ? (
                  <div className="grid gap-3 lg:grid-cols-3">
                    <SuggestionSection title="Cartes">
                      {suggestions.cards.map((card) => (
                        <Link
                          key={card.id}
                          href={`/carte/${card.id}`}
                          onClick={() => setOpen(false)}
                          className="flex gap-3 rounded-xl p-2 transition hover:bg-white/[0.06]"
                        >
                          <SuggestionImage
                            src={card.image}
                            alt={card.name}
                            fallback={card.name}
                            ratio="aspect-[3/4]"
                          />
                          <span className="min-w-0 flex-1">
                            <span className="block truncate text-sm font-semibold text-white">
                              {card.name}
                            </span>
                            <span className="mt-0.5 block truncate text-xs text-gray-400">
                              {card.number}
                              {card.serieCode ? ` - ${card.serieCode}` : ""}
                            </span>
                          </span>
                        </Link>
                      ))}
                    </SuggestionSection>

                    <SuggestionSection title="Séries">
                      {suggestions.series.map((serie) => (
                        <Link
                          key={serie.id}
                          href={`/blocs/${serie.blocId}/${serie.id}`}
                          onClick={() => setOpen(false)}
                          className="flex gap-3 rounded-xl p-2 transition hover:bg-white/[0.06]"
                        >
                          <SuggestionImage
                            src={serie.image}
                            alt={serie.name}
                            fallback={serie.code}
                            ratio="aspect-[4/3]"
                          />
                          <span className="min-w-0 flex-1">
                            <span className="block truncate text-sm font-semibold text-white">
                              {serie.code} - {serie.name}
                            </span>
                            <span className="mt-0.5 block truncate text-xs text-gray-400">
                              {serie.blocName ?? "Bloc"}
                            </span>
                          </span>
                        </Link>
                      ))}
                    </SuggestionSection>

                    <SuggestionSection title="Sleeves">
                      {suggestions.sleeves.map((sleeve) => (
                        <Link
                          key={sleeve.id}
                          href="/sleeve"
                          onClick={() => setOpen(false)}
                          className="flex gap-3 rounded-xl p-2 transition hover:bg-white/[0.06]"
                        >
                          <SuggestionImage
                            src={sleeve.image}
                            alt={sleeve.name}
                            fallback="Sleeve"
                            ratio="aspect-[4/3]"
                          />
                          <span className="min-w-0 flex-1">
                            <span className="block truncate text-sm font-semibold text-white">
                              {sleeve.name}
                            </span>
                            <span className="mt-0.5 block text-xs text-gray-400">
                              {formatPrice(sleeve.priceCents / 100)} -{" "}
                              {sleeve.stock > 0
                                ? `${sleeve.stock} dispo`
                                : "Rupture"}
                            </span>
                          </span>
                        </Link>
                      ))}
                    </SuggestionSection>
                  </div>
                ) : (
                  <div className="rounded-xl bg-white/[0.04] px-4 py-3 text-sm text-gray-300">
                    Aucun résultat rapide.
                  </div>
                )}
              </div>

              <Link
                href={`/recherche?q=${encodeURIComponent(trimmedQuery)}`}
                onClick={() => setOpen(false)}
                className="block border-t border-white/10 bg-violet-600/15 px-4 py-3 text-center text-sm font-semibold text-violet-100 transition hover:bg-violet-600/25"
              >
                Voir tous les résultats
              </Link>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}

function SuggestionSection({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  const childCount = Children.count(children);

  return (
    <section>
      <h2 className="px-2 pb-2 text-xs font-semibold uppercase tracking-[0.18em] text-violet-300">
        {title}
      </h2>
      <div className="space-y-1">
        {childCount > 0 ? (
          children
        ) : (
          <div className="rounded-xl px-2 py-3 text-sm text-gray-500">Aucun</div>
        )}
      </div>
    </section>
  );
}

function SuggestionImage({
  src,
  alt,
  fallback,
  ratio,
}: {
  src: string | null;
  alt: string;
  fallback: string;
  ratio: string;
}) {
  return (
    <span
      className={`flex w-12 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-white/10 bg-zinc-900 ${ratio}`}
    >
      {src ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={src} alt={alt} className="h-full w-full object-contain p-1" />
      ) : (
        <span className="px-1 text-center text-[10px] font-bold uppercase text-violet-200">
          {fallback.slice(0, 8)}
        </span>
      )}
    </span>
  );
}

function SearchIcon() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx="11" cy="11" r="8" />
      <path d="m21 21-4.35-4.35" />
    </svg>
  );
}
