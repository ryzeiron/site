import type { Metadata } from "next";
import SleeveCatalogGrid from "@/components/SleeveCatalogGrid";
import { getCatalogSleeves } from "@/lib/catalog/sleeves";
import { shouldUseLivePublicData } from "@/lib/public-live-data";
import { getSleeves, type SleeveProduct } from "@/lib/sleeves";

export const metadata: Metadata = {
  title: "Sleeves",
};

export const dynamic = "force-dynamic";

function getCatalogSleeveProducts(): SleeveProduct[] {
  return getCatalogSleeves()
    .filter((sleeve) => sleeve.active ?? true)
    .map((sleeve) => ({
      id: sleeve.id,
      name: sleeve.name,
      description: sleeve.description ?? null,
      image: sleeve.image ?? null,
      priceCents: sleeve.defaultPriceCents,
      stock: sleeve.defaultStock,
      active: sleeve.active ?? true,
      hasOverride: false,
    }));
}

export default async function SleevePage() {
  const products = (await shouldUseLivePublicData())
    ? await getSleeves({ activeOnly: true, cache: true })
    : getCatalogSleeveProducts();

  return (
    <div className="space-y-5">
      <section className="overflow-hidden rounded-xl border border-white/10 bg-gradient-to-br from-violet-900/45 via-zinc-950 to-fuchsia-950/35 p-4 text-gray-100 backdrop-blur-sm md:p-6">
        <div className="grid gap-4 lg:grid-cols-[1fr_16rem] lg:items-center">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-violet-300">
              Accessoires
            </p>
            <h1 className="mt-2 text-3xl font-extrabold tracking-tight text-white md:text-4xl">
              Sleeves
            </h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-gray-300">
              Retrouve les sleeves disponibles pour proteger tes cartes et completer tes commandes.
            </p>
            <p className="mt-3 text-sm font-semibold text-violet-200">
              {products.length} sleeve{products.length > 1 ? "s" : ""} en catalogue
            </p>
          </div>

          <div className="relative hidden h-32 lg:block">
            <div className="absolute right-20 top-4 h-28 w-20 rotate-[-10deg] rounded-lg border border-violet-200/40 bg-violet-500/20 shadow-xl shadow-violet-950/40" />
            <div className="absolute right-10 top-1 h-28 w-20 rotate-[5deg] rounded-lg border border-fuchsia-200/40 bg-fuchsia-500/20 shadow-xl shadow-fuchsia-950/30" />
            <div className="absolute right-0 top-5 flex h-28 w-20 rotate-[13deg] items-center justify-center rounded-lg border border-white/30 bg-white/10 text-center text-[10px] font-bold uppercase tracking-[0.18em] text-white shadow-xl shadow-black/30 backdrop-blur-sm">
              Sleeve
            </div>
          </div>
        </div>
      </section>

      <section id="sleeves-list" className="text-gray-100">
        <div className="mb-4 flex flex-wrap items-end justify-between gap-4">
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
          <SleeveCatalogGrid products={products} />
        )}
      </section>
    </div>
  );
}
