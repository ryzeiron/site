import Link from "next/link";
import { redirect } from "next/navigation";
import { Children, type ReactNode } from "react";
import { and, desc, ne } from "drizzle-orm";
import AdminCatalogTabs from "@/components/AdminCatalogTabs";
import LogoutButton from "@/components/LogoutButton";
import { isAdmin } from "@/lib/admin/auth";
import { CARDS, resolveVariant, type Card } from "@/lib/catalog";
import { getDb } from "@/lib/db/client";
import { favoriteCards, favoriteSleeves, orders } from "@/lib/db/schema";
import { formatRarityLabel } from "@/lib/display-variants";
import { getSleeves, type SleeveProduct } from "@/lib/sleeves";
import { applyStockOverrides } from "@/lib/stock";

export const dynamic = "force-dynamic";

type OrderRow = typeof orders.$inferSelect;
type FavoriteCardRow = typeof favoriteCards.$inferSelect;
type FavoriteSleeveRow = typeof favoriteSleeves.$inferSelect;

const DASHBOARD_ORDER_LIMIT = 6;
const DASHBOARD_FAVORITE_LIMIT = 80;

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
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function statusClass(status: string) {
  if (status === "paid") return "border-sky-400/35 bg-sky-500/15 text-sky-200";
  if (status === "label_to_create") {
    return "border-amber-400/35 bg-amber-500/15 text-amber-200";
  }
  if (status === "label_created") {
    return "border-violet-400/35 bg-violet-500/15 text-violet-200";
  }
  if (status === "shipped") {
    return "border-blue-400/35 bg-blue-500/15 text-blue-200";
  }
  if (status === "ready_for_pickup") {
    return "border-emerald-400/35 bg-emerald-500/15 text-emerald-200";
  }
  if (status === "picked_up") {
    return "border-fuchsia-400/35 bg-fuchsia-500/15 text-fuchsia-200";
  }
  return "border-white/15 bg-white/10 text-gray-200";
}

function variantLabel(value: string) {
  if (value === "base") return "Base";
  if (value === "alt") return "Alt";
  return value;
}

function groupFavoriteCards(rows: FavoriteCardRow[], cardById: Map<string, Card>) {
  const groups = new Map<
    string,
    {
      key: string;
      cardId: string;
      variant: string;
      card: Card | null;
      count: number;
      latestDate: Date | string;
    }
  >();

  for (const favorite of rows) {
    const key = `${favorite.cardId}::${favorite.variant}`;
    const current = groups.get(key);

    if (current) {
      current.count += 1;
      if (new Date(favorite.createdAt) > new Date(current.latestDate)) {
        current.latestDate = favorite.createdAt;
      }
      continue;
    }

    groups.set(key, {
      key,
      cardId: favorite.cardId,
      variant: favorite.variant,
      card: cardById.get(favorite.cardId) ?? null,
      count: 1,
      latestDate: favorite.createdAt,
    });
  }

  return Array.from(groups.values()).sort((a, b) => {
    if (b.count !== a.count) return b.count - a.count;
    return new Date(b.latestDate).getTime() - new Date(a.latestDate).getTime();
  });
}

function groupFavoriteSleeves(
  rows: FavoriteSleeveRow[],
  sleeveById: Map<string, SleeveProduct>,
) {
  const groups = new Map<
    string,
    {
      key: string;
      sleeveId: string;
      sleeve: SleeveProduct | null;
      count: number;
      latestDate: Date | string;
    }
  >();

  for (const favorite of rows) {
    const current = groups.get(favorite.sleeveId);

    if (current) {
      current.count += 1;
      if (new Date(favorite.createdAt) > new Date(current.latestDate)) {
        current.latestDate = favorite.createdAt;
      }
      continue;
    }

    groups.set(favorite.sleeveId, {
      key: favorite.sleeveId,
      sleeveId: favorite.sleeveId,
      sleeve: sleeveById.get(favorite.sleeveId) ?? null,
      count: 1,
      latestDate: favorite.createdAt,
    });
  }

  return Array.from(groups.values()).sort((a, b) => {
    if (b.count !== a.count) return b.count - a.count;
    return new Date(b.latestDate).getTime() - new Date(a.latestDate).getTime();
  });
}

