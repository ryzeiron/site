import Link from "next/link";
import BlocTile from "@/components/BlocTile";
import CardTile from "@/components/CardTile";
import { BLOCS, featuredCards } from "@/lib/catalog";

export default function HomePage() {
  return (
    <div className="space-y-12">
      <section className="rounded-2xl bg-gradient-to-br from-violet-900/60 via-purple-900/50 to-zinc-950/70 backdrop-blur-sm border border-white/10 p-8 md:p-12 text-gray-100">
        <h1 className="text-3xl md:text-5xl font-extrabold tracking-tight text-white">
          Cartes Pokemon a l&apos;unite
        </h1>
        <p className="mt-3 max-w-2xl text-gray-300">
          Collection triee par blocs et series. Des classiques XY aux dernieres sorties
          Ecarlate et Violet, trouve la carte qu&apos;il te manque.
        </p>
        <div className="mt-6 flex gap-3">
          <Link
            href="/blocs"
            className="rounded-full bg-violet-600 hover:bg-violet-700 text-white px-6 py-3 font-medium transition"
          >
            Parcourir les blocs
          </Link>
          <Link
            href="/contact"
            className="rounded-full bg-white/10 hover:bg-white/20 border border-white/20 text-white px-6 py-3 font-medium transition"
          >
            Nous contacter
          </Link>
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

      <section>
        <h2 className="text-2xl font-bold mb-4 text-white">Cartes en vedette</h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
          {featuredCards(8).map((c) => (
            <CardTile key={c.id} card={c} />
          ))}
        </div>
      </section>
    </div>
  );
}
