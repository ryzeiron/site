import Link from "next/link";
import BlocTile from "@/components/BlocTile";
import CardTile from "@/components/CardTile";
import { BLOCS, featuredCards } from "@/lib/catalog";

export default function HomePage() {
  const top = featuredCards(12);
  const loop = [...top, ...top];
  return (
    <div className="space-y-12">
      <section className="relative overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-r from-violet-700 via-fuchsia-600 to-violet-700 px-6 py-6 md:px-10 md:py-8 text-white shadow-lg">
        <div className="absolute inset-0 opacity-20 bg-[radial-gradient(circle_at_20%_50%,white_0,transparent_40%),radial-gradient(circle_at_80%_50%,white_0,transparent_40%)] pointer-events-none" />
        <div className="relative flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <span className="text-3xl md:text-4xl">✨</span>
            <div>
              <p className="text-xs uppercase tracking-[0.3em] text-violet-200">
                Bienvenue chez PokeDel
              </p>
              <h2 className="text-xl md:text-2xl font-extrabold">
                La boutique des dresseurs passionnes
              </h2>
            </div>
          </div>
          <Link
            href="/blocs"
            className="rounded-full bg-white/15 hover:bg-white/25 border border-white/30 px-5 py-2 text-sm font-semibold backdrop-blur transition"
          >
            Decouvrir le catalogue
          </Link>
        </div>
      </section>

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
        <div className="marquee-container relative overflow-hidden [mask-image:linear-gradient(to_right,transparent,black_5%,black_95%,transparent)]">
          <div className="marquee-track flex gap-4">
            {loop.map((c, i) => (
              <div key={`${c.id}-${i}`} className="w-48 sm:w-56 shrink-0">
                <CardTile card={c} />
              </div>
            ))}
          </div>
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
