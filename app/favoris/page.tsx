import Link from "next/link";
import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { getCard, resolveVariant } from "@/lib/catalog";
import { getDb } from "@/lib/db/client";
import { favoriteCards, favoriteSleeves } from "@/lib/db/schema";
import { formatRarityLabel } from "@/lib/display-variants";
import { formatPrice } from "@/lib/format";
import { getSleevesByIds } from "@/lib/sleeves";
import { applyStockOverrides } from "@/lib/stock";

export const dynamic = "force-dynamic";

export default async function FavorisPage() {
  const session = await auth();
  if (!session?.user) {
    redirect("/connexion?callbackUrl=/favoris");
  }

  const [cardFavorites, sleeveFavorites] = await Promise.all([
    getDb()
      .select()
      .from(favoriteCards)
      .where(eq(favoriteCards.userId, session.user.id)),
    getDb()
      .select()
      .from(favoriteSleeves)
      .where(eq(favoriteSleeves.userId, session.user.id)),
  ]);

  const rawCards = cardFavorites
    .map((favorite) => getCard(favorite.cardId))
    .filter((card): card is NonNullable<typeof card> => !!card);

  const [liveCards, favoriteSleeveProducts] = await Promise.all([
    applyStockOverrides(rawCards),
    getSleevesByIds(sleeveFavorites.map((favorite) => favorite.sleeveId)),
  ]);

  const cardMap = new Map(liveCards.map((card) => [card.id, card]));
  const sleeveMap = new Map(
    favoriteSleeveProducts.map((sleeve) => [sleeve.id, sleeve]),
  );
  const hasFavorites = cardFavorites.length > 0 || sleeveFavorites.length > 0;

  return (
    <div className="py-6">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold text-white">Mes favoris</h1>
          <p className="mt-2 text-sm text-gray-400">
            Retrouve tes cartes et sleeves favoris au même endroit.
          </p>
        </div>
        <Link
          href="/compte"
          className="rounded-full bg-white/10 px-4 py-2 text-sm text-white hover:bg-white/20"
        >
          Retour au compte
        </Link>
      </div>

      {!hasFavorites ? (
        <div className="rounded-lg border border-white/10 bg-zinc-900/70 p-6 text-center text-gray-400">
          <p>Tu n&apos;as pas encore ajouté de favori.</p>
          <Link
            href="/blocs"
            className="mt-4 inline-block rounded-full bg-brand-500 px-5 py-2 text-sm font-medium text-white hover:bg-brand-600"
          >
            Parcourir le catalogue
          </Link>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {cardFavorites.map((favorite) => {
            const card = cardMap.get(favorite.cardId);
            if (!card) return null;

            const variant = resolveVariant(card, favorite.variant);
            const outOfStock = variant.stock <= 0;

            return (
              <Link
                key={`${favorite.cardId}-${favorite.variant}`}
                href={`/carte/${card.id}`}
                className="rounded-lg border border-white/10 bg-zinc-900/70 p-4 text-gray-200 transition hover:border-violet-300/70 hover:shadow-[0_0_18px_rgba(139,92,246,0.4)]"
              >
                <div className="aspect-[3/4] overflow-hidden rounded bg-zinc-950">
                  {card.image ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={card.image}
                      alt={card.name}
                      className={`h-full w-full object-contain ${
                        outOfStock ? "opacity-50 grayscale" : ""
                      }`}
                    />
                  ) : (
                    <div className="flex h-full items-center justify-center px-4 text-center text-sm">
                      {card.name}
                    </div>
                  )}
                </div>

                <div className="mt-3 text-xs text-gray-400">{card.number}</div>
                <div className="font-semibold text-white">{card.name}</div>

                <div className="mt-2 flex items-center justify-between gap-2 text-sm">
                  <span className="rounded-full bg-violet-500/15 px-2 py-1 text-xs text-violet-200">
                    {formatRarityLabel(variant.rarity)}
                  </span>
                  <span className="font-bold text-brand-500">
                    {formatPrice(variant.price)}
                  </span>
                </div>

                <div
                  className={`mt-3 rounded px-2 py-1 text-center text-xs font-medium ${
                    outOfStock
                      ? "bg-red-500/15 text-red-200"
                      : "bg-emerald-500/15 text-emerald-200"
                  }`}
                >
                  {outOfStock
                    ? "Alerte active en cas de retour"
                    : `${variant.stock} en stock`}
                </div>
              </Link>
            );
          })}

          {sleeveFavorites.map((favorite) => {
            const sleeve = sleeveMap.get(favorite.sleeveId);
            if (!sleeve) return null;

            const outOfStock = sleeve.stock <= 0;

            return (
              <Link
                key={`sleeve-${sleeve.id}`}
                href="/sleeve"
                className="rounded-lg border border-white/10 bg-zinc-900/70 p-4 text-gray-200 transition hover:border-violet-300/70 hover:shadow-[0_0_18px_rgba(139,92,246,0.4)]"
              >
                <div className="aspect-[3/4] overflow-hidden rounded bg-zinc-950">
                  {sleeve.image ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={sleeve.image}
                      alt={sleeve.name}
                      className={`h-full w-full object-contain p-2 ${
                        outOfStock ? "opacity-50 grayscale" : ""
                      }`}
                    />
                  ) : (
                    <div className="flex h-full items-center justify-center px-4 text-center text-sm font-bold uppercase tracking-[0.18em] text-violet-200">
                      Sleeve
                    </div>
                  )}
                </div>

                <div className="mt-3 text-xs text-gray-400">Accessoire</div>
                <div className="font-semibold text-white">{sleeve.name}</div>

                <div className="mt-2 flex items-center justify-between gap-2 text-sm">
                  <span className="rounded-full bg-violet-500/15 px-2 py-1 text-xs text-violet-200">
                    Sleeve
                  </span>
                  <span className="font-bold text-brand-500">
                    {formatPrice(sleeve.priceCents / 100)}
                  </span>
                </div>

                <div
                  className={`mt-3 rounded px-2 py-1 text-center text-xs font-medium ${
                    outOfStock
                      ? "bg-red-500/15 text-red-200"
                      : "bg-emerald-500/15 text-emerald-200"
                  }`}
                >
                  {outOfStock ? "Rupture" : `${sleeve.stock} en stock`}
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
