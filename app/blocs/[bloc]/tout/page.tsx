import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import CardTile from "@/components/CardTile";
import {
  cardsForSerie,
  getBloc,
  seriesForBloc,
  type Card,
} from "@/lib/catalog";
import { shouldUseLivePublicData } from "@/lib/public-live-data";
import { applyStockOverrides } from "@/lib/stock";

export const dynamic = "force-dynamic";

type Params = { bloc: string };

export async function generateMetadata({
  params,
}: {
  params: Promise<Params>;
}): Promise<Metadata> {
  const { bloc: blocId } = await params;
  const bloc = getBloc(blocId);
  if (!bloc) return { title: "Bloc" };

  return {
    title: `Toutes les cartes ${bloc.name}`,
    description: `Retrouvez toutes les cartes Pokemon francaises du bloc ${bloc.name}, rangees par serie dans l'ordre.`,
    alternates: { canonical: `/blocs/${bloc.id}/tout` },
  };
}

export default async function BlocAllCardsPage({
  params,
}: {
  params: Promise<Params>;
}) {
  const { bloc: blocId } = await params;
  const bloc = getBloc(blocId);
  if (!bloc) notFound();

  const series = seriesForBloc(bloc.id);
  const groups = series
    .map((serie) => ({
      serie,
      cards: cardsForSerie(serie.id),
    }))
    .filter((group) => group.cards.length > 0);

  const rawCards = groups.flatMap((group) => group.cards);
  let cardsById = new Map<string, Card>();

  if (await shouldUseLivePublicData()) {
    try {
      const liveCards = await applyStockOverrides(rawCards, { cache: true });
      cardsById = new Map(liveCards.map((card) => [card.id, card]));
    } catch {
      // fallback sur le catalogue si la DB est indisponible
    }
  }

  const groupsWithLiveCards = groups.map((group) => ({
    serie: group.serie,
    cards: group.cards.map((card) => cardsById.get(card.id) ?? card),
  }));

  return (
    <div>
      <nav className="text-sm text-gray-400">
        <Link href="/blocs" className="hover:underline hover:text-white">Blocs</Link> /{" "}
        <Link href={`/blocs/${bloc.id}`} className="hover:underline hover:text-white">
          {bloc.name}
        </Link>{" "}
        / <span className="text-gray-200">Tout le bloc</span>
      </nav>

      <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="text-xs font-semibold uppercase tracking-[0.18em] text-brand-300">
            Bloc complet
          </div>
          <h1 className="mt-1 text-2xl font-bold text-white md:text-3xl">
            Toutes les cartes {bloc.name}
          </h1>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-gray-300">
            Les cartes sont affichees par serie, dans l'ordre du bloc.
          </p>
        </div>

        <Link
          href={`/blocs/${bloc.id}`}
          className="inline-flex items-center justify-center rounded-full border border-white/15 bg-white/5 px-4 py-2 text-sm font-semibold text-white transition hover:bg-white/10"
        >
          Voir les series
        </Link>
      </div>

      {groupsWithLiveCards.length === 0 ? (
        <p className="mt-8 text-gray-400">
          Aucune carte disponible dans ce bloc pour le moment.
        </p>
      ) : (
        <div className="mt-8 space-y-10">
          {groupsWithLiveCards.map(({ serie, cards }) => (
            <section key={serie.id}>
              <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                <div className="flex flex-wrap items-center gap-3">
                  <span
                    className={`rounded bg-gradient-to-br ${bloc.coverColor} px-3 py-1 text-sm font-semibold text-white`}
                  >
                    {serie.code}
                  </span>
                  <div>
                    <h2 className="text-xl font-bold text-white">{serie.name}</h2>
                    <p className="text-sm text-gray-400">{cards.length} cartes</p>
                  </div>
                </div>

                <Link
                  href={`/blocs/${bloc.id}/${serie.id}`}
                  className="text-sm font-semibold text-brand-300 hover:text-brand-200 hover:underline"
                >
                  Ouvrir la serie
                </Link>
              </div>

              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
                {cards.map((card) => (
                  <CardTile key={card.id} card={card} />
                ))}
              </div>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
