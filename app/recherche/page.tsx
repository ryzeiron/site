import type { Metadata } from "next";
import Link from "next/link";
import CardTile from "@/components/CardTile";
import { CARDS, getBloc, getSerie, type Card } from "@/lib/catalog";
import { applyStockOverrides } from "@/lib/stock";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Recherche",
};

type Search = { q?: string };

const MAX_RESULTS = 160;

function normalizeSearch(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

function searchableText(card: Card) {
  const serie = getSerie(card.serieId);
  const bloc = serie ? getBloc(serie.blocId) : undefined;

  return normalizeSearch(
    [
      card.name,
      card.number,
      card.rarity,
      card.condition,
      card.language,
      serie?.name,
      serie?.code,
      bloc?.name,
    ]
      .filter(Boolean)
      .join(" "),
  );
}

export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<Search>;
}) {
  const { q = "" } = await searchParams;
  const query = q.trim();
  const terms = normalizeSearch(query).split(/\s+/).filter(Boolean);

  const rawResults =
    terms.length > 0
      ? CARDS.filter((card) => {
          const text = searchableText(card);
          return terms.every((term) => text.includes(term));
        })
      : [];

  const visibleRawResults = rawResults.slice(0, MAX_RESULTS);
  const cards =
    visibleRawResults.length > 0
      ? await applyStockOverrides(visibleRawResults)
      : visibleRawResults;

  return (
    <div>
      <div className="rounded-lg border border-white/10 bg-zinc-950/75 p-5 backdrop-blur-sm">
        <h1 className="text-3xl font-extrabold text-white">
          Recherche globale
        </h1>
        <p className="mt-2 text-gray-300">
          Recherche une carte dans tous les blocs et toutes les séries.
        </p>

        <form action="/recherche" className="mt-5 flex flex-col gap-3 sm:flex-row">
          <input
            name="q"
            type="search"
            defaultValue={query}
            placeholder="Exemple : Pikachu, Dracaufeu, Reverse..."
            className="min-h-11 flex-1 rounded-full border border-white/10 bg-black/45 px-5 text-sm text-white outline-none placeholder:text-gray-500 focus:border-violet-400 focus:ring-2 focus:ring-violet-500/30"
          />
          <button
            type="submit"
            className="min-h-11 rounded-full bg-violet-600 px-6 text-sm font-bold text-white transition hover:bg-violet-700"
          >
            Rechercher
          </button>
        </form>
      </div>

      {terms.length === 0 ? (
        <p className="mt-8 text-gray-400">
          Tape le nom d'une carte pour afficher les résultats.
        </p>
      ) : rawResults.length === 0 ? (
        <div className="mt-8 rounded-lg border border-white/10 bg-zinc-950/70 p-6 text-center">
          <h2 className="text-xl font-bold text-white">Aucune carte trouvée</h2>
          <p className="mt-2 text-gray-400">
            Essaie avec un nom plus court ou vérifie l'orthographe.
          </p>
        </div>
      ) : (
        <section className="mt-8">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <h2 className="text-2xl font-bold text-white">
                Résultats pour "{query}"
              </h2>
              <p className="mt-1 text-sm text-gray-400">
                {rawResults.length} carte{rawResults.length > 1 ? "s" : ""} trouvée
                {rawResults.length > 1 ? "s" : ""}
                {rawResults.length > MAX_RESULTS
                  ? `, affichage des ${MAX_RESULTS} premières`
                  : ""}
              </p>
            </div>
            <Link
              href="/blocs"
              className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm font-semibold text-gray-200 transition hover:border-violet-400 hover:text-white"
            >
              Voir les blocs
            </Link>
          </div>

          <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
            {cards.map((card) => {
              const serie = getSerie(card.serieId);
              const bloc = serie ? getBloc(serie.blocId) : undefined;

              return (
                <div key={card.id}>
                  <div className="mb-2 min-h-10 rounded-lg border border-white/10 bg-black/35 px-3 py-2 text-xs text-gray-300">
                    {bloc && serie ? (
                      <>
                        <Link
                          href={`/blocs/${bloc.id}`}
                          className="text-violet-200 hover:text-white"
                        >
                          {bloc.name}
                        </Link>{" "}
                        <span className="text-gray-600">/</span>{" "}
                        <Link
                          href={`/blocs/${bloc.id}/${serie.id}`}
                          className="text-gray-200 hover:text-white"
                        >
                          {serie.name}
                        </Link>
                      </>
                    ) : (
                      "Série inconnue"
                    )}
                  </div>
                  <CardTile card={card} />
                </div>
              );
            })}
          </div>
        </section>
      )}
    </div>
  );
}
