import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import AddToCartButton from "@/components/AddToCartButton";
import {
  CARDS,
  getBloc,
  getCard,
  getSerie,
} from "@/lib/catalog";
import { formatPrice } from "@/lib/format";

type Params = { id: string };

export function generateStaticParams(): Params[] {
  return CARDS.map((c) => ({ id: c.id }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<Params>;
}): Promise<Metadata> {
  const { id } = await params;
  const card = getCard(id);
  return { title: card ? card.name : "Carte" };
}

export default async function CardPage({
  params,
}: {
  params: Promise<Params>;
}) {
  const { id } = await params;
  const card = getCard(id);
  if (!card) notFound();
  const serie = getSerie(card.serieId);
  const bloc = serie ? getBloc(serie.blocId) : undefined;

  return (
    <div>
      {bloc && serie && (
        <nav className="text-sm text-gray-500">
          <Link href="/blocs" className="hover:underline">Blocs</Link> /{" "}
          <Link href={`/blocs/${bloc.id}`} className="hover:underline">
            {bloc.name}
          </Link>{" "}
          /{" "}
          <Link href={`/blocs/${bloc.id}/${serie.id}`} className="hover:underline">
            {serie.code}
          </Link>{" "}
          / <span>{card.name}</span>
        </nav>
      )}

      <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-8">
        <div className="aspect-[3/4] bg-gradient-to-br from-amber-100 to-orange-100 rounded-xl flex items-center justify-center text-amber-900 text-2xl font-bold">
          {card.name}
        </div>

        <div>
          <div className="text-sm text-gray-500">
            {serie?.code} - n {card.number}
          </div>
          <h1 className="text-3xl font-bold mt-1">{card.name}</h1>
          <div className="mt-2 flex flex-wrap gap-2 text-xs">
            <span className="rounded-full bg-amber-100 text-amber-800 px-2 py-1">
              {card.rarity}
            </span>
            <span className="rounded-full bg-emerald-100 text-emerald-800 px-2 py-1">
              Etat : {card.condition}
            </span>
            <span className="rounded-full bg-sky-100 text-sky-800 px-2 py-1">
              {card.language}
            </span>
          </div>

          <div className="mt-6 text-3xl font-extrabold text-brand-700">
            {formatPrice(card.priceCents)}
          </div>
          <div className="text-sm text-gray-500 mt-1">
            {card.stock > 0
              ? `${card.stock} exemplaire${card.stock > 1 ? "s" : ""} en stock`
              : "Rupture"}
          </div>

          {card.description && (
            <p className="mt-4 text-gray-700">{card.description}</p>
          )}

          <div className="mt-6 max-w-xs">
            <AddToCartButton card={card} />
          </div>
        </div>
      </div>
    </div>
  );
}
