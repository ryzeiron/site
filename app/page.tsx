import Link from "next/link";
import BlocTile from "@/components/BlocTile";
import CardTile from "@/components/CardTile";
import { BLOCS, featuredCards } from "@/lib/catalog";

export default function HomePage() {
  const top = featuredCards(8);
  return (
    <div className="space-y-12">
      <section className="rounded-2xl bg-gradient-to-br from-violet-900/60 via-purple-900/50 to-zinc-950/70 backdrop-blur-sm border border-white/10 p-6 md:p-10 text-gray-100">
        <div className="flex items-end justify-between gap-4 mb-6">
          <div>
            <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight text-white">
              Nos meilleures cartes
            </h1>
            <p className="mt-2 text-gray-300">
              Les pieces les plus recherchees de la boutique.
            </p>
          </div>
          <Link
            href="/blocs"
            className="hidden sm:inline-flex rounded-full bg-violet-600 hover:bg-violet-700 text-white px-5 py-2.5 font-medium transition"
          >
            Tout parcourir
          </Link>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
          {top.map((c) => (
            <CardTile key={c.id} card={c} />
          ))}
        </div>
      </section>

      <section>
        <div className="flex items-end justify-between mb-4">
          <h2 className="text-2xl font-bold text-white">Les blocs</h2>
          <Link href="/blocs" className="text-sm text-violet-400 hover:text-violet-300 hover:underline">
            Voir tout
          </Link>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {BLOCS.slice(0, 3).map((b) => (
            <BlocTile key={b.id} bloc={b} />
          ))}
        </div>
      </section>
    </div>
  );
}
