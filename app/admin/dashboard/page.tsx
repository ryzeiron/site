import Link from "next/link";
import { redirect } from "next/navigation";
import { Children, type ReactNode } from "react";
import { desc } from "drizzle-orm";
import AdminCatalogTabs from "@/components/AdminCatalogTabs";
import LogoutButton from "@/components/LogoutButton";
import { isAdmin } from "@/lib/admin/auth";
import { CARDS, getCard, getSerie, listVariants, resolveVariant, type Card } from "@/lib/catalog";
import { getDb } from "@/lib/db/client";
import { favoriteCards, favoriteSleeves, orders } from "@/lib/db/schema";
import { formatRarityLabel } from "@/lib/display-variants";
import { formatPrice } from "@/lib/format";
import { getSleeves, type SleeveProduct } from "@/lib/sleeves";
import { applyStockOverrides } from "@/lib/stock";

export const dynamic = "force-dynamic";

type OrderRow = typeof orders.$inferSelect;
type FavoriteCardRow = typeof favoriteCards.$inferSelect;
type FavoriteSleeveRow = typeof favoriteSleeves.$inferSelect;

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

function getLowCardVariants(cards: Card[]) {
  return cards
    .flatMap((card) =>
      listVariants(card).map(({ key, variant }) => ({
        key,
        card,
        variant,
        serie: getSerie(card.serieId),
      })),
    )
    .filter(({ variant }) => variant.stock > 0 && variant.stock <= 2)
    .sort((a, b) => a.variant.stock - b.variant.stock || a.card.name.localeCompare(b.card.name, "fr"));
}

export default async function AdminDashboardPage() {
  if (!(await isAdmin())) redirect("/admin/login");

  const db = getDb();
  const [orderRows, favoriteCardRows, favoriteSleeveRows, cardsWithStock, sleeveRows] =
    await Promise.all([
      db.select().from(orders).orderBy(desc(orders.createdAt)),
      db.select().from(favoriteCards).orderBy(desc(favoriteCards.createdAt)),
      db.select().from(favoriteSleeves).orderBy(desc(favoriteSleeves.createdAt)),
      applyStockOverrides(CARDS),
      getSleeves(),
    ]);

  const openOrders = orderRows.filter((order) => order.status !== "shipped");
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
  const lowCardVariants = getLowCardVariants(cardsWithStock);
  const lowSleeves = sleeveRows
    .filter((sleeve) => sleeve.active && sleeve.stock > 0 && sleeve.stock <= 3)
    .sort((a, b) => a.stock - b.stock || a.name.localeCompare(b.name, "fr"));

  return (
    <div className="py-6">
      <div className="mb-6 flex items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-white">Accueil admin</h1>
          <p className="mt-1 text-sm text-gray-400">
            Vue rapide sur les commandes, les favoris en rupture et les stocks à surveiller.
          </p>
        </div>

        <LogoutButton />
      </div>

      <AdminCatalogTabs
        active="dashboard"
        cardsCount={cardsWithStock.length}
        sleevesCount={sleeveRows.length}
      />

      <div className="mb-6 flex flex-wrap gap-3">
        <AdminLink href="/admin/commandes">Commandes</AdminLink>
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
        <StatCard label="Cartes stock faible" value={lowCardVariants.length} tone="amber" />
        <StatCard label="Sleeves stock faible" value={lowSleeves.length} tone="violet" />
      </section>

      <div className="grid gap-6 xl:grid-cols-2">
        <DashboardPanel
          title="Commandes à traiter"
          href="/admin/commandes"
          empty="Aucune commande à traiter."
        >
          {openOrders.slice(0, 6).map((order) => (
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
          title="Cartes en stock faible"
          href="/admin?quick=low"
          empty="Aucune carte en stock faible."
        >
          {lowCardVariants.slice(0, 8).map(({ card, key, variant, serie }) => (
            <div key={`${card.id}-${key}`} className="rounded-xl bg-white/[0.03] p-3">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="truncate font-semibold text-white">{card.name}</div>
                  <div className="mt-1 text-xs text-gray-400">
                    {serie?.code ?? card.serieId} - {formatRarityLabel(variant.rarity)}
                  </div>
                </div>
                <Badge>{variant.stock} restant{variant.stock > 1 ? "s" : ""}</Badge>
              </div>
            </div>
          ))}
        </DashboardPanel>

        <DashboardPanel
          title="Sleeves en stock faible"
          href="/admin/sleeves"
          empty="Aucune sleeve en stock faible."
        >
          {lowSleeves.slice(0, 8).map((sleeve) => (
            <div key={sleeve.id} className="rounded-xl bg-white/[0.03] p-3">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="truncate font-semibold text-white">{sleeve.name}</div>
                  <div className="mt-1 text-xs text-gray-400">
                    {formatPrice(sleeve.priceCents / 100)}
                  </div>
                </div>
                <Badge>{sleeve.stock} restant{sleeve.stock > 1 ? "s" : ""}</Badge>
              </div>
            </div>
          ))}
        </DashboardPanel>
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
