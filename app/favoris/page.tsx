import Link from "next/link";
import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { getCard, resolveVariant } from "@/lib/catalog";
import { getDb } from "@/lib/db/client";
import { favoriteCards } from "@/lib/db/schema";
import { formatRarityLabel } from "@/lib/display-variants";
import { formatPrice } from "@/lib/format";
import { applyStockOverrides } from "@/lib/stock";

export const dynamic = "force-dynamic";

export default async function FavorisPage() {
  const session = await auth();
  if (!session?.user) {
    redirect("/connexion?callbackUrl=/favoris");
  }

  const favorites = await getDb()
    .select()
    .from(favoriteCards)
    .where(eq(favoriteCards.userId, session.user.id));

  const rawCards = favorites
    .map((favorite) => getCard(favorite.cardId))
    .filter((card): card is NonNullable<typeof card> => !!card);

  const liveCards = await applyStockOverrides(rawCards);
  const cardMap = new Map(liveCards.map((card) => [card.id, card]));

  return (
    <div className="py-6">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold text-white">Mes favoris</h1>
          <p className="mt-2 text-sm text-gray-400">
            Tu recevras un email quand une carte favorite en rupture revient en stock.
          </p>
        </div>
        <Link
          href="/compte"
          className="rounded-full bg-white/10 px-4 py-2 text-sm text-white hover:bg-white/20"
        >
          Retour au compte
        </Link>
      </div>

      {favorites.length === 0 ? (
        <div className="rounded-lg border border-white/10 bg-zinc-900/70 p-6 text-center text-gray-400">
          <p>Tu n&apos;as pas encore ajouté de carte favorite.</p>
          <Link
            href="/blocs"
            className="mt-4 inline-block rounded-full bg-brand-500 px-5 py-2 text-sm font-medium text-white hover:bg-brand-600"
          >
            Parcourir le catalogue
          </Link>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {favorites.map((favorite) => {
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
        </div>
      )}
    </div>
  );
}
