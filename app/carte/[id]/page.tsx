import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import CardDetailBody from "@/components/CardDetailBody";
import { getBloc, getCard, getSerie } from "@/lib/catalog";
import { shouldUseLivePublicData } from "@/lib/public-live-data";
import {
  absoluteUrl,
  createCardProductJsonLd,
  createCardSeoDescription,
  createCardSeoTitle,
  serializeJsonLd,
} from "@/lib/seo";
import { applyStockOverrides } from "@/lib/stock";

export const dynamic = "force-dynamic";

type Params = { id: string };

export async function generateMetadata({
  params,
}: {
  params: Promise<Params>;
}): Promise<Metadata> {
  const { id } = await params;
  const card = getCard(id);
  if (!card) return { title: "Carte Pokémon" };

  const serie = getSerie(card.serieId);
  const title = createCardSeoTitle(card);
  const description = createCardSeoDescription(card, serie);

  return {
    title,
    description,
    alternates: { canonical: `/carte/${card.id}` },
    openGraph: {
      title,
      description,
      url: absoluteUrl(`/carte/${card.id}`),
      type: "website",
      images: card.image
        ? [{ url: absoluteUrl(card.image), alt: `${card.name} ${card.number}` }]
        : undefined,
    },
  };
}

export default async function CardPage({
  params,
}: {
  params: Promise<Params>;
}) {
  const { id } = await params;
  const raw = getCard(id);
  if (!raw) notFound();
  let card = raw;
  if (await shouldUseLivePublicData()) {
    try {
      const [withStock] = await applyStockOverrides([raw], { cache: true });
      if (withStock) card = withStock;
    } catch {
      // garder la carte du catalogue si la DB est indisponible
    }
  }
  const serie = getSerie(card.serieId);
  const bloc = serie ? getBloc(serie.blocId) : undefined;
  const productJsonLd = createCardProductJsonLd(card, serie, bloc);

  return (
    <div>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: serializeJsonLd(productJsonLd),
        }}
      />

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

      <section className="mt-8 rounded-2xl border border-white/10 bg-zinc-950/75 p-5 text-sm text-gray-300 backdrop-blur-sm">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h2 className="text-lg font-bold text-white">
              Commande sécurisée sur PokeDel62
            </h2>
            <p className="mt-1">
              Paiement Stripe, cartes vérifiées et livraison Mondial Relay.
              Code BIENVENUE : -10% sur ta première commande.
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Link
              href="/avis"
              className="rounded-full border border-violet-300/40 px-4 py-2 font-semibold text-violet-100 transition hover:bg-violet-500/15"
            >
              Voir les avis
            </Link>
            <Link
              href="/preparation-commandes"
              className="rounded-full bg-violet-600 px-4 py-2 font-semibold text-white transition hover:bg-violet-700"
            >
              Préparation
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
