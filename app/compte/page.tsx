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

export const dynamic = "force-dynamic";

type Search = { section?: string };
type AccountSection = "infos" | "favoris" | "avis" | "commandes";

const ACCOUNT_SECTIONS: { id: AccountSection; label: string }[] = [
  { id: "infos", label: "Informations" },
  { id: "favoris", label: "Favoris" },
  { id: "avis", label: "Avis" },
  { id: "commandes", label: "Commandes" },
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
                    <div
                      key={order.id}
                      className="rounded-lg border border-white/10 bg-zinc-900/70 p-4 text-gray-200"
                    >
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div>
                          <div className="text-xs text-gray-400">
                            {formatDate(new Date(order.createdAt))}
                          </div>

                          <div className="mt-1 font-mono text-xs text-gray-500">
                            N {order.id.slice(-12)}
                          </div>

                          <div className="mt-2 text-sm">
                            <span
                              className={`inline-block rounded px-2 py-0.5 text-xs font-medium ${
                                order.status === "paid"
                                  ? "bg-emerald-500/20 text-emerald-200"
                                  : order.status === "shipped"
                                    ? "bg-blue-500/20 text-blue-200"
                                    : order.status === "picked_up"
                                      ? "bg-fuchsia-500/20 text-fuchsia-200"
                                      : "bg-gray-500/20 text-gray-200"
                              }`}
                            >
                              {order.status === "paid"
                                ? "Payée"
                                : order.status === "shipped"
                                  ? "Expédiée"
                                  : order.status === "picked_up"
                                    ? "Retirée"
                                    : order.status}
                            </span>
                          </div>
                        </div>

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
                      </div>

                      {order.mondialRelayExpeditionNumber && (
                        <div className="mt-3 text-xs text-emerald-300">
                          Suivi Mondial Relay :{" "}
                          <span className="font-mono">
                            {order.mondialRelayExpeditionNumber}
                          </span>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </section>
          )}
        </div>
      </div>
    </div>
  );
}
