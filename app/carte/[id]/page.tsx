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
        <nav className="text-sm text-gray-400">
          <Link href="/blocs" className="hover:underline hover:text-white">Blocs</Link> /{" "}
          <Link href={`/blocs/${bloc.id}`} className="hover:underline hover:text-white">
            {bloc.name}
          </Link>{" "}
          /{" "}
          <Link href={`/blocs/${bloc.id}/${serie.id}`} className="hover:underline hover:text-white">
            {serie.code}
          </Link>{" "}
          / <span className="text-gray-200">{card.name}</span>
        </nav>
      )}

      <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-8">
        <div className="aspect-[3/4] bg-gradient-to-br from-zinc-800 to-zinc-950 border border-white/10 rounded-xl flex items-center justify-center text-gray-300 text-2xl font-bold overflow-hidden">
          {card.image ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={card.image}
              alt={card.name}
              className="w-full h-full object-contain"
            />
          ) : (
            <span className="px-4 text-center">{card.name}</span>
          )}
        </div>

        <div>
          <div className="text-sm text-gray-400">
            {serie?.code} - n {card.number}
          </div>
          <h1 className="text-3xl font-bold mt-1 text-white">{card.name}</h1>
          <div className="mt-2 flex flex-wrap gap-2 text-xs">
            <span className="rounded-full bg-amber-500/20 text-amber-300 px-2 py-1">
              {card.rarity}
            </span>
            <span className="rounded-full bg-emerald-500/20 text-emerald-300 px-2 py-1">
              Etat : {card.condition}
            </span>
            <span className="rounded-full bg-sky-500/20 text-sky-300 px-2 py-1">
              {card.language}
            </span>
          </div>

          <div className="mt-6 text-3xl font-extrabold text-brand-500">
            {formatPrice(card.priceCents)}
          </div>
          <div className="text-sm text-gray-400 mt-1">
            {card.stock > 0
              ? `${card.stock} exemplaire${card.stock > 1 ? "s" : ""} en stock`
              : "Rupture"}
          </div>

          {card.description && (
            <p className="mt-4 text-gray-300">{card.description}</p>
          )}

          <div className="mt-6 max-w-xs">
            <AddToCartButton card={card} />
          </div>
        </div>
      </div>
    </div>
  );
}
