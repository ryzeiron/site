import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import SerieCardsGrid from "@/components/SerieCardsGrid";
import {
  cardsForSerie,
  getBloc,
  getSerie,
} from "@/lib/catalog";
import { applyStockOverrides } from "@/lib/stock";

export const dynamic = "force-dynamic";

type Params = { bloc: string; serie: string };

export async function generateMetadata({
  params,
}: {
  params: Promise<Params>;
}): Promise<Metadata> {
  const { serie: serieId } = await params;
  const serie = getSerie(serieId);
  return { title: serie ? `${serie.code} - ${serie.name}` : "Serie" };
}

export default async function SeriePage({
  params,
}: {
  params: Promise<Params>;
}) {
  const { bloc: blocId, serie: serieId } = await params;
  const bloc = getBloc(blocId);
  const serie = getSerie(serieId);
  if (!bloc || !serie || serie.blocId !== bloc.id) notFound();
  const raw = cardsForSerie(serie.id);
  let cards = raw;
  try {
    cards = await applyStockOverrides(raw);
  } catch {
    // fallback sur le catalogue si la DB est indisponible
  }

  return (
    <div>
      <nav className="text-sm text-gray-400">
        <Link href="/blocs" className="hover:underline hover:text-white">Blocs</Link> /{" "}
        <Link href={`/blocs/${bloc.id}`} className="hover:underline hover:text-white">
          {bloc.name}
        </Link>{" "}
        / <span className="text-gray-200">{serie.code}</span>
      </nav>

      <div className="mt-4 flex flex-wrap items-center gap-3">
        <span
          className={`rounded bg-gradient-to-br ${bloc.coverColor} text-white text-sm font-semibold px-3 py-1`}
        >
          {serie.code}
        </span>
        <h1 className="text-2xl md:text-3xl font-bold text-white">{serie.name}</h1>
        <span className="text-sm text-gray-400">({serie.releaseYear})</span>
      </div>

      {cards.length === 0 ? (
        <p className="mt-8 text-gray-400">
          Aucune carte disponible dans cette serie pour le moment.
        </p>
      ) : (
        <SerieCardsGrid cards={cards} />
      )}
    </div>
  );
}
