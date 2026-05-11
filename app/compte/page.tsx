import Link from "next/link";
import { redirect } from "next/navigation";
import { desc, eq, or } from "drizzle-orm";
import { auth, signOut } from "@/lib/auth";
import { getDb } from "@/lib/db/client";
import { favoriteCards, orders } from "@/lib/db/schema";

export const dynamic = "force-dynamic";

function formatDate(d: Date): string {
  return d.toLocaleDateString("fr-FR", {
    day: "2-digit",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default async function ComptePage() {
  const session = await auth();
  if (!session?.user) {
    redirect("/connexion?callbackUrl=/compte");
  }

  const db = getDb();
  const [userOrders, userFavorites] = await Promise.all([
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
  ]);

  return (
    <div className="space-y-8 py-6">
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
            className="rounded bg-white/10 px-4 py-2 text-sm text-white hover:bg-white/20"
          >
            Se déconnecter
          </button>
        </form>
      </div>

      <section>
        <h2 className="mb-3 text-xl font-bold text-white">Mes informations</h2>
        <div className="rounded-lg border border-white/10 bg-zinc-900/70 p-4 text-gray-200">
          {session.user.name && (
            <div className="text-sm">
              <span className="text-gray-400">Nom :</span> {session.user.name}
            </div>
          )}
          <div className="text-sm">
            <span className="text-gray-400">Email :</span> {session.user.email}
          </div>
        </div>
      </section>

      <section>
        <div className="mb-3 flex items-center justify-between gap-3">
          <h2 className="text-xl font-bold text-white">
            Mes favoris ({userFavorites.length})
          </h2>
          <Link
            href="/favoris"
            className="rounded-full bg-violet-600 px-4 py-2 text-sm font-medium text-white hover:bg-violet-700"
          >
            Voir mes favoris
          </Link>
        </div>
        <div className="rounded-lg border border-white/10 bg-zinc-900/70 p-4 text-sm text-gray-300">
          Les cartes ajoutées ici te permettent de recevoir un email si une carte
          en rupture revient en stock.
        </div>
      </section>

      <section>
        <h2 className="mb-3 text-xl font-bold text-white">
          Mes commandes ({userOrders.length})
        </h2>

        {userOrders.length === 0 ? (
          <div className="rounded-lg border border-white/10 bg-zinc-900/70 p-6 text-center text-gray-400">
            <p>Aucune commande pour le moment.</p>
            <Link
              href="/blocs"
              className="mt-4 inline-block rounded-full bg-brand-500 px-5 py-2 text-sm font-medium text-white hover:bg-brand-600"
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
                              : "bg-gray-500/20 text-gray-200"
                        }`}
                      >
                        {order.status === "paid"
                          ? "Payée"
                          : order.status === "shipped"
                            ? "Expédiée"
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
    </div>
  );
}
