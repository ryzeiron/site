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
      <section className="grid gap-4 md:grid-cols-3">
        <div className="rounded-lg border border-white/10 bg-zinc-950/75 p-5 text-gray-100 backdrop-blur-sm">
          <div className="text-xs font-semibold uppercase tracking-wider text-violet-300">
            Cartes verifiees
          </div>

          <h1 className="mt-3 text-2xl font-extrabold text-white">
            Chaque carte controlee
          </h1>

          <p className="mt-2 text-sm leading-6 text-gray-300">
            Etat, langue, rarete et visuel sont verifies avant la mise en vente.
          </p>
        </div>

        <div className="rounded-lg border border-white/10 bg-zinc-950/75 p-5 text-gray-100 backdrop-blur-sm">
          <div className="text-xs font-semibold uppercase tracking-wider text-sky-300">
            Stock en temps reel
          </div>

          <h2 className="mt-3 text-2xl font-extrabold text-white">
            Disponibilites a jour
          </h2>

          <p className="mt-2 text-sm leading-6 text-gray-300">
            Les quantites sont suivies automatiquement pour eviter les doubles
            ventes.
          </p>
        </div>

        <div className="rounded-lg border border-white/10 bg-zinc-950/75 p-5 text-gray-100 backdrop-blur-sm">
          <div className="text-xs font-semibold uppercase tracking-wider text-emerald-300">
            Livraison suivie
          </div>

          <h2 className="mt-3 text-2xl font-extrabold text-white">
            Expedition avec suivi
          </h2>

          <p className="mt-2 text-sm leading-6 text-gray-300">
            Chaque commande est preparee avec soin et suivie jusqu&apos;au point
            relais.
          </p>
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
              <div
                key={`${c.id}-${i}`}
                className={`w-48 sm:w-56 shrink-0 ${
                  i >= top.length ? "marquee-duplicate" : ""
                }`}
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
                className={`w-72 sm:w-80 shrink-0 ${
                  i >= BLOCS.length ? "marquee-duplicate" : ""
                }`}
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
