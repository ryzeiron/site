import type { Metadata } from "next";
import Link from "next/link";
import CardTile from "@/components/CardTile";
import { formatRecentDate, getRecentCards } from "@/lib/recent-cards";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Nouveautés",
};

export default async function NouveautesPage() {
  const entries = await getRecentCards(48);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-white">Nouveautés</h1>
          <p className="mt-2 max-w-2xl text-sm text-gray-400">
            Les dernières cartes et variantes ajoutées au stock.
          </p>
        </div>

        <Link
          href="/blocs"
          className="rounded-full bg-white/10 px-4 py-2 text-sm font-medium text-white transition hover:bg-white/20"
        >
          Voir les blocs
        </Link>
      </div>

      {entries.length === 0 ? (
        <div className="rounded-lg border border-white/10 bg-zinc-900/70 p-6 text-gray-300">
          Aucune nouveauté en stock pour le moment.
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {entries.map(({ card, variant, updatedAt }) => {
            const date = formatRecentDate(updatedAt);

            return (
              <div key={`${card.id}-${variant}`} className="relative">
                <div className="absolute left-2 top-2 z-10 rounded-full bg-violet-600 px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-white shadow">
                  {date ? `Nouveau ${date}` : "Nouveau"}
                </div>
                <CardTile card={card} variantKey={variant} />
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
