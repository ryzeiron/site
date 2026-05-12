import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";
import { desc } from "drizzle-orm";
import LogoutButton from "@/components/LogoutButton";
import { isAdmin } from "@/lib/admin/auth";
import { getCard, getSerie, resolveVariant, type Card } from "@/lib/catalog";
import { getDb } from "@/lib/db/client";
import { favoriteCards, users } from "@/lib/db/schema";
import { formatPrice } from "@/lib/format";
import { applyStockOverrides } from "@/lib/stock";

export const dynamic = "force-dynamic";

type Search = { q?: string };
type FavoriteRow = typeof favoriteCards.$inferSelect;
type UserRow = typeof users.$inferSelect;

type FavoriteClient = {
  id: string;
  name: string | null;
  email: string;
  createdAt: Date | string;
};

type FavoriteGroup = {
  key: string;
  cardId: string;
  variant: string;
  card: Card | null;
  count: number;
  clients: FavoriteClient[];
  latestDate: Date | string;
};

function normalize(value: string) {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

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

function variantLabel(value: string) {
  if (value === "base") return "Base";
  if (value === "alt") return "Alt";
  return value;
}

function buildFavoriteGroups({
  favoriteRows,
  userRows,
  cardMap,
}: {
  favoriteRows: FavoriteRow[];
  userRows: UserRow[];
  cardMap: Map<string, Card>;
}) {
  const usersById = new Map(userRows.map((user) => [user.id, user]));
  const groups = new Map<string, FavoriteGroup>();

  for (const favorite of favoriteRows) {
    const key = `${favorite.cardId}::${favorite.variant}`;
    const user = usersById.get(favorite.userId);
    const card = cardMap.get(favorite.cardId) ?? null;
    const current = groups.get(key);

    const client: FavoriteClient = {
      id: favorite.userId,
      name: user?.name ?? null,
      email: user?.email ?? "Client introuvable",
      createdAt: favorite.createdAt,
    };

    if (current) {
      current.count += 1;
      current.clients.push(client);
      if (new Date(favorite.createdAt) > new Date(current.latestDate)) {
        current.latestDate = favorite.createdAt;
      }
      continue;
    }

    groups.set(key, {
      key,
      cardId: favorite.cardId,
      variant: favorite.variant,
      card,
      count: 1,
      clients: [client],
      latestDate: favorite.createdAt,
    });
  }

  return Array.from(groups.values()).sort((a, b) => {
    if (b.count !== a.count) return b.count - a.count;
    return new Date(b.latestDate).getTime() - new Date(a.latestDate).getTime();
  });
}

function groupFavoritesBySerie(groups: FavoriteGroup[]) {
  const bySerie = new Map<string, FavoriteGroup[]>();

  for (const group of groups) {
    const serieId = group.card?.serieId ?? "serie-inconnue";
    const serieGroups = bySerie.get(serieId) ?? [];
    serieGroups.push(group);
    bySerie.set(serieId, serieGroups);
  }

  return Array.from(bySerie.entries()).sort((a, b) => {
    const serieA = getSerie(a[0]);
    const serieB = getSerie(b[0]);
    return (serieA?.code ?? a[0]).localeCompare(serieB?.code ?? b[0]);
  });
}

export default async function AdminFavoritesPage({
  searchParams,
}: {
  searchParams: Promise<Search>;
}) {
  if (!(await isAdmin())) redirect("/admin/login");

  const params = await searchParams;
  const query = (params.q ?? "").trim();

  const db = getDb();

  const [favoriteRows, userRows] = await Promise.all([
    db.select().from(favoriteCards).orderBy(desc(favoriteCards.createdAt)),
    db.select().from(users),
  ]);

  const favoriteCardIds = Array.from(
    new Set(favoriteRows.map((favorite) => favorite.cardId)),
  );

  const rawCards = favoriteCardIds
    .map((cardId) => getCard(cardId))
    .filter((card): card is Card => !!card);

  const liveCards = await applyStockOverrides(rawCards);
  const cardMap = new Map(liveCards.map((card) => [card.id, card]));
  const groups = buildFavoriteGroups({ favoriteRows, userRows, cardMap });

  const filteredGroups = query
    ? groups.filter((group) => {
        const variant = group.card
          ? resolveVariant(group.card, group.variant)
          : null;
        const serie = group.card ? getSerie(group.card.serieId) : null;

        const text = normalize(
          [
            group.card?.name ?? group.cardId,
            group.card?.number ?? "",
            serie?.code ?? "",
            serie?.name ?? "",
            variant?.rarity ?? "",
            group.variant,
            ...group.clients.map(
              (client) => `${client.name ?? ""} ${client.email}`,
            ),
          ].join(" "),
        );

        return text.includes(normalize(query));
      })
    : groups;

  const interestedClients = new Set(
    favoriteRows.map((favorite) => favorite.userId),
  ).size;

  const serieGroups = groupFavoritesBySerie(filteredGroups);

  return (
    <div className="py-6">
      <div className="mb-6 flex items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-white">Admin - Favoris</h1>
          <p className="mt-1 text-sm text-gray-400">
            Regroupe toutes les cartes mises en favori par les clients.
          </p>
        </div>

        <LogoutButton />
      </div>

      <div className="mb-6 flex flex-wrap gap-3">
        <Link
          href="/admin"
          className="rounded bg-white/10 px-4 py-2 text-sm text-white hover:bg-white/20"
        >
          Retour stocks
        </Link>

        <Link
          href="/admin/commandes"
          className="rounded bg-white/10 px-4 py-2 text-sm text-white hover:bg-white/20"
        >
          Commandes
        </Link>

        <Link
          href="/admin/clients"
          className="rounded bg-white/10 px-4 py-2 text-sm text-white hover:bg-white/20"
        >
          Clients
        </Link>

        <Link
          href="/admin/avis"
          className="rounded bg-white/10 px-4 py-2 text-sm text-white hover:bg-white/20"
        >
          Avis
        </Link>
      </div>

      <div className="mb-6 grid gap-3 sm:grid-cols-3">
        <div className="rounded-lg border border-white/10 bg-zinc-900/70 p-4">
          <div className="text-sm text-gray-400">Cartes favorites</div>
          <div className="mt-1 text-2xl font-bold text-white">
            {groups.length}
          </div>
        </div>

        <div className="rounded-lg border border-white/10 bg-zinc-900/70 p-4">
          <div className="text-sm text-gray-400">Favoris enregistrés</div>
          <div className="mt-1 text-2xl font-bold text-white">
            {favoriteRows.length}
          </div>
        </div>

        <div className="rounded-lg border border-white/10 bg-zinc-900/70 p-4">
          <div className="text-sm text-gray-400">Clients intéressés</div>
          <div className="mt-1 text-2xl font-bold text-white">
            {interestedClients}
          </div>
        </div>
      </div>

      <form action="/admin/favoris" className="mb-6 flex flex-wrap gap-3">
        <input
          type="search"
          name="q"
          defaultValue={query}
          placeholder="Rechercher une série, une carte ou un client"
          className="min-w-[260px] flex-1 rounded border border-white/10 bg-zinc-900 px-3 py-2 text-sm text-white outline-none placeholder:text-gray-500 focus:border-violet-400/70"
        />

        <button
          type="submit"
          className="rounded bg-brand-500 px-4 py-2 text-sm font-medium text-white hover:bg-brand-600"
        >
          Rechercher
        </button>

        {query && (
          <Link
            href="/admin/favoris"
            className="rounded bg-white/10 px-4 py-2 text-sm text-white hover:bg-white/20"
          >
            Effacer
          </Link>
        )}
      </form>

      {filteredGroups.length === 0 ? (
        <p className="text-gray-400">Aucun favori trouvé.</p>
      ) : (
        <div className="space-y-5">
          {serieGroups.map(([serieId, groupsInSerie]) => {
            const serie = getSerie(serieId);
            const favoriteCount = groupsInSerie.reduce(
              (total, group) => total + group.count,
              0,
            );

            return (
              <section
                key={serieId}
                className="overflow-hidden rounded-lg border border-white/10 bg-zinc-950/30"
              >
                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 bg-white/[0.03] px-4 py-3">
                  <div>
                    <div className="text-xs font-semibold uppercase tracking-[0.18em] text-violet-300">
                      {serie?.code ?? "Série inconnue"}
                    </div>
                    <h2 className="text-xl font-bold text-white">
                      {serie?.name ?? "Cartes introuvables"}
                    </h2>
                  </div>

                  <div className="rounded-full bg-violet-500/20 px-3 py-1 text-sm font-bold text-violet-100">
                    {groupsInSerie.length} carte
                    {groupsInSerie.length > 1 ? "s" : ""} - {favoriteCount}{" "}
                    favori{favoriteCount > 1 ? "s" : ""}
                  </div>
                </div>

                <div className="space-y-3 p-3 sm:p-4">
                  {groupsInSerie.map((group) => (
                    <FavoriteGroupCard key={group.key} group={group} />
                  ))}
                </div>
              </section>
            );
          })}
        </div>
      )}
    </div>
  );
}

function FavoriteGroupCard({ group }: { group: FavoriteGroup }) {
  const card = group.card;
  const variant = card ? resolveVariant(card, group.variant) : null;
  const outOfStock = !variant || variant.stock <= 0;

  return (
    <article className="rounded-lg border border-white/10 bg-zinc-900/70 p-4 text-gray-200">
      <div className="flex gap-4">
        <div className="relative h-24 w-16 shrink-0 overflow-hidden rounded border border-white/10 bg-zinc-950 sm:h-32 sm:w-24">
          {card?.image ? (
            <Image
              src={card.image}
              alt={card.name}
              fill
              sizes="96px"
              className="object-contain p-1"
            />
          ) : (
            <div className="flex h-full items-center justify-center px-2 text-center text-xs text-gray-500">
              Pas d'image
            </div>
          )}
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0">
              <h3 className="truncate text-xl font-bold text-white">
                {card?.name ?? group.cardId}
              </h3>

              <div className="mt-1 text-sm text-gray-400">
                {card?.number ?? "-"} - Variante {variantLabel(group.variant)}
              </div>
            </div>

            <div className="rounded-full bg-violet-500/20 px-3 py-1 text-sm font-bold text-violet-100">
              {group.count} client{group.count > 1 ? "s" : ""}
            </div>
          </div>

          <div className="mt-3 flex flex-wrap gap-2 text-xs">
            {variant && (
              <>
                <span className="rounded bg-violet-500/15 px-2 py-1 text-violet-200">
                  {variant.rarity}
                </span>

                <span className="rounded bg-white/10 px-2 py-1 text-gray-200">
                  {formatPrice(variant.price)}
                </span>
              </>
            )}

            <span
              className={`rounded px-2 py-1 ${
                outOfStock
                  ? "bg-red-500/15 text-red-200"
                  : "bg-emerald-500/15 text-emerald-200"
              }`}
            >
              {variant ? `${variant.stock} en stock` : "Carte introuvable"}
            </span>

            <span className="rounded bg-white/10 px-2 py-1 text-gray-300">
              Dernier ajout : {formatDate(group.latestDate)}
            </span>
          </div>

          <div className="mt-4 flex flex-wrap gap-2">
            {card && (
              <>
                <Link
                  href={`/admin?serie=${encodeURIComponent(
                    card.serieId,
                  )}&q=${encodeURIComponent(card.number)}`}
                  className="rounded bg-brand-500 px-3 py-2 text-xs font-medium text-white hover:bg-brand-600"
                >
                  Modifier le stock
                </Link>

                <Link
                  href={`/carte/${card.id}`}
                  className="rounded bg-white/10 px-3 py-2 text-xs font-medium text-white hover:bg-white/20"
                >
                  Voir la fiche
                </Link>
              </>
            )}
          </div>

          <details className="group mt-4 rounded border border-white/10 bg-black/20">
            <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-3 py-2 text-sm text-gray-200 transition hover:bg-white/5">
              <span>Voir les clients intéressés</span>
              <span className="text-lg text-violet-300 transition group-open:rotate-180">
                ↓
              </span>
            </summary>

            <div className="space-y-2 border-t border-white/10 p-3">
              {group.clients.map((client) => (
                <div
                  key={`${group.key}-${client.id}`}
                  className="rounded bg-zinc-950/50 px-3 py-2 text-sm"
                >
                  <div className="font-medium text-white">
                    {client.name || "Client sans nom"}
                  </div>
                  <div className="text-xs text-gray-400">{client.email}</div>
                  <div className="mt-1 text-xs text-gray-500">
                    Ajouté le {formatDate(client.createdAt)}
                  </div>
                </div>
              ))}
            </div>
          </details>
        </div>
      </div>
    </article>
  );
}
