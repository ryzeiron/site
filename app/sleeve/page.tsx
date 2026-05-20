import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Sleeves",
};

const sleeveHighlights = [
  "Protection pour cartes Pokémon",
  "Formats adaptés aux cartes standard",
  "Idéal pour classeurs, top loaders et envois",
];

export default function SleevePage() {
  return (
    <div className="space-y-8">
      <section className="overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-br from-violet-900/60 via-zinc-950 to-fuchsia-950/50 p-6 text-gray-100 backdrop-blur-sm md:p-10">
        <div className="grid gap-8 lg:grid-cols-[1.1fr_0.9fr] lg:items-center">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-violet-300">
              Accessoires
            </p>
            <h1 className="mt-3 text-4xl font-extrabold tracking-tight text-white md:text-5xl">
              Sleeves
            </h1>
            <p className="mt-4 max-w-2xl text-sm leading-6 text-gray-300 md:text-base">
              Retrouve ici les protections pour garder tes cartes propres,
              protégées et prêtes à rejoindre ton classeur ou ta collection.
            </p>

            <div className="mt-6 flex flex-wrap gap-3">
              <Link
                href="/contact"
                className="rounded-full bg-violet-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-violet-700"
              >
                Demander une référence
              </Link>
              <Link
                href="/blocs"
                className="rounded-full border border-white/15 bg-white/10 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-white/20"
              >
                Voir les cartes
              </Link>
            </div>
          </div>

          <div className="relative mx-auto aspect-[4/3] w-full max-w-sm">
            <div className="absolute left-6 top-8 h-56 w-40 rotate-[-10deg] rounded-xl border border-violet-200/40 bg-violet-500/20 shadow-2xl shadow-violet-950/50" />
            <div className="absolute left-16 top-4 h-56 w-40 rotate-[4deg] rounded-xl border border-fuchsia-200/40 bg-fuchsia-500/20 shadow-2xl shadow-fuchsia-950/40" />
            <div className="absolute left-24 top-12 flex h-56 w-40 rotate-[13deg] items-center justify-center rounded-xl border border-white/30 bg-white/10 text-center text-sm font-bold uppercase tracking-[0.18em] text-white shadow-2xl shadow-black/40 backdrop-blur-sm">
              Sleeve
            </div>
          </div>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-3">
        {sleeveHighlights.map((item) => (
          <div
            key={item}
            className="rounded-lg border border-white/10 bg-zinc-950/75 p-5 text-gray-200"
          >
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-violet-500/15 text-violet-200 ring-1 ring-violet-300/25">
              <SleeveIcon />
            </div>
            <p className="mt-4 text-sm font-semibold text-white">{item}</p>
          </div>
        ))}
      </section>

      <section className="rounded-2xl border border-white/10 bg-zinc-950/75 p-6 text-gray-100 md:p-8">
        <h2 className="text-2xl font-extrabold text-white">
          Produits à venir
        </h2>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-gray-300">
          La page est prête. Il restera à ajouter les modèles disponibles, les
          prix et les stocks quand tu voudras vendre les sleeves directement
          depuis le site.
        </p>
      </section>
    </div>
  );
}

function SleeveIcon() {
  return (
    <svg
      aria-hidden
      viewBox="0 0 24 24"
      className="h-5 w-5"
      fill="none"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="2"
    >
      <path d="M8 3h8a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2Z" />
      <path d="M9 7h6" />
      <path d="M9 17h6" />
    </svg>
  );
}
