import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import CardDetailBody from "@/components/CardDetailBody";
import {
  CARDS,
  getBloc,
  getCard,
  getSerie,
} from "@/lib/catalog";

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

      <CardDetailBody card={card} />
    </div>
  );
}
