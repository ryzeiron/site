import type { Metadata } from "next";
import Link from "next/link";
import CardTile from "@/components/CardTile";
import FavoriteSleeveButton from "@/components/FavoriteSleeveButton";
import SleeveAddToCartButton from "@/components/SleeveAddToCartButton";
import StockBadge from "@/components/StockBadge";
import { formatRecentDate, getRecentCards } from "@/lib/recent-cards";
import { formatPrice } from "@/lib/format";
import { shouldUseLivePublicData } from "@/lib/public-live-data";
import { getSleeves } from "@/lib/sleeves";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Nouveautés",
};

type Search = { type?: string };
type ViewMode = "tout" | "cartes" | "premium" | "secretes" | "sleeves";

function getMode(value?: string): ViewMode {
  if (
    value === "cartes" ||
    value === "premium" ||
    value === "secretes" ||
    value === "sleeves"
  ) {
    return value;
  }

  return "tout";
}

function tabClass(active: boolean) {
  return [
    "rounded-full px-4 py-2 text-sm font-semibold transition",
    active
      ? "bg-violet-600 text-white"
      : "bg-white/10 text-gray-300 hover:bg-white/20 hover:text-white",
  ].join(" ");
}

export default async function NouveautesPage({
  searchParams,
}: {
  searchParams: Promise<Search>;
}) {
  const { type } = await searchParams;
  const mode = getMode(type);
  const cardOptions =
    mode === "premium"
      ? { rarities: ["Ultra Rare", "Secrete"] as const }
      : mode === "secretes"
        ? { rarities: ["Secrete"] as const }
        : {};
  const showCards = mode !== "sleeves";
  const showSleeves = mode === "tout" || mode === "sleeves";
  const useLiveData = await shouldUseLivePublicData();

  const [entries, sleeveProducts] = useLiveData
    ? await Promise.all([
        showCards ? getRecentCards(mode === "tout" ? 24 : 48, cardOptions) : [],
        showSleeves ? getSleeves({ activeOnly: true, cache: true }) : [],
      ])
    : [[], []];
  const sleeves = sleeveProducts.filter((sleeve) => sleeve.stock > 0).slice(0, 24);
  const hasContent = entries.length > 0 || sleeves.length > 0;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-white">Nouveautés</h1>
          <p className="mt-2 max-w-2xl text-sm text-gray-400">
            Les derniers ajouts disponibles, avec un accès rapide aux cartes
            premium et aux sleeves.
          </p>
        </div>

        <Link
          href="/blocs"
          className="rounded-full bg-white/10 px-4 py-2 text-sm font-medium text-white transition hover:bg-white/20"
        >
          Voir les blocs
        </Link>
      </div>

      <div className="flex flex-wrap gap-2">
        <Link href="/nouveautes" className={tabClass(mode === "tout")}>
          Tout
        </Link>
        <Link
          href="/nouveautes?type=cartes"
          className={tabClass(mode === "cartes")}
        >
          Cartes
        </Link>
        <Link
          href="/nouveautes?type=premium"
          className={tabClass(mode === "premium")}
        >
          Ultra + Secrètes
        </Link>
        <Link
          href="/nouveautes?type=secretes"
          className={tabClass(mode === "secretes")}
        >
          Secrètes
        </Link>
        <Link
          href="/nouveautes?type=sleeves"
          className={tabClass(mode === "sleeves")}
        >
          Sleeves
        </Link>
      </div>

      {!hasContent ? (
        <div className="rounded-lg border border-white/10 bg-zinc-900/70 p-6 text-gray-300">
          Aucune nouveauté en stock pour le moment.
        </div>
      ) : (
        <div className="space-y-8">
          {entries.length > 0 ? (
            <section>
              <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
                <h2 className="text-xl font-bold text-white">
                  Dernières cartes ajoutées
                </h2>
                <span className="rounded-full bg-violet-500/15 px-3 py-1 text-sm font-semibold text-violet-100">
                  {entries.length} carte{entries.length > 1 ? "s" : ""}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
                {entries.map(({ card, variant, updatedAt }) => {
                  const date = formatRecentDate(updatedAt);

                  return (
                    <div key={`${card.id}-${variant}`} className="relative">
                      <div className="absolute left-2 top-10 z-10 rounded-full bg-violet-600 px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-white shadow">
                        {date ? `Ajout ${date}` : "Ajout récent"}
                      </div>
                      <CardTile card={card} variantKey={variant} />
                    </div>
                  );
                })}
              </div>
            </section>
          ) : null}

          {sleeves.length > 0 ? (
            <section>
              <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
                <h2 className="text-xl font-bold text-white">
                  Sleeves en stock
                </h2>
                <span className="rounded-full bg-violet-500/15 px-3 py-1 text-sm font-semibold text-violet-100">
                  {sleeves.length} sleeve{sleeves.length > 1 ? "s" : ""}
                </span>
              </div>

              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                {sleeves.map((sleeve) => (
                  <article
                    key={sleeve.id}
                    className="rounded-xl border border-white/10 bg-zinc-900/70 p-4 text-gray-200 transition hover:border-violet-300/60"
                  >
                    <div className="relative aspect-[4/3] overflow-hidden rounded-lg border border-white/10 bg-zinc-950">
                      {sleeve.image ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={sleeve.image}
                          alt={sleeve.name}
                          className="h-full w-full object-contain p-2"
                        />
                      ) : (
                        <div className="flex h-full items-center justify-center text-center text-sm font-bold uppercase tracking-[0.18em] text-violet-200">
                          Sleeve
                        </div>
                      )}

                      <div className="absolute left-2 top-2">
                        <StockBadge
                          stock={sleeve.stock}
                          compact
                          label={`${sleeve.stock} dispo`}
                        />
                      </div>
                    </div>

                    <div className="mt-4">
                      <h3 className="font-semibold text-white">{sleeve.name}</h3>
                      <div className="mt-2 flex items-center justify-between gap-3">
                        <span className="text-lg font-extrabold text-brand-400">
                          {formatPrice(sleeve.priceCents / 100)}
                        </span>
                        <span className="text-xs text-gray-400">Sleeve</span>
                      </div>
                      <SleeveAddToCartButton
                        sleeveId={sleeve.id}
                        stock={sleeve.stock}
                      />
                      <FavoriteSleeveButton sleeveId={sleeve.id} />
                    </div>
                  </article>
                ))}
              </div>
            </section>
          ) : null}
        </div>
      )}
    </div>
  );
}
