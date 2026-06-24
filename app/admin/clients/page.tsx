import Link from "next/link";
import { redirect } from "next/navigation";
import type { ReactNode } from "react";
import { desc, eq, inArray, or } from "drizzle-orm";
import LogoutButton from "@/components/LogoutButton";
import { isAdmin } from "@/lib/admin/auth";
import { getCard, resolveVariant } from "@/lib/catalog";
import { getDb } from "@/lib/db/client";
import {
  favoriteCards,
  orders,
  userDeliveryProfiles,
  users,
} from "@/lib/db/schema";
import { formatRarityLabel } from "@/lib/display-variants";
import { formatPrice } from "@/lib/format";
import { applyStockOverrides } from "@/lib/stock";

export const dynamic = "force-dynamic";

type Search = {
  client?: string;
  page?: string;
};

type OrderRow = typeof orders.$inferSelect;
type FavoriteRow = typeof favoriteCards.$inferSelect;
type ClientRow = typeof users.$inferSelect;
type DeliveryProfileRow = typeof userDeliveryProfiles.$inferSelect;
type CardMap = Map<string, NonNullable<ReturnType<typeof getCard>>>;

const PAGE_SIZE = 25;

const STATUS_LABELS: Record<string, string> = {
  paid: "Commande payée",
  label_to_create: "À préparer",
  label_created: "Prête à déposer",
  shipped: "Colis expédié",
  ready_for_pickup: "Colis à retirer",
  picked_up: "Colis retiré",
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

function parsePage(value?: string) {
  const page = Number.parseInt(value ?? "1", 10);
  return Number.isFinite(page) && page > 0 ? page : 1;
}

function clientsHref({
  clientId,
  page,
}: {
  clientId?: string | null;
  page?: number;
}) {
  const params = new URLSearchParams();
  if (clientId) params.set("client", clientId);
  if (page && page > 1) params.set("page", String(page));
  const search = params.toString();
  return search ? `/admin/clients?${search}` : "/admin/clients";
}

function profileFullName(profile?: DeliveryProfileRow | null) {
  return [profile?.firstName, profile?.lastName].filter(Boolean).join(" ").trim();
}

function clientDisplayName(client: ClientRow, profile?: DeliveryProfileRow | null) {
  return profileFullName(profile) || client.name || "Client sans nom";
}

export default async function AdminClientsPage({
  searchParams,
}: {
  searchParams: Promise<Search>;
}) {
  if (!(await isAdmin())) redirect("/admin/login");

  const params = await searchParams;
  const currentPage = parsePage(params.page);
  const offset = (currentPage - 1) * PAGE_SIZE;
  const selectedClientId = params.client ?? "";
  const db = getDb();

  const clientRowsPlusOne = await db
    .select()
    .from(users)
    .orderBy(desc(users.createdAt))
    .limit(PAGE_SIZE + 1)
    .offset(offset);
  const clientRows = clientRowsPlusOne.slice(0, PAGE_SIZE);
  const clientProfileRows =
    clientRows.length > 0
      ? await db
          .select()
          .from(userDeliveryProfiles)
          .where(
            inArray(
              userDeliveryProfiles.userId,
              clientRows.map((client) => client.id),
            ),
          )
      : [];
  const profileByUserId = new Map(
    clientProfileRows.map((profile) => [profile.userId, profile]),
  );
  const hasNextPage = clientRowsPlusOne.length > PAGE_SIZE;
  const hasPreviousPage = currentPage > 1;
  const selectedClient = selectedClientId
    ? (await db.select().from(users).where(eq(users.id, selectedClientId)).limit(1))[0] ??
      null
    : null;
  const selectedProfile = selectedClient
    ? profileByUserId.get(selectedClient.id) ??
      (await db
        .select()
        .from(userDeliveryProfiles)
        .where(eq(userDeliveryProfiles.userId, selectedClient.id))
        .limit(1))[0] ??
      null
    : null;

  const [clientOrders, clientFavorites] = selectedClient
    ? await Promise.all([
        db
          .select()
          .from(orders)
          .where(
            or(
              eq(orders.userId, selectedClient.id),
              eq(orders.customerEmail, selectedClient.email),
            ),
          )
          .orderBy(desc(orders.createdAt))
          .limit(50),
        db
          .select()
          .from(favoriteCards)
          .where(eq(favoriteCards.userId, selectedClient.id))
          .orderBy(desc(favoriteCards.createdAt))
          .limit(50),
      ])
    : [[], []];
  const rawFavoriteCards = Array.from(
    new Set(clientFavorites.map((favorite) => favorite.cardId)),
  )
    .map((cardId) => getCard(cardId))
    .filter((card): card is NonNullable<typeof card> => !!card);
  const liveFavoriteCards = await applyStockOverrides(rawFavoriteCards);
  const favoriteCardMap = new Map(liveFavoriteCards.map((card) => [card.id, card]));

  return (
    <div className="py-6">
      <div className="mb-6 flex items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-white">Admin - Clients</h1>
          <p className="mt-1 text-sm text-gray-400">
            Ouvre un client pour charger ses commandes et ses favoris.
          </p>
        </div>

        <LogoutButton />
      </div>

      <div className="mb-6 flex flex-wrap gap-3">
        <AdminLink href="/admin">Retour stocks</AdminLink>
        <AdminLink href="/admin/modifications">Modifications</AdminLink>
        <AdminLink href="/admin/commandes">Commandes</AdminLink>
        <AdminLink href="/admin/favoris">Favoris</AdminLink>
        <AdminLink href="/admin/avis">Avis</AdminLink>
      </div>

      <div className="mb-6 grid gap-3 sm:grid-cols-3">
        <StatCard label="Clients affichés" value={clientRows.length} />
        <StatCard label="Commandes du client" value={clientOrders.length} />
        <StatCard label="Favoris du client" value={clientFavorites.length} />
      </div>

      {clientRows.length === 0 ? (
        <p className="text-gray-400">Aucun compte client pour le moment.</p>
      ) : (
        <div className="grid gap-6 xl:grid-cols-[360px_1fr]">
          <section className="space-y-3">
            {clientRows.map((client) => {
              const profile = profileByUserId.get(client.id);

              return (
              <Link
                key={client.id}
                href={clientsHref({ clientId: client.id, page: currentPage })}
                className={`block rounded-lg border p-4 text-gray-200 transition ${
                  selectedClient?.id === client.id
                    ? "border-violet-300/60 bg-violet-500/15"
                    : "border-white/10 bg-zinc-900/70 hover:border-violet-300/40"
                }`}
              >
                <div className="font-bold text-white">
                  {clientDisplayName(client, profile)}
                </div>
                <div className="mt-1 truncate text-sm text-gray-300">{client.email}</div>
                {profile?.phone && (
                  <div className="mt-1 truncate text-xs text-gray-400">
                    {profile.phone}
                  </div>
                )}
                {(profile?.postcode || profile?.city) && (
                  <div className="mt-1 truncate text-xs text-gray-500">
                    {profile.postcode} {profile.city}
                  </div>
                )}
                <div className="mt-2 text-xs text-gray-500">
                  Créé le {formatDate(client.createdAt)}
                </div>
              </Link>
              );
            })}

            {(hasPreviousPage || hasNextPage) && (
              <div className="flex items-center justify-between gap-3 rounded-lg border border-white/10 bg-zinc-950/65 p-3 text-sm">
                <Link
                  href={clientsHref({ page: Math.max(1, currentPage - 1) })}
                  aria-disabled={!hasPreviousPage}
                  className={`rounded-full px-3 py-1.5 ${
                    hasPreviousPage
                      ? "bg-white/10 text-white hover:bg-white/20"
                      : "pointer-events-none bg-white/5 text-gray-600"
                  }`}
                >
                  Précédent
                </Link>
                <span className="text-gray-400">Page {currentPage}</span>
                <Link
                  href={clientsHref({ page: currentPage + 1 })}
                  aria-disabled={!hasNextPage}
                  className={`rounded-full px-3 py-1.5 ${
                    hasNextPage
                      ? "bg-white/10 text-white hover:bg-white/20"
                      : "pointer-events-none bg-white/5 text-gray-600"
                  }`}
                >
                  Suivant
                </Link>
              </div>
            )}
          </section>

          <section className="rounded-lg border border-white/10 bg-zinc-900/70 p-4 text-gray-200">
            {!selectedClient ? (
              <p className="text-sm text-gray-400">
                Clique sur un client pour afficher ses commandes et ses favoris.
              </p>
            ) : (
              <>
                <div className="mb-4 flex flex-wrap items-start justify-between gap-4">
                  <div>
                    <h2 className="text-xl font-bold text-white">
                      {clientDisplayName(selectedClient, selectedProfile)}
                    </h2>
                    <div className="mt-1 text-sm text-gray-300">{selectedClient.email}</div>
                    <div className="mt-1 font-mono text-xs text-gray-500">
                      ID : {selectedClient.id}
                    </div>
                  </div>
                  <div className="text-right text-xs text-gray-400">
                    <div>Compte créé le</div>
                    <div className="text-gray-200">{formatDate(selectedClient.createdAt)}</div>
                  </div>
                </div>

                <AdminClientProfileCard profile={selectedProfile} />

                <div className="mt-4 grid gap-4 lg:grid-cols-2">
                  <div className="rounded-lg border border-white/10 bg-black/20 p-3">
                    <h3 className="mb-3 font-semibold text-white">
                      Commandes ({clientOrders.length})
                    </h3>
                    {clientOrders.length === 0 ? (
                      <p className="text-sm text-gray-400">
                        Aucune commande liée à ce compte.
                      </p>
                    ) : (
                      <div className="space-y-3">
                        {clientOrders.map((order) => (
                          <AdminOrderMiniCard key={order.id} order={order} />
                        ))}
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
                        {clientFavorites.map((favorite) => (
                          <AdminFavoriteMiniCard
                            key={`${favorite.userId}-${favorite.cardId}-${favorite.variant}`}
                            favorite={favorite}
                            favoriteCardMap={favoriteCardMap}
                          />
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </>
            )}
          </section>
        </div>
      )}
    </div>
  );
}

function AdminLink({ href, children }: { href: string; children: ReactNode }) {
  return (
    <Link
      href={href}
      className="rounded bg-white/10 px-4 py-2 text-sm text-white hover:bg-white/20"
    >
      {children}
    </Link>
  );
}

function StatCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg border border-white/10 bg-zinc-900/70 p-4">
      <div className="text-sm text-gray-400">{label}</div>
      <div className="mt-1 text-2xl font-bold text-white">{value}</div>
    </div>
  );
}

function AdminClientProfileCard({
  profile,
}: {
  profile: DeliveryProfileRow | null;
}) {
  if (!profile) {
    return (
      <div className="rounded-lg border border-white/10 bg-black/20 p-3 text-sm text-gray-400">
        Aucune information de livraison enregistrée pour ce client.
      </div>
    );
  }

  const fullName = profileFullName(profile);

  return (
    <div className="rounded-lg border border-white/10 bg-black/20 p-3 text-sm">
      <h3 className="mb-3 font-semibold text-white">
        Informations actuelles du compte
      </h3>

      <div className="grid gap-2 text-gray-300 sm:grid-cols-2">
        <InfoLine label="Nom" value={fullName || "-"} />
        <InfoLine label="Téléphone" value={profile.phone || "-"} />
        <InfoLine
          label="Adresse"
          value={
            [profile.address, profile.postcode, profile.city]
              .filter(Boolean)
              .join(" ") || "-"
          }
        />
        <InfoLine label="Pays" value={profile.country || "-"} />
      </div>

      <div className="mt-3 rounded border border-white/10 bg-zinc-950/50 p-3">
        <div className="text-xs font-semibold uppercase tracking-[0.14em] text-violet-200">
          Point relais favori
        </div>
        {profile.relayCode ? (
          <div className="mt-2 grid gap-1 text-xs text-gray-300">
            <div className="font-semibold text-white">{profile.relayName}</div>
            <div>{profile.relayAddress}</div>
            <div>
              {profile.relayPostcode} {profile.relayCity}
            </div>
            <div className="text-gray-500">Code : {profile.relayCode}</div>
          </div>
        ) : (
          <div className="mt-2 text-xs text-gray-500">
            Aucun point relais favori enregistré.
          </div>
        )}
      </div>
    </div>
  );
}

function InfoLine({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <span className="text-gray-500">{label} :</span> {value}
    </div>
  );
}

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
