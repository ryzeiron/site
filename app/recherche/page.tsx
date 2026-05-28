import type { Metadata } from "next";
import Link from "next/link";
import CardTile from "@/components/CardTile";
import FavoriteSleeveButton from "@/components/FavoriteSleeveButton";
import GlobalSearchForm from "@/components/GlobalSearchForm";
import SleeveAddToCartButton from "@/components/SleeveAddToCartButton";
import StockBadge from "@/components/StockBadge";
import {
  CARDS,
  SERIES,
  getBloc,
  getSerie,
  listVariants,
  type Card,
  type Serie,
} from "@/lib/catalog";
import { formatPrice } from "@/lib/format";
import { shouldUseLivePublicData } from "@/lib/public-live-data";
import { getSleeves, type SleeveProduct } from "@/lib/sleeves";
import { applyStockOverrides } from "@/lib/stock";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Recherche",
};

type Search = { q?: string; inStock?: string };

const MAX_CARD_RESULTS = 160;
const MAX_SERIE_RESULTS = 24;
const MAX_SLEEVE_RESULTS = 24;

function normalizeSearch(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

function matchesTerms(text: string, terms: string[]) {
  const normalized = normalizeSearch(text);
  return terms.every((term) => normalized.includes(term));
}

function searchableCardText(card: Card) {
  const serie = getSerie(card.serieId);
  const bloc = serie ? getBloc(serie.blocId) : undefined;

  return [
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
    .join(" ");
}

function searchableSerieText(serie: Serie) {
  const bloc = getBloc(serie.blocId);
  return [serie.name, serie.code, bloc?.name].filter(Boolean).join(" ");
}

function searchableSleeveText(sleeve: SleeveProduct) {
  return [sleeve.name, sleeve.description].filter(Boolean).join(" ");
}

function hasAvailableVariant(card: Card) {
  return listVariants(card).some(({ variant }) => variant.stock > 0);
}

export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<Search>;
}) {
  const { q = "", inStock } = await searchParams;
  const query = q.trim();
  const onlyInStock = inStock === "1" || inStock === "on" || inStock === "true";
  const terms = normalizeSearch(query).split(/\s+/).filter(Boolean);
  const useLiveData = await shouldUseLivePublicData();

  const rawCardResults =
    terms.length > 0
      ? CARDS.filter((card) => matchesTerms(searchableCardText(card), terms))
      : [];

  const serieResults =
    terms.length > 0
      ? SERIES.filter((serie) => matchesTerms(searchableSerieText(serie), terms)).slice(
          0,
          MAX_SERIE_RESULTS,
        )
      : [];

  const sleeveResults =
    terms.length > 0 && useLiveData
      ? (await getSleeves({ activeOnly: true, cache: true }))
          .filter((sleeve) => matchesTerms(searchableSleeveText(sleeve), terms))
          .filter((sleeve) => !onlyInStock || sleeve.stock > 0)
          .slice(0, MAX_SLEEVE_RESULTS)
      : [];

  const cardsWithStock =
    rawCardResults.length > 0 && useLiveData
      ? await applyStockOverrides(rawCardResults, { cache: true })
      : rawCardResults;
  const cardResults = onlyInStock
    ? cardsWithStock.filter(hasAvailableVariant)
    : cardsWithStock;
  const cards = cardResults.slice(0, MAX_CARD_RESULTS);
  const totalResults =
    cardResults.length + serieResults.length + sleeveResults.length;

  return (
    <div>
      <div className="rounded-lg border border-white/10 bg-zinc-950/75 p-5 backdrop-blur-sm">
        <h1 className="text-3xl font-extrabold text-white">
          Recherche globale
        </h1>
        <p className="mt-2 text-gray-300">
          Recherche une carte, une série ou une sleeve dans tout le site.
        </p>

        <GlobalSearchForm query={query} onlyInStock={onlyInStock} />
      </div>

      {terms.length === 0 ? (
        <p className="mt-8 text-gray-400">
          Tape un nom pour afficher les résultats.
        </p>
      ) : totalResults === 0 ? (
        <div className="mt-8 rounded-lg border border-white/10 bg-zinc-950/70 p-6 text-center">
          <h2 className="text-xl font-bold text-white">Aucun résultat trouvé</h2>
          <p className="mt-2 text-gray-400">
            Essaie avec un nom plus court ou vérifie l'orthographe.
          </p>
        </div>
      ) : (
        <div className="mt-8 space-y-10">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <h2 className="text-2xl font-bold text-white">
                Résultats pour "{query}"
              </h2>
              <p className="mt-1 text-sm text-gray-400">
                {cardResults.length} carte
                {cardResults.length > 1 ? "s" : ""}, {serieResults.length} série
                {serieResults.length > 1 ? "s" : ""}, {sleeveResults.length} sleeve
                {sleeveResults.length > 1 ? "s" : ""}.
              </p>
            </div>
            <Link
              href="/blocs"
              className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm font-semibold text-gray-200 transition hover:border-violet-400 hover:text-white"
            >
              Voir les blocs
            </Link>
          </div>

          {serieResults.length > 0 ? (
            <section>
              <h3 className="text-xl font-bold text-white">Séries</h3>
              <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {serieResults.map((serie) => {
                  const bloc = getBloc(serie.blocId);

                  return (
                    <Link
                      key={serie.id}
                      href={`/blocs/${bloc?.id ?? serie.blocId}/${serie.id}`}
                      className="flex gap-4 rounded-xl border border-white/10 bg-zinc-950/70 p-3 text-gray-200 transition hover:border-violet-400/60 hover:bg-violet-500/10"
                    >
                      <div className="flex aspect-[4/3] w-20 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-white/10 bg-zinc-900">
                        {serie.image ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={serie.image}
                            alt={serie.name}
                            className="h-full w-full object-contain p-1"
                          />
                        ) : (
                          <span className="text-sm font-bold text-violet-200">
                            {serie.code}
                          </span>
                        )}
                      </div>
                      <div className="min-w-0">
                        <div className="text-sm text-violet-200">{serie.code}</div>
                        <div className="truncate font-semibold text-white">
                          {serie.name}
                        </div>
                        <div className="mt-1 truncate text-xs text-gray-400">
                          {bloc?.name ?? "Bloc"}
                        </div>
                      </div>
                    </Link>
                  );
                })}
              </div>
            </section>
          ) : null}

          {sleeveResults.length > 0 ? (
            <section>
              <h3 className="text-xl font-bold text-white">Sleeves</h3>
              <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {sleeveResults.map((sleeve) => (
                  <SleeveSearchCard key={sleeve.id} sleeve={sleeve} />
                ))}
              </div>
            </section>
          ) : null}

          {cards.length > 0 ? (
            <section>
              <div className="flex flex-wrap items-end justify-between gap-3">
                <div>
                  <h3 className="text-xl font-bold text-white">Cartes</h3>
                  {cardResults.length > MAX_CARD_RESULTS ? (
                    <p className="mt-1 text-sm text-gray-400">
                      Affichage des {MAX_CARD_RESULTS} premières cartes.
                    </p>
                  ) : null}
                </div>
              </div>

              <div className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
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
          ) : null}
        </div>
      )}
    </div>
  );
}

