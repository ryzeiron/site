import Link from "next/link";
import CardTile from "@/components/CardTile";
import type { Card } from "@/lib/catalog";

type SeoLandingPageProps = {
  eyebrow: string;
  title: string;
  description: string;
  highlights: string[];
  cards: Card[];
};

export default function SeoLandingPage({
  eyebrow,
  title,
  description,
  highlights,
  cards,
}: SeoLandingPageProps) {
  return (
    <div className="space-y-8">
      <section className="rounded-2xl border border-violet-300/20 bg-zinc-950/80 p-6 text-gray-100 shadow-lg shadow-black/20 backdrop-blur-sm md:p-10">
        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-violet-300">
          {eyebrow}
        </p>
        <h1 className="mt-2 text-3xl font-extrabold tracking-tight text-white md:text-4xl">
          {title}
        </h1>
        <p className="mt-3 max-w-3xl text-sm leading-6 text-gray-300 md:text-base">
          {description}
        </p>

        <div className="mt-6 grid gap-3 sm:grid-cols-3">
          {highlights.map((item) => (
            <div
              key={item}
              className="rounded-lg border border-white/10 bg-white/[0.04] px-4 py-3 text-sm text-gray-200"
            >
              {item}
            </div>
          ))}
        </div>

        <div className="mt-6 flex flex-wrap gap-3">
          <Link
            href="/blocs"
            className="rounded-full bg-violet-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-violet-700"
          >
            Voir les blocs
          </Link>
          <Link
            href="/nouveautes"
            className="rounded-full border border-violet-300/40 px-5 py-2.5 text-sm font-semibold text-violet-100 transition hover:bg-violet-500/15"
          >
            Voir les derniers ajouts
          </Link>
        </div>
      </section>

      <section>
        <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="text-2xl font-bold text-white">Cartes à découvrir</h2>
            <p className="mt-1 text-sm text-gray-400">
              Sélection issue du catalogue, sans appel direct à la base Neon.
            </p>
          </div>
          <Link href="/recherche" className="text-sm font-semibold text-violet-300 hover:text-white">
            Rechercher une carte
          </Link>
        </div>

        {cards.length === 0 ? (
          <div className="rounded-lg border border-white/10 bg-white/[0.03] p-5 text-sm text-gray-300">
            Aucune carte à afficher pour le moment.
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
            {cards.map((card) => (
              <CardTile key={card.id} card={card} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
