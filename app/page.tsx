import Link from "next/link";
import BlocTile from "@/components/BlocTile";
import CardTile from "@/components/CardTile";
import { BLOCS, featuredCards } from "@/lib/catalog";
import { applyStockOverrides } from "@/lib/stock";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const featured = featuredCards(12);
  let top = featured;
  try {
    top = await applyStockOverrides(featured);
  } catch {
    // fallback sur le catalogue si la DB est indisponible
  }
  const loop = [...top, ...top];
  const blocsLoop = [...BLOCS, ...BLOCS];
  return (
    <div className="space-y-12">
      <section className="relative overflow-hidden rounded-2xl border border-white/10 shadow-lg">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/banniere.png"
          alt="Banniere PokeDel"
          className="w-full h-auto block"
        />
        <a
          href="https://voggt.com/fr/del6.2"
          target="_blank"
          rel="noopener noreferrer"
          aria-label="Del6.2 en live sur Voggt"
          className="absolute left-1/2 -translate-x-1/2 bottom-[10%] w-[25%] h-[25%] rounded-full border-2 border-white/70 hover:border-white hover:bg-white/10 transition"
        />
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
              <div
                key={`${c.id}-${i}`}
                className={`w-48 sm:w-56 shrink-0 ${i >= top.length ? "marquee-duplicate" : ""}`}
              >
                <CardTile card={c} />
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="rounded-2xl bg-gradient-to-br from-violet-900/60 via-purple-900/50 to-zinc-950/70 backdrop-blur-sm border border-white/10 p-6 md:p-10 text-gray-100">
        <div className="flex items-end justify-between gap-4 mb-6">
          <div>
            <h2 className="text-3xl md:text-4xl font-extrabold tracking-tight text-white">
              Les blocs
            </h2>
            <p className="mt-2 text-gray-300">
              Explorez les series par bloc.
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
            {blocsLoop.map((b, i) => (
              <div
                key={`${b.id}-${i}`}
                className={`w-72 sm:w-80 shrink-0 ${i >= BLOCS.length ? "marquee-duplicate" : ""}`}
              >
                <BlocTile bloc={b} />
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
