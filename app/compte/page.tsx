import Link from "next/link";
import { redirect } from "next/navigation";
import { desc, eq, or } from "drizzle-orm";
import DeliveryProfileForm from "@/components/DeliveryProfileForm";
import { auth, signOut } from "@/lib/auth";
import { getDb } from "@/lib/db/client";
import {
  favoriteCards,
  favoriteSleeves,
  orders,
  userDeliveryProfiles,
} from "@/lib/db/schema";
import {
  type DeliveryProfileData,
  isDeliveryCountry,
} from "@/lib/delivery-profile";
import {
  buildOrderContents,
  type OrderContent,
} from "@/lib/order-contents";
import { formatCents } from "@/lib/format";
import {
  getLoyaltyHistory,
  getPointsBalance,
  type LoyaltyEntry,
} from "@/lib/loyalty";
import { LOYALTY_TIERS } from "@/lib/loyalty-tiers";

export const dynamic = "force-dynamic";

type Search = { section?: string };
type AccountSection = "infos" | "favoris" | "avis" | "commandes" | "fidelite";

const ACCOUNT_SECTIONS: { id: AccountSection; label: string }[] = [
  { id: "infos", label: "Informations" },
  { id: "favoris", label: "Favoris" },
  { id: "avis", label: "Avis" },
  { id: "commandes", label: "Commandes" },
  { id: "fidelite", label: "Fidélité" },
];

function getAccountSection(section?: string): AccountSection {
  return ACCOUNT_SECTIONS.some((item) => item.id === section)
    ? (section as AccountSection)
    : "infos";
}

function tabClass(active: boolean): string {
  return [
    "flex min-w-max items-center justify-between gap-3 rounded-xl px-4 py-3 text-sm font-semibold transition lg:min-w-0",
    active
      ? "bg-violet-600 text-white shadow-lg shadow-violet-950/25"
      : "bg-white/[0.04] text-gray-300 hover:bg-violet-600/25 hover:text-white",
  ].join(" ");
}