export default async function AdminDashboardPage() {
  if (!(await isAdmin())) redirect("/admin/login");

  const db = getDb();
  const [recentOrders, openOrders, favoriteCardRows, favoriteSleeveRows, sleeveRows] =
    await Promise.all([
      db
        .select()
        .from(orders)
        .orderBy(desc(orders.createdAt))
        .limit(DASHBOARD_ORDER_LIMIT),
      db
        .select()
        .from(orders)
        .where(
          and(
            ne(orders.status, "shipped"),
            ne(orders.status, "ready_for_pickup"),
            ne(orders.status, "picked_up"),
          ),
        )
        .orderBy(desc(orders.createdAt))
        .limit(DASHBOARD_ORDER_LIMIT),
      db
        .select()
        .from(favoriteCards)
        .orderBy(desc(favoriteCards.createdAt))
        .limit(DASHBOARD_FAVORITE_LIMIT),
      db
        .select()
        .from(favoriteSleeves)
        .orderBy(desc(favoriteSleeves.createdAt))
        .limit(DASHBOARD_FAVORITE_LIMIT),
      getSleeves(),
    ]);

  const favoriteCardIds = Array.from(
    new Set(favoriteCardRows.map((favorite) => favorite.cardId)),
  );
  const favoriteCatalogCards = favoriteCardIds
    .map((cardId) => CARDS.find((card) => card.id === cardId))
    .filter((card): card is Card => Boolean(card));
  const cardsWithStock = await applyStockOverrides(favoriteCatalogCards);
  const cardById = new Map(cardsWithStock.map((card) => [card.id, card]));
  const sleeveById = new Map(sleeveRows.map((sleeve) => [sleeve.id, sleeve]));
  const favoriteCardGroups = groupFavoriteCards(favoriteCardRows, cardById);
  const favoriteSleeveGroups = groupFavoriteSleeves(favoriteSleeveRows, sleeveById);
  const favoriteCardsOut = favoriteCardGroups.filter((group) => {
    if (!group.card) return true;
    return resolveVariant(group.card, group.variant).stock <= 0;
  });
  const favoriteSleevesOut = favoriteSleeveGroups.filter(
    (group) => !group.sleeve || group.sleeve.stock <= 0,
  );
  const favoriteCount = favoriteCardRows.length + favoriteSleeveRows.length;

  return (
    <div className="py-6">
      <div className="mb-6 flex items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-white">Accueil admin</h1>
          <p className="mt-1 text-sm text-gray-400">
            Vue rapide sur les commandes, les favoris en rupture et les raccourcis utiles.
          </p>
        </div>

        <LogoutButton />
      </div>

      <AdminCatalogTabs
        active="dashboard"
        cardsCount={CARDS.length}
        sleevesCount={sleeveRows.length}
      />

      <div className="mb-6 flex flex-wrap gap-3">
        <AdminLink href="/admin/commandes">Commandes</AdminLink>
        <AdminLink href="/admin/analyse">Analyse</AdminLink>
        <AdminLink href="/admin/paniers">Paniers</AdminLink>
        <AdminLink href="/admin/favoris">Favoris</AdminLink>
        <AdminLink href="/admin/clients">Clients</AdminLink>
        <AdminLink href="/admin/avis">Avis</AdminLink>
        <AdminLink href="/admin/tickets">Tickets</AdminLink>
      </div>

      <section className="mb-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Commandes à traiter" value={openOrders.length} tone="sky" />
        <StatCard
          label="Favoris en rupture"
          value={favoriteCardsOut.length + favoriteSleevesOut.length}
          tone="rose"
        />
        <StatCard label="Commandes récentes" value={recentOrders.length} tone="amber" />
        <StatCard label="Favoris récents" value={favoriteCount} tone="violet" />
      </section>

      <div className="grid gap-6 xl:grid-cols-2">
        <DashboardPanel
          title="Commandes à traiter"
          href="/admin/commandes"
          empty="Aucune commande à traiter."
        >
          {openOrders.map((order) => (
            <OrderLine key={order.id} order={order} />
          ))}
        </DashboardPanel>

        <DashboardPanel
          title="Favoris en rupture"
          href="/admin/favoris"
          empty="Aucun favori en rupture."
        >
          {favoriteCardsOut.slice(0, 5).map((group) => {
            const variant = group.card
              ? resolveVariant(group.card, group.variant)
              : null;

            return (
              <div key={group.key} className="rounded-xl bg-white/[0.03] p-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="truncate font-semibold text-white">
                      {group.card?.name ?? "Carte inconnue"}
                    </div>
                    <div className="mt-1 text-xs text-gray-400">
                      {group.card?.number ?? group.cardId} -{" "}
                      {variant
                        ? formatRarityLabel(variant.rarity)
                        : variantLabel(group.variant)}
                    </div>
                  </div>
                  <Badge>{group.count} favori{group.count > 1 ? "s" : ""}</Badge>
                </div>
              </div>
            );
          })}

          {favoriteSleevesOut.slice(0, 5).map((group) => (
            <div key={group.key} className="rounded-xl bg-white/[0.03] p-3">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="truncate font-semibold text-white">
                    {group.sleeve?.name ?? "Sleeve inconnue"}
                  </div>
                  <div className="mt-1 text-xs text-gray-400">Sleeve</div>
                </div>
                <Badge>{group.count} favori{group.count > 1 ? "s" : ""}</Badge>
              </div>
            </div>
          ))}
        </DashboardPanel>

        <DashboardPanel
          title="Dernières commandes"
          href="/admin/commandes"
          empty="Aucune commande pour le moment."
        >
          {recentOrders.map((order) => (
            <OrderLine key={order.id} order={order} />
          ))}
        </DashboardPanel>

        <QuickActionsPanel />
      </div>
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

function StatCard({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone: "sky" | "rose" | "amber" | "violet";
}) {
  const tones = {
    sky: "border-sky-400/20 bg-sky-500/10 text-sky-200",
    rose: "border-rose-400/20 bg-rose-500/10 text-rose-200",
    amber: "border-amber-400/20 bg-amber-500/10 text-amber-200",
    violet: "border-violet-400/20 bg-violet-500/10 text-violet-200",
  };

  return (
    <div className={`rounded-xl border p-4 ${tones[tone]}`}>
      <div className="text-sm">{label}</div>
      <div className="mt-2 text-3xl font-bold text-white">{value}</div>
    </div>
  );
}

function DashboardPanel({
  title,
  href,
  empty,
  children,
}: {
  title: string;
  href: string;
  empty: string;
  children: ReactNode;
}) {
  const hasChildren = Children.toArray(children).length > 0;

  return (
    <section className="rounded-2xl border border-white/10 bg-zinc-950/70 p-5">
      <div className="mb-4 flex items-center justify-between gap-3">
        <h2 className="text-lg font-bold text-white">{title}</h2>
        <Link
          href={href}
          className="rounded-full bg-white/10 px-3 py-1.5 text-xs font-semibold text-white hover:bg-white/20"
        >
          Voir
        </Link>
      </div>

      <div className="space-y-2">
        {hasChildren ? children : <p className="text-sm text-gray-400">{empty}</p>}
      </div>
    </section>
  );
}

function QuickActionsPanel() {
  const actions = [
    {
      href: "/admin",
      title: "Modifier les cartes",
      detail: "Stocks, prix, raretés et variantes",
    },
    {
      href: "/admin/sleeves",
      title: "Gérer les sleeves",
      detail: "Prix, stock, visibilité et ajouts",
    },
    {
      href: "/admin/favoris",
      title: "Voir la demande",
      detail: "Cartes et sleeves ajoutées aux favoris",
    },
    {
      href: "/admin/tickets",
      title: "Messages clients",
      detail: "Demandes envoyées depuis le site",
    },
    {
      href: "/admin/modifications",
      title: "Historique",
      detail: "Dernières modifications admin",
    },
    {
      href: "/",
      title: "Voir le site",
      detail: "Retour côté client",
    },
  ];

  return (
    <section className="rounded-2xl border border-white/10 bg-zinc-950/70 p-5">
      <div className="mb-4">
        <h2 className="text-lg font-bold text-white">Actions rapides</h2>
        <p className="mt-1 text-sm text-gray-400">
          Les accès les plus utiles pour gérer le site.
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        {actions.map((action) => (
          <Link
            key={action.href}
            href={action.href}
            className="rounded-xl border border-white/10 bg-white/[0.03] p-3 transition hover:border-violet-300/50 hover:bg-violet-500/10"
          >
            <div className="font-semibold text-white">{action.title}</div>
            <div className="mt-1 text-xs text-gray-400">{action.detail}</div>
          </Link>
        ))}
      </div>
    </section>
  );
}

function OrderLine({ order }: { order: OrderRow }) {
  return (
    <div className="rounded-xl bg-white/[0.03] p-3">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="truncate font-semibold text-white">
            {order.customerName ?? "Client"}
          </div>
          <div className="mt-1 truncate text-xs text-gray-400">
            {order.customerEmail ?? "Email non renseigné"}
          </div>
        </div>
        <span
          className={`shrink-0 rounded-full border px-2.5 py-1 text-[11px] font-semibold ${statusClass(
            order.status,
          )}`}
        >
          {STATUS_LABELS[order.status] ?? order.status}
        </span>
      </div>
      <div className="mt-2 text-xs text-gray-500">{formatDate(order.createdAt)}</div>
    </div>
  );
}

function Badge({ children }: { children: ReactNode }) {
  return (
    <span className="shrink-0 rounded-full bg-violet-500/15 px-2.5 py-1 text-xs font-semibold text-violet-100">
      {children}
    </span>
  );
}