function SleeveSearchCard({ sleeve }: { sleeve: SleeveProduct }) {
  return (
    <article className="rounded-lg border border-white/10 bg-zinc-900/70 p-4 text-gray-200">
      <Link href="/sleeve" className="block">
        <div className="relative aspect-[4/3] overflow-hidden rounded-lg border border-white/10 bg-zinc-950">
          {sleeve.image ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={sleeve.image}
              alt={sleeve.name}
              className={`h-full w-full object-contain p-2 ${
                sleeve.stock <= 0 ? "opacity-40 grayscale" : ""
              }`}
            />
          ) : (
            <div className="flex h-full items-center justify-center text-center text-sm font-bold uppercase tracking-[0.18em] text-violet-200">
              Sleeve
            </div>
          )}

          {sleeve.stock <= 0 ? (
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="rounded-full bg-red-600 px-4 py-1.5 text-xs font-bold uppercase tracking-wider text-white shadow">
                Rupture
              </span>
            </div>
          ) : null}
        </div>

        <h4 className="mt-4 font-semibold text-white">{sleeve.name}</h4>
        {sleeve.description ? (
          <p className="mt-2 line-clamp-2 text-sm leading-6 text-gray-400">
            {sleeve.description}
          </p>
        ) : null}
      </Link>

      <div className="mt-3 flex items-center justify-between gap-3">
        <span className="text-lg font-extrabold text-brand-400">
          {formatPrice(sleeve.priceCents / 100)}
        </span>
        <StockBadge
          stock={sleeve.stock}
          compact
          label={sleeve.stock <= 0 ? "Rupture" : `${sleeve.stock} dispo`}
        />
      </div>

      <SleeveAddToCartButton sleeveId={sleeve.id} stock={sleeve.stock} />
      <FavoriteSleeveButton sleeveId={sleeve.id} />
    </article>
  );
}