function formatDate(d: Date): string {
  return d.toLocaleDateString("fr-FR", {
    day: "2-digit",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function AccountOrderContentDetails({ content }: { content?: OrderContent }) {
  if (!content) {
    return (
      <div className="px-4 pb-4 text-sm text-gray-400">
        Contenu de commande indisponible pour le moment.
      </div>
    );
  }

  if (content.error) {
    return (
      <div className="mx-4 mb-4 rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-100">
        Contenu de commande indisponible : {content.error}
      </div>
    );
  }

  if (content.cardGroups.length === 0 && content.sleeveLines.length === 0) {
    return (
      <div className="mx-4 mb-4 rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 text-sm text-amber-100">
        Aucun article trouve dans cette commande.
      </div>
    );
  }

  const visibleTotalCents =
    content.orderTotalCents ??
    content.itemsTotalCents +
      (content.shippingTotalCents ?? 0) -
      content.discountTotalCents;

  return (
    <div className="space-y-4 border-t border-white/10 px-4 py-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="text-sm font-semibold text-white">
          Contenu de la commande
        </div>
        <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-gray-300">
          {content.totalQuantity} article{content.totalQuantity > 1 ? "s" : ""}
        </span>
      </div>

      {content.cardGroups.map((group) => (
        <div
          key={group.key}
          className="rounded-xl border border-white/10 bg-black/20"
        >
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-white/10 px-3 py-2">
            <div>
              <div className="text-xs uppercase tracking-[0.14em] text-gray-500">
                {group.blocName}
              </div>
              <div className="font-semibold text-white">
                {group.serieName}{" "}
                <span className="text-xs font-normal text-gray-500">
                  {group.serieCode}
                </span>
              </div>
            </div>
            <span className="rounded-full bg-violet-500/15 px-2 py-1 text-xs text-violet-200">
              {group.lines.reduce((total, line) => total + line.quantity, 0)} carte
              {group.lines.reduce((total, line) => total + line.quantity, 0) > 1
                ? "s"
                : ""}
            </span>
          </div>

          <div className="divide-y divide-white/10">
            {group.lines.map((line) => (
              <div
                key={line.key}
                className="grid gap-3 px-3 py-3 sm:grid-cols-[3.25rem_1fr_7rem_auto] sm:items-center"
              >
                <div className="flex h-16 w-12 items-center justify-center overflow-hidden rounded border border-white/10 bg-zinc-900 text-[10px] text-gray-500">
                  {line.image ? (
                    <img
                      src={line.image}
                      alt={line.name}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    "Image"
                  )}
                </div>

                <div>
                  <div className="font-semibold text-white">
                    {line.name}{" "}
                    <span className="font-mono text-xs text-gray-500">
                      {line.number}
                    </span>
                  </div>
                  <div className="mt-1 flex flex-wrap gap-1.5 text-xs text-gray-300">
                    <span className="rounded-full bg-white/10 px-2 py-1">
                      {line.rarity}
                    </span>
                  </div>
                </div>

                <div className="text-sm font-bold text-white">
                  <div>{formatCents(line.lineTotalCents)}</div>
                  <div className="mt-1 text-xs font-normal text-gray-500">
                    {formatCents(line.unitPriceCents)} / u.
                  </div>
                </div>

                <div className="text-right text-sm font-bold text-white sm:text-left">
                  x{line.quantity}
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}

      {content.sleeveLines.length > 0 ? (
        <div className="rounded-xl border border-white/10 bg-black/20">
          <div className="border-b border-white/10 px-3 py-2 font-semibold text-white">
            Sleeves
          </div>
          <div className="divide-y divide-white/10">
            {content.sleeveLines.map((line) => (
              <div
                key={line.key}
                className="grid gap-3 px-3 py-3 sm:grid-cols-[3.25rem_1fr_7rem_auto] sm:items-center"
              >
                <div className="flex h-16 w-12 items-center justify-center overflow-hidden rounded border border-white/10 bg-zinc-900 text-[10px] text-gray-500">
                  {line.image ? (
                    <img
                      src={line.image}
                      alt={line.name}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    "Sleeve"
                  )}
                </div>
                <div className="font-semibold text-white">{line.name}</div>
                <div className="text-sm font-bold text-white">
                  <div>{formatCents(line.lineTotalCents)}</div>
                  <div className="mt-1 text-xs font-normal text-gray-500">
                    {formatCents(line.unitPriceCents)} / u.
                  </div>
                </div>
                <div className="text-right text-sm font-bold text-white sm:text-left">
                  x{line.quantity}
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : null}

      <div className="rounded-xl border border-white/10 bg-black/20 p-3 text-sm">
        <div className="flex justify-between gap-3 text-gray-300">
          <span>Articles</span>
          <span className="font-semibold text-white">
            {formatCents(content.itemsTotalCents)}
          </span>
        </div>
        {content.discountTotalCents > 0 && (
          <div className="mt-1 flex justify-between gap-3 text-emerald-200">
            <span>Reduction</span>
            <span>- {formatCents(content.discountTotalCents)}</span>
          </div>
        )}
        {content.shippingTotalCents !== null && (
          <div className="mt-1 flex justify-between gap-3 text-gray-300">
            <span>Livraison</span>
            <span>{formatCents(content.shippingTotalCents)}</span>
          </div>
        )}
        <div className="mt-2 flex justify-between gap-3 border-t border-white/10 pt-2 text-base font-bold text-white">
          <span>Total paye</span>
          <span>{formatCents(visibleTotalCents)}</span>
        </div>

        {content.loyaltySpentPoints > 0 && (
          <div className="mt-3 rounded-lg border border-violet-400/30 bg-violet-500/10 p-2 text-xs text-violet-100">
            <div className="font-semibold text-white">Avantage fidélité</div>
            <div className="mt-1">
              {content.loyaltyTierLabel} — {content.loyaltySpentPoints} points
              utilisés
            </div>
          </div>
        )}

        {content.loyaltyEarnedPoints > 0 && (
          <div className="mt-2 text-xs text-emerald-200">
            + {content.loyaltyEarnedPoints} points gagnés sur cette commande
          </div>
        )}
      </div>
    </div>
  );
}

export default async function ComptePage({
  searchParams,
}: {
  searchParams: Promise<Search>;
}) {
  const session = await auth();

  if (!session?.user) {
    redirect("/connexion?callbackUrl=/compte");
  }

  const { section } = await searchParams;
  const activeSection = getAccountSection(section);

  const db = getDb();

  const [userOrders, userCardFavorites, userSleeveFavorites, deliveryProfile] =
    await Promise.all([
      db
        .select()
        .from(orders)
        .where(
          or(
            eq(orders.userId, session.user.id),
            eq(orders.customerEmail, session.user.email),
          ),
        )
        .orderBy(desc(orders.createdAt)),
      db
        .select()
        .from(favoriteCards)
        .where(eq(favoriteCards.userId, session.user.id)),
      db
        .select()
        .from(favoriteSleeves)
        .where(eq(favoriteSleeves.userId, session.user.id)),
      db
        .select()
        .from(userDeliveryProfiles)
        .where(eq(userDeliveryProfiles.userId, session.user.id))
        .limit(1)
        .then((rows): DeliveryProfileData | null => {
          const profile = rows[0];
          if (!profile) return null;

          return {
            firstName: profile.firstName,
            lastName: profile.lastName,
            phone: profile.phone,
            address: profile.address,
            postcode: profile.postcode,
            city: profile.city,
            country: isDeliveryCountry(profile.country) ? profile.country : "FR",
            relayCode: profile.relayCode,
            relayName: profile.relayName,
            relayAddress: profile.relayAddress,
            relayPostcode: profile.relayPostcode,
            relayCity: profile.relayCity,
          };
        })
        .catch(() => null),
    ]);
  const favoriteCount = userCardFavorites.length + userSleeveFavorites.length;
  const orderContents =
    activeSection === "commandes" && userOrders.length > 0
      ? await buildOrderContents(userOrders)
      : new Map<string, OrderContent>();

  const [pointsBalance, loyaltyHistory] =
    activeSection === "fidelite"
      ? await Promise.all([
          getPointsBalance(session.user.id),
          getLoyaltyHistory(session.user.id),
        ])
      : [0, [] as LoyaltyEntry[]];

  return (
    <div className="space-y-6 py-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold text-white">Mon compte</h1>
          <p className="mt-1 text-sm text-gray-400">
            Connecté en tant que <strong>{session.user.email}</strong>
          </p>
        </div>

        <form
          action={async () => {
            "use server";
            await signOut({ redirectTo: "/" });
          }}
        >
          <button
            type="submit"
            className="rounded-full bg-white/10 px-4 py-2 text-sm text-white transition hover:bg-white/20"
          >
            Se déconnecter
          </button>
        </form>
      </div>

      <div className="grid gap-6 lg:grid-cols-[15rem_1fr] lg:items-start">
        <nav className="rounded-2xl border border-violet-300/15 bg-zinc-950/75 p-2 backdrop-blur-sm lg:sticky lg:top-24">
          <div className="px-2 pb-2 pt-1 text-xs font-semibold uppercase tracking-[0.2em] text-violet-300">
            Menu compte
          </div>
          <div className="flex gap-2 overflow-x-auto pb-1 lg:flex-col lg:overflow-visible lg:pb-0">
            {ACCOUNT_SECTIONS.map((item) => {
              const count =
                item.id === "favoris"
                  ? favoriteCount
                  : item.id === "commandes"
                    ? userOrders.length
                    : null;

              return (
                <Link
                  key={item.id}
                  href={`/compte?section=${item.id}`}
                  className={tabClass(activeSection === item.id)}
                  aria-current={activeSection === item.id ? "page" : undefined}
                >
                  <span>{item.label}</span>
                  {count !== null && (
                    <span className="rounded-full bg-white/10 px-2 py-0.5 text-xs">
                      {count}
                    </span>
                  )}
                </Link>
              );
            })}
          </div>
        </nav>

        <div className="min-w-0">
          {activeSection === "infos" && (
            <section>
              <h2 className="mb-3 text-xl font-bold text-white">
                Mes informations
              </h2>
              <div className="space-y-4">
                <div className="rounded-lg border border-white/10 bg-zinc-900/70 p-4 text-gray-200">
                  {session.user.name && (
                    <div className="text-sm">
                      <span className="text-gray-400">Nom :</span>{" "}
                      {session.user.name}
                    </div>
                  )}

                  <div className="text-sm">
                    <span className="text-gray-400">Email :</span>{" "}
                    {session.user.email}
                  </div>
                </div>

                <DeliveryProfileForm initialProfile={deliveryProfile} />
              </div>
            </section>
          )}

          {activeSection === "favoris" && (
            <section>
              <div className="mb-3 flex items-center justify-between gap-3">
                <h2 className="text-xl font-bold text-white">
                  Mes favoris ({favoriteCount})
                </h2>

                <Link
                  href="/favoris"
                  className="rounded-full bg-violet-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-violet-700"
                >
                  Voir mes favoris
                </Link>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <Link
                  href="/favoris?type=cartes"
                  className="rounded-2xl border border-violet-300/15 bg-zinc-900/70 p-4 text-gray-200 transition hover:border-violet-300/60 hover:bg-zinc-900"
                >
                  <div className="text-sm text-gray-400">Cartes favorites</div>
                  <div className="mt-2 text-3xl font-bold text-white">
                    {userCardFavorites.length}
                  </div>
                  <p className="mt-2 text-xs text-gray-500">
                    Cartes suivies, avec alerte si une variante revient en stock.
                  </p>
                </Link>

                <Link
                  href="/favoris?type=sleeves"
                  className="rounded-2xl border border-violet-300/15 bg-zinc-900/70 p-4 text-gray-200 transition hover:border-violet-300/60 hover:bg-zinc-900"
                >
                  <div className="text-sm text-gray-400">Sleeves favoris</div>
                  <div className="mt-2 text-3xl font-bold text-white">
                    {userSleeveFavorites.length}
                  </div>
                  <p className="mt-2 text-xs text-gray-500">
                    Accessoires sauvegardés pour les retrouver plus vite.
                  </p>
                </Link>
              </div>
            </section>
          )}

          {activeSection === "avis" && (
            <section>
              <div className="rounded-lg border border-white/10 bg-zinc-900/70 p-4 text-gray-200">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <h2 className="text-xl font-bold text-white">Mon avis</h2>
                    <p className="mt-1 text-sm text-gray-400">
                      Les clients ayant déjà commandé peuvent laisser un avis
                      sur la boutique.
                    </p>
                  </div>

                  <Link
                    href="/avis"
                    className="rounded-full bg-violet-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-violet-700"
                  >
                    Laisser un avis
                  </Link>
                </div>
              </div>
            </section>
          )}

          {activeSection === "commandes" && (
            <section>
              <h2 className="mb-3 text-xl font-bold text-white">
                Mes commandes ({userOrders.length})
              </h2>

              {userOrders.length === 0 ? (
                <div className="rounded-lg border border-white/10 bg-zinc-900/70 p-6 text-center text-gray-400">
                  <p>Aucune commande pour le moment.</p>

                  <Link
                    href="/blocs"
                    className="mt-4 inline-block rounded-full bg-violet-600 px-5 py-2 text-sm font-medium text-white transition hover:bg-violet-700"
                  >
                    Parcourir le catalogue
                  </Link>
                </div>
              ) : (
                <div className="space-y-3">
                  {userOrders.map((order) => (
                    <details
                      key={order.id}
                      className="group rounded-lg border border-white/10 bg-zinc-900/70 text-gray-200"
                    >
                      <summary className="cursor-pointer list-none p-4 [&::-webkit-details-marker]:hidden">
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div>
                          <div className="text-xs text-gray-400">
                            {formatDate(new Date(order.createdAt))}
                          </div>

                          <div className="mt-1 font-mono text-xs text-gray-500">
                            N {order.id.slice(-12)}
                          </div>

                          <div className="mt-2 flex flex-wrap items-center gap-2 text-sm">
                            <span
                              className={`inline-block rounded px-2 py-0.5 text-xs font-medium ${
                                order.status === "paid"
                                  ? "bg-emerald-500/20 text-emerald-200"
                                  : order.status === "label_to_create"
                                    ? "bg-sky-500/20 text-sky-200"
                                  : order.status === "label_created"
                                      ? "bg-violet-500/20 text-violet-200"
                                  : order.status === "shipped"
                                    ? "bg-blue-500/20 text-blue-200"
                                    : order.status === "ready_for_pickup"
                                      ? "bg-emerald-500/20 text-emerald-200"
                                    : order.status === "picked_up"
                                      ? "bg-fuchsia-500/20 text-fuchsia-200"
                                      : "bg-gray-500/20 text-gray-200"
                              }`}
                            >
                              {order.status === "paid"
                                ? "Payée"
                                : order.status === "label_to_create"
                                  ? "À préparer"
                                  : order.status === "label_created"
                                    ? "Prête à déposer"
                                : order.status === "shipped"
                                  ? "Colis expédié"
                                : order.status === "ready_for_pickup"
                                  ? "Colis à retirer"
                                  : order.status === "picked_up"
                                    ? "Retirée"
                                    : order.status}
                            </span>
                            <span className="text-xs font-semibold text-violet-200">
                              Cliquer pour voir le contenu
                            </span>
                          </div>
                        </div>

                        <div className="flex items-start gap-3">
                          {order.relayName && (
                            <div className="text-right text-xs text-gray-300">
                              <div className="font-semibold text-white">
                                {order.relayName}
                              </div>
                              <div>{order.relayAddress}</div>
                              <div>
                                {order.relayPostcode} {order.relayCity}
                              </div>
                            </div>
                          )}
                          <span className="rounded-full border border-white/10 bg-white/5 px-2 py-1 text-xs text-gray-300 transition group-open:rotate-180">
                            v
                          </span>
                        </div>
                      </div>

                      {order.mondialRelayExpeditionNumber && (
                        <div className="mt-3 text-xs text-emerald-300">
                          Suivi Mondial Relay :{" "}
                          <span className="font-mono">
                            {order.mondialRelayExpeditionNumber}
                          </span>
                        </div>
                      )}
                      </summary>

                      <AccountOrderContentDetails
                        content={orderContents.get(order.id)}
                      />

                      <div className="border-t border-white/10 px-4 pb-4 pt-3">
                        <div className="flex flex-wrap gap-3">
                          <Link
                            href={`/suivi-commande/${order.stripeSessionId}`}
                            className="text-xs font-semibold text-violet-200 transition hover:text-violet-100"
                          >
                            Voir le suivi de commande
                          </Link>
                          <Link
                            href={`/facture/${order.id}`}
                            target="_blank"
                            className="text-xs font-semibold text-violet-200 transition hover:text-violet-100"
                          >
                            Voir la facture
                          </Link>
                        </div>
                      </div>
                    </details>
                  ))}
                </div>
              )}
            </section>
          )}

          {activeSection === "fidelite" && (
            <section>
              <h2 className="mb-3 text-xl font-bold text-white">
                Mes points fidélité
              </h2>

              <div className="rounded-2xl border border-violet-300/25 bg-gradient-to-br from-violet-600/25 via-fuchsia-500/10 to-transparent p-6">
                <div className="text-xs uppercase tracking-[0.18em] text-violet-200">
                  Solde actuel
                </div>
                <div className="mt-2 flex items-baseline gap-2">
                  <span className="text-5xl font-bold text-white">
                    {pointsBalance}
                  </span>
                  <span className="text-lg font-semibold text-violet-100">
                    point{pointsBalance > 1 ? "s" : ""}
                  </span>
                </div>
                <p className="mt-3 text-sm text-gray-300">
                  Vous gagnez <strong>1 point par euro d&apos;articles</strong>{" "}
                  sur chaque commande payée, hors frais de port et assurance.
                  Utilisez vos points directement dans le panier. Non cumulable
                  avec un code promo.
                </p>
              </div>

              <div className="mt-6">
                <h3 className="mb-3 text-sm font-semibold uppercase tracking-[0.14em] text-violet-200">
                  Paliers
                </h3>

                <div className="grid gap-2">
                  {LOYALTY_TIERS.map((tier) => {
                    const unlocked = pointsBalance >= tier.points;
                    const progress = Math.min(
                      100,
                      Math.round((pointsBalance / tier.points) * 100),
                    );

                    return (
                      <div
                        key={tier.points}
                        className={`rounded-xl border p-3 ${
                          unlocked
                            ? "border-emerald-400/40 bg-emerald-500/10"
                            : "border-white/10 bg-zinc-900/70"
                        }`}
                      >
                        <div className="flex items-center justify-between gap-3">
                          <div
                            className={`font-semibold ${
                              unlocked ? "text-emerald-100" : "text-white"
                            }`}
                          >
                            {tier.label}
                          </div>
                          <div className="text-xs text-gray-400">
                            {unlocked ? "Débloqué" : `${tier.points} pts`}
                          </div>
                        </div>

                        {!unlocked && (
                          <>
                            <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-white/10">
                              <div
                                className="h-full rounded-full bg-violet-500"
                                style={{ width: `${progress}%` }}
                              />
                            </div>
                            <div className="mt-1 text-xs text-gray-500">
                              Encore {tier.points - pointsBalance} point
                              {tier.points - pointsBalance > 1 ? "s" : ""}
                            </div>
                          </>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="mt-6">
                <h3 className="mb-3 text-sm font-semibold uppercase tracking-[0.14em] text-violet-200">
                  Historique
                </h3>

                {loyaltyHistory.length === 0 ? (
                  <div className="rounded-lg border border-white/10 bg-zinc-900/70 p-6 text-center text-sm text-gray-400">
                    Aucun mouvement pour le moment. Passez une commande pour
                    commencer à cumuler des points.
                  </div>
                ) : (
                  <ul className="divide-y divide-white/10 rounded-lg border border-white/10 bg-zinc-900/70">
                    {loyaltyHistory.map((entry) => (
                      <li
                        key={entry.id}
                        className="flex items-center justify-between gap-3 px-4 py-3 text-sm"
                      >
                        <div>
                          <div className="font-semibold text-white">
                            {entry.reason === "order"
                              ? "Commande"
                              : entry.reason === "redeem"
                                ? "Utilisation"
                                : entry.reason === "refund"
                                  ? "Remboursement"
                                  : "Ajustement"}
                          </div>
                          <div className="mt-0.5 text-xs text-gray-400">
                            {formatDate(new Date(entry.createdAt))}
                            {entry.orderId && (
                              <>
                                {" "}
                                — <span className="font-mono">
                                  N {entry.orderId.slice(-12)}
                                </span>
                              </>
                            )}
                          </div>
                        </div>
                        <div
                          className={`text-lg font-bold ${
                            entry.delta >= 0
                              ? "text-emerald-300"
                              : "text-rose-300"
                          }`}
                        >
                          {entry.delta >= 0 ? "+" : ""}
                          {entry.delta}
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </section>
          )}
        </div>
      </div>
    </div>
  );
}
