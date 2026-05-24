import type { Metadata } from "next";
import FavoriteSleeveButton from "@/components/FavoriteSleeveButton";
import Link from "next/link";
import SleeveAddToCartButton from "@/components/SleeveAddToCartButton";
import { formatPrice } from "@/lib/format";
import { getSleeves } from "@/lib/sleeves";

export const metadata: Metadata = {
  title: "Sleeves",
};

export const dynamic = "force-dynamic";

const sleeveHighlights = [
  "Protection pour cartes Pokémon",
  "Formats adaptés aux cartes standard",
  "Idéal pour classeurs, top loaders et envois",
];

export default async function SleevePage() {
  const products = await getSleeves({ activeOnly: true });

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
              Retrouve ici les sleeves pour ta collection.
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
        <div className="mb-5 flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-violet-300">
              Boutique
            </p>
            <h2 className="mt-2 text-2xl font-extrabold text-white">
              Sleeves disponibles
            </h2>
          </div>
        </div>

        {products.length === 0 ? (
          <div className="rounded-lg border border-white/10 bg-white/[0.03] p-5 text-sm text-gray-300">
            Aucune sleeve disponible pour le moment.
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {products.map((product) => (
              <article
                key={product.id}
                className="rounded-lg border border-white/10 bg-zinc-900/70 p-4 text-gray-200"
              >
                <div className="relative aspect-[4/3] overflow-hidden rounded-lg border border-white/10 bg-zinc-950">
                  {product.image ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={product.image}
                      alt={product.name}
                      className={`h-full w-full object-contain p-2 ${
                        product.stock <= 0 ? "opacity-40 grayscale" : ""
                      }`}
                    />
                  ) : (
                    <div className="flex h-full items-center justify-center text-center text-sm font-bold uppercase tracking-[0.18em] text-violet-200">
                      Sleeve
                    </div>
                  )}

                  {product.stock <= 0 ? (
                    <div className="absolute inset-0 flex items-center justify-center">
                      <span className="rounded-full bg-red-600 px-4 py-1.5 text-xs font-bold uppercase tracking-wider text-white shadow">
                        Rupture
                      </span>
                    </div>
                  ) : null}
                </div>

                <div className="mt-4">
                  <h3 className="font-semibold text-white">{product.name}</h3>
                  {product.description ? (
                    <p className="mt-2 line-clamp-3 text-sm leading-6 text-gray-400">
                      {product.description}
                    </p>
                  ) : null}

                  <div className="mt-3 flex items-center justify-between gap-3">
                    <span className="text-lg font-extrabold text-brand-400">
                      {formatPrice(product.priceCents / 100)}
                    </span>
                    <span className="text-xs text-gray-400">
                      {product.stock} en stock
                    </span>
                  </div>

                  <SleeveAddToCartButton
                    sleeveId={product.id}
                    stock={product.stock}
                  />
                  <FavoriteSleeveButton sleeveId={product.id} />
                </div>
              </article>
            ))}
          </div>
        )}
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
