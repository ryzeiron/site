import Link from "next/link";
import BlocTile from "@/components/BlocTile";
import CardTile from "@/components/CardTile";
import { BLOCS, featuredCards } from "@/lib/catalog";

export default function HomePage() {
  return (
    <div className="space-y-12">
      <section className="rounded-2xl bg-gradient-to-br from-amber-100 via-orange-100 to-rose-100 p-8 md:p-12">
        <h1 className="text-3xl md:text-5xl font-extrabold tracking-tight">
          Cartes Pokemon a l&apos;unite
        </h1>
        <p className="mt-3 max-w-2xl text-gray-700">
          Collection triee par blocs et series. Des classiques XY aux dernieres sorties
          Ecarlate et Violet, trouve la carte qu&apos;il te manque.
        </p>
        <div className="mt-6 flex gap-3">
          <Link
            href="/blocs"
            className="rounded-full bg-brand-500 hover:bg-brand-600 text-white px-6 py-3 font-medium"
          >
            Parcourir les blocs
          </Link>
          <Link
            href="/contact"
            className="rounded-full bg-white hover:bg-gray-50 border border-amber-300 text-brand-700 px-6 py-3 font-medium"
          >
            Nous contacter
          </Link>
        </div>
      </section>

      <section>
        <div className="flex items-end justify-between mb-4">
          <h2 className="text-2xl font-bold">Les blocs</h2>
          <Link href="/blocs" className="text-sm text-brand-700 hover:underline">
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
        <h2 className="text-2xl font-bold mb-4">Cartes en vedette</h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
          {featuredCards(8).map((c) => (
            <CardTile key={c.id} card={c} />
          ))}
        </div>
      </section>
    </div>
  );
}
