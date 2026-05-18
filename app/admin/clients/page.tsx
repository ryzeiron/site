import Link from "next/link";
import { redirect } from "next/navigation";
import { desc } from "drizzle-orm";
import LogoutButton from "@/components/LogoutButton";
import { isAdmin } from "@/lib/admin/auth";
import { getCard, resolveVariant } from "@/lib/catalog";
import { getDb } from "@/lib/db/client";
import { favoriteCards, orders, users } from "@/lib/db/schema";
import { formatRarityLabel } from "@/lib/display-variants";
import { formatPrice } from "@/lib/format";
import { applyStockOverrides } from "@/lib/stock";

export const dynamic = "force-dynamic";

const STATUS_LABELS: Record<string, string> = {
  paid: "Commande payée",
  label_to_create: "Bordereau à créer",
  label_created: "Étiquette créée",
  shipped: "Colis expédié",
};

function formatDate(value: Date | string | null | undefined) {
  if (!value) return "-";
  return new Date(value).toLocaleString("fr-FR", {
    day: "2-digit",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default async function AdminClientsPage() {
  if (!(await isAdmin())) redirect("/admin/login");

  const db = getDb();
  const [clientRows, orderRows, favoriteRows] = await Promise.all([
    db.select().from(users).orderBy(desc(users.createdAt)),
    db.select().from(orders).orderBy(desc(orders.createdAt)),
    db.select().from(favoriteCards).orderBy(desc(favoriteCards.createdAt)),
  ]);

  const favoriteCardIds = Array.from(
    new Set(favoriteRows.map((favorite) => favorite.cardId)),
  );

  const rawFavoriteCards = favoriteCardIds
    .map((cardId) => getCard(cardId))
    .filter((card): card is NonNullable<typeof card> => !!card);

  const liveFavoriteCards = await applyStockOverrides(rawFavoriteCards);
  const favoriteCardMap = new Map(
    liveFavoriteCards.map((card) => [card.id, card]),
  );

  const ordersByUser = new Map<string, typeof orderRows>();
  const favoritesByUser = new Map<string, typeof favoriteRows>();

  for (const order of orderRows) {
    const key = order.userId || order.customerEmail || "";
    if (!key) continue;

    const group = ordersByUser.get(key) ?? [];
    group.push(order);
    ordersByUser.set(key, group);
  }

  for (const favorite of favoriteRows) {
    const group = favoritesByUser.get(favorite.userId) ?? [];
    group.push(favorite);
    favoritesByUser.set(favorite.userId, group);
  }

  return (
    <div className="py-6">
      <div className="mb-6 flex items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-white">Admin - Clients</h1>
          <p className="mt-1 text-sm text-gray-400">
            Consulte les comptes clients, leurs commandes et leurs favoris.
          </p>
        </div>

        <LogoutButton />
      </div>

      <div className="mb-6 flex flex-wrap gap-3">
        <Link href="/admin" className="rounded bg-white/10 px-4 py-2 text-sm text-white hover:bg-white/20">
          Retour stocks
        </Link>

        <Link href="/admin/modifications" className="rounded bg-white/10 px-4 py-2 text-sm text-white hover:bg-white/20">
          Modifications
        </Link>

        <Link href="/admin/commandes" className="rounded bg-white/10 px-4 py-2 text-sm text-white hover:bg-white/20">
          Commandes
        </Link>

        <Link href="/admin/favoris" className="rounded bg-white/10 px-4 py-2 text-sm text-white hover:bg-white/20">
          Favoris
        </Link>

        <Link href="/admin/avis" className="rounded bg-white/10 px-4 py-2 text-sm text-white hover:bg-white/20">
          Avis
        </Link>
      </div>

      <div className="mb-6 grid gap-3 sm:grid-cols-3">
        <div className="rounded-lg border border-white/10 bg-zinc-900/70 p-4">
          <div className="text-sm text-gray-400">Comptes clients</div>
          <div className="mt-1 text-2xl font-bold text-white">{clientRows.length}</div>
        </div>

        <div className="rounded-lg border border-white/10 bg-zinc-900/70 p-4">
          <div className="text-sm text-gray-400">Commandes enregistrées</div>
          <div className="mt-1 text-2xl font-bold text-white">{orderRows.length}</div>
        </div>

        <div className="rounded-lg border border-white/10 bg-zinc-900/70 p-4">
          <div className="text-sm text-gray-400">Favoris enregistrés</div>
          <div className="mt-1 text-2xl font-bold text-white">{favoriteRows.length}</div>
        </div>
      </div>

      {clientRows.length === 0 ? (
        <p className="text-gray-400">Aucun compte client pour le moment.</p>
      ) : (
        <div className="space-y-4">
          {clientRows.map((client) => {
            const clientOrders = [
              ...(ordersByUser.get(client.id) ?? []),
              ...(ordersByUser.get(client.email) ?? []),
            ];

            const clientFavorites = favoritesByUser.get(client.id) ?? [];

            return (
              <section key={client.id} className="rounded-lg border border-white/10 bg-zinc-900/70 p-4 text-gray-200">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div>
                    <h2 className="text-xl font-bold text-white">
                      {client.name || "Client sans nom"}
                    </h2>

                    <div className="mt-1 text-sm text-gray-300">{client.email}</div>
                    <div className="mt-1 font-mono text-xs text-gray-500">ID : {client.id}</div>
                  </div>

                  <div className="text-right text-xs text-gray-400">
                    <div>Compte créé le</div>
                    <div className="text-gray-200">{formatDate(client.createdAt)}</div>
                  </div>
                </div>

                <div className="mt-4 grid gap-4 lg:grid-cols-2">
                  <div className="rounded-lg border border-white/10 bg-black/20 p-3">
                    <h3 className="mb-3 font-semibold text-white">
                      Commandes ({clientOrders.length})
                    </h3>

                    {clientOrders.length === 0 ? (
                      <p className="text-sm text-gray-400">Aucune commande liée à ce compte.</p>
                    ) : (
                      <div className="space-y-3">
                        <AdminOrderMiniCard order={clientOrders[0]} />

                        {clientOrders.length > 1 && (
                          <details className="group rounded border border-white/10 bg-zinc-950/30">
                            <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-3 py-2 text-sm text-gray-200 transition hover:bg-white/5">
                              <span>
                                Voir les {clientOrders.length - 1} autre
                                {clientOrders.length - 1 > 1 ? "s" : ""} commande
                                {clientOrders.length - 1 > 1 ? "s" : ""}
                              </span>
                              <span className="text-lg text-violet-300 transition group-open:rotate-180">v</span>
                            </summary>

                            <div className="space-y-3 border-t border-white/10 p-3">
                              {clientOrders.slice(1).map((order) => (
                                <AdminOrderMiniCard key={order.id} order={order} />
                              ))}
                            </div>
                          </details>
                        )}
                      </div>
                    )}
                  </div>

                  <div className="rounded-lg border border-white/10 bg-black/20 p-3">
                    <h3 className="mb-3 font-semibold text-white">
                      Favoris ({clientFavorites.length})
                    </h3>

                    {clientFavorites.length === 0 ? (
                      <p className="text-sm text-gray-400">Aucun favori enregistré.</p>
                    ) : (
                      <div className="space-y-3">
                        <AdminFavoriteMiniCard favorite={clientFavorites[0]} favoriteCardMap={favoriteCardMap} />

                        {clientFavorites.length > 1 && (
                          <details className="group rounded border border-white/10 bg-zinc-950/30">
                            <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-3 py-2 text-sm text-gray-200 transition hover:bg-white/5">
                              <span>
                                Voir les {clientFavorites.length - 1} autre
                                {clientFavorites.length - 1 > 1 ? "s" : ""} favori
                                {clientFavorites.length - 1 > 1 ? "s" : ""}
                              </span>
                              <span className="text-lg text-violet-300 transition group-open:rotate-180">v</span>
                            </summary>

                            <div className="space-y-3 border-t border-white/10 p-3">
                              {clientFavorites.slice(1).map((favorite) => (
                                <AdminFavoriteMiniCard
                                  key={`${favorite.userId}-${favorite.cardId}-${favorite.variant}`}
                                  favorite={favorite}
                                  favoriteCardMap={favoriteCardMap}
                                />
                              ))}
                            </div>
                          </details>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </section>
            );
          })}
        </div>
      )}
    </div>
  );
}

type OrderRow = typeof orders.$inferSelect;
type FavoriteRow = typeof favoriteCards.$inferSelect;
type CardMap = Map<string, NonNullable<ReturnType<typeof getCard>>>;

function AdminOrderMiniCard({ order }: { order: OrderRow }) {
  return (
    <div className="rounded border border-white/10 bg-zinc-950/50 p-3 text-sm">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <div className="font-mono text-xs text-gray-400">{order.id}</div>
          <div className="mt-1">{STATUS_LABELS[order.status] ?? order.status}</div>
        </div>

        <div className="text-xs text-gray-400">{formatDate(order.createdAt)}</div>
      </div>

      <div className="mt-2 grid gap-1 text-xs text-gray-300">
        <div><span className="text-gray-500">Nom :</span> {order.customerName ?? "-"}</div>
        <div><span className="text-gray-500">Email :</span> {order.customerEmail ?? "-"}</div>
        <div><span className="text-gray-500">Téléphone :</span> {order.customerPhone ?? "-"}</div>
        <div><span className="text-gray-500">Pays :</span> {order.country ?? "-"}</div>
        <div><span className="text-gray-500">Relais :</span> {order.relayName ?? "-"}</div>

        {order.mondialRelayExpeditionNumber && (
          <div className="text-emerald-300">
            Suivi : {order.mondialRelayExpeditionNumber}
          </div>
        )}
      </div>
    </div>
  );
}

function AdminFavoriteMiniCard({
  favorite,
  favoriteCardMap,
}: {
  favorite: FavoriteRow;
  favoriteCardMap: CardMap;
}) {
  const card = favoriteCardMap.get(favorite.cardId);
  const variant = card ? resolveVariant(card, favorite.variant) : null;
  const outOfStock = !variant || variant.stock <= 0;

  return (
    <Link
      href={`/carte/${favorite.cardId}`}
      className="block rounded border border-white/10 bg-zinc-950/50 p-3 text-sm transition hover:border-violet-300/60"
    >
      <div className="font-semibold text-white">{card?.name ?? favorite.cardId}</div>

      <div className="mt-1 text-xs text-gray-400">
        {card?.number ?? "-"} - Variante {favorite.variant}
      </div>

      {variant && (
        <div className="mt-2 flex flex-wrap items-center gap-2 text-xs">
          <span className="rounded bg-violet-500/15 px-2 py-1 text-violet-200">
            {formatRarityLabel(variant.rarity)}
          </span>

          <span className="rounded bg-white/10 px-2 py-1 text-gray-200">
            {formatPrice(variant.price)}
          </span>

          <span className={`rounded px-2 py-1 ${outOfStock ? "bg-red-500/15 text-red-200" : "bg-emerald-500/15 text-emerald-200"}`}>
            {outOfStock ? "Rupture" : `${variant.stock} en stock`}
          </span>
        </div>
      )}

      <div className="mt-2 text-xs text-gray-500">
        Ajouté le {formatDate(favorite.createdAt)}
      </div>
    </Link>
  );
}
