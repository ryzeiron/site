import Link from "next/link";
import { redirect } from "next/navigation";
import type { ReactNode } from "react";
import { desc, gt } from "drizzle-orm";
import AdminCatalogTabs from "@/components/AdminCatalogTabs";
import LogoutButton from "@/components/LogoutButton";
import { isAdmin } from "@/lib/admin/auth";
import { getDb } from "@/lib/db/client";
import {
  activeVisitors,
  cartSnapshots,
  orderAnalytics,
  orders,
} from "@/lib/db/schema";
import { formatCents } from "@/lib/format";

export const dynamic = "force-dynamic";

type OrderRow = {
  id: string;
  status: string;
  customerEmail: string | null;
  customerName: string | null;
  createdAt: Date | string;
};

type OrderAnalyticsRow = typeof orderAnalytics.$inferSelect;
type ActiveVisitorRow = typeof activeVisitors.$inferSelect;
type CartSnapshotRow = typeof cartSnapshots.$inferSelect;

type PeriodSummary = {
  orderCount: number;
  knownOrderCount: number;
  totalCents: number;
  subtotalCents: number;
  shippingCents: number;
  discountCents: number;
  unknownAmountCount: number;
};

type MonthSummary = PeriodSummary & {
  key: string;
  label: string;
};

type CustomerSummary = {
  key: string;
  name: string;
  email: string;
  orderCount: number;
  knownOrderCount: number;
  totalCents: number;
  lastOrderAt: Date | string;
};

const ONLINE_AFTER_MS = 2 * 60 * 1000;
const ACTIVE_CART_AFTER_MS = 30 * 60 * 1000;
const RECENT_CART_AFTER_MS = 3 * 60 * 60 * 1000;

const STATUS_LABELS: Record<string, string> = {
  paid: "Payées",
  label_to_create: "À préparer",
  label_created: "Prêtes à déposer",
  shipped: "Expédiées",
  ready_for_pickup: "Colis à retirer",
  picked_up: "Retirées",
};

const STATUS_TONES: Record<string, StatTone> = {
  paid: "sky",
  label_to_create: "amber",
  label_created: "violet",
  shipped: "blue",
  ready_for_pickup: "emerald",
  picked_up: "fuchsia",
};

export default async function AdminAnalyticsPage() {
  if (!(await isAdmin())) redirect("/admin/login");

  const db = getDb();
  const [orderRows, analyticsResult, visitorsResult, cartsResult] =
    await Promise.all([
      db
        .select({
          id: orders.id,
          status: orders.status,
          customerEmail: orders.customerEmail,
          customerName: orders.customerName,
          createdAt: orders.createdAt,
        })
        .from(orders)
        .orderBy(desc(orders.createdAt)),
      getOrderAnalyticsRows(),
      getActiveVisitorRows(),
      getCartRows(),
    ]);

  const analyticsByOrderId = new Map(
    analyticsResult.rows.map((row) => [row.orderId, row]),
  );
  const now = new Date();
  const summaries = buildMonthlySummaries(orderRows, analyticsByOrderId);
  const total = summarizePeriod(orderRows, analyticsByOrderId);
  const today = summarizePeriod(
    filterOrdersSince(orderRows, startOfDay(now)),
    analyticsByOrderId,
  );
  const last7Days = summarizePeriod(
    filterOrdersSince(orderRows, daysAgo(now, 7)),
    analyticsByOrderId,
  );
  const last30Days = summarizePeriod(
    filterOrdersSince(orderRows, daysAgo(now, 30)),
    analyticsByOrderId,
  );
  const currentMonthKey = getMonthKey(now);
  const previousMonthKey = getMonthKey(
    new Date(now.getFullYear(), now.getMonth() - 1, 1),
  );
  const currentMonth = summaries.find((month) => month.key === currentMonthKey);
  const previousMonth = summaries.find((month) => month.key === previousMonthKey);
  const monthGrowth = getGrowthPercent(
    previousMonth?.totalCents ?? 0,
    currentMonth?.totalCents ?? 0,
  );
  const bestMonth = summaries.reduce<MonthSummary | null>(
    (best, month) => (!best || month.totalCents > best.totalCents ? month : best),
    null,
  );
  const topCustomers = buildTopCustomers(orderRows, analyticsByOrderId);
  const statusStats = buildStatusStats(orderRows);
  const dailySummaries = buildDailySummaries(orderRows, analyticsByOrderId, 14);
  const cartStats = buildCartStats(cartsResult.rows);

  return (
    <div className="py-6">
      <div className="mb-6 flex items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-white">Admin - Analyse</h1>
          <p className="mt-1 text-sm text-gray-400">
            Tableau de bord complet des ventes, paniers, clients et visiteurs.
          </p>
        </div>

        <LogoutButton />
      </div>

      <AdminCatalogTabs active="analytics" />

      <div className="mb-6 flex flex-wrap gap-3">
        <AdminLink href="/admin/dashboard">Accueil admin</AdminLink>
        <AdminLink href="/admin/commandes">Commandes</AdminLink>
        <AdminLink href="/admin/paniers">Paniers</AdminLink>
        <AdminLink href="/admin/clients">Clients</AdminLink>
      </div>

      {!analyticsResult.tableReady ? (
        <Notice>
          La table d&apos;analyse n&apos;est pas encore créée dans Neon. Les montants
          détaillés resteront incomplets tant que le SQL n&apos;est pas ajouté.
        </Notice>
      ) : null}

      {!visitorsResult.tableReady ? (
        <Notice>
          La table des visiteurs en ligne n&apos;est pas encore créée dans Neon. Le
          compteur restera à 0 tant que le SQL n&apos;est pas ajouté.
        </Notice>
      ) : null}

      {!cartsResult.tableReady ? (
        <Notice>
          La table des paniers n&apos;est pas encore créée dans Neon. Le bloc paniers
          restera vide tant que le SQL n&apos;est pas ajouté.
        </Notice>
      ) : null}

      <section className="mb-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-6">
        <StatCard label="Ventes totales" value={formatCents(total.totalCents)} />
        <StatCard label="Aujourd'hui" value={formatCents(today.totalCents)} tone="emerald" />
        <StatCard label="7 jours" value={formatCents(last7Days.totalCents)} tone="sky" />
        <StatCard label="30 jours" value={formatCents(last30Days.totalCents)} tone="blue" />
        <StatCard label="Panier moyen" value={formatCents(getAverage(total))} tone="violet" />
        <StatCard label="En ligne" value={visitorsResult.rows.length.toString()} tone="fuchsia" />
      </section>

      <section className="mb-6 grid gap-4 xl:grid-cols-3">
        <InfoPanel title="Mois en cours">
          <InfoLine label="Commandes" value={currentMonth?.orderCount ?? 0} />
          <InfoLine
            label="Ventes connues"
            value={formatCents(currentMonth?.totalCents ?? 0)}
          />
          <InfoLine
            label="Panier moyen"
            value={formatCents(currentMonth ? getAverage(currentMonth) : 0)}
          />
          <InfoLine
            label="Comparaison mois dernier"
            value={formatGrowth(monthGrowth)}
            tone={monthGrowth === null ? "muted" : monthGrowth >= 0 ? "good" : "bad"}
          />
        </InfoPanel>

        <InfoPanel title="Rentabilité visible">
          <InfoLine label="Articles" value={formatCents(total.subtotalCents)} />
          <InfoLine label="Livraison encaissée" value={formatCents(total.shippingCents)} />
          <InfoLine label="Remises données" value={`- ${formatCents(total.discountCents)}`} tone="good" />
          <InfoLine label="Commandes sans montant" value={total.unknownAmountCount} tone={total.unknownAmountCount > 0 ? "warn" : "muted"} />
        </InfoPanel>

        <InfoPanel title="Paniers">
          <InfoLine label="Actifs" value={cartStats.activeCount} tone="good" />
          <InfoLine label="Valeur active" value={formatCents(cartStats.activeTotalCents)} />
          <InfoLine label="Récents" value={cartStats.recentCount} />
          <InfoLine label="Abandonnés" value={cartStats.abandonedCount} tone={cartStats.abandonedCount > 0 ? "warn" : "muted"} />
        </InfoPanel>
      </section>

      <section className="mb-6 grid gap-4 xl:grid-cols-[1fr_1fr]">
        <Panel title="Commandes par statut">
          <div className="grid gap-2 sm:grid-cols-2">
            {statusStats.map((stat) => (
              <StatusPill
                key={stat.status}
                label={STATUS_LABELS[stat.status] ?? stat.status}
                value={stat.count}
                tone={STATUS_TONES[stat.status] ?? "zinc"}
              />
            ))}
          </div>
        </Panel>

        <Panel title="Visiteurs en ligne">
          {visitorsResult.rows.length === 0 ? (
            <p className="text-sm text-gray-400">
              Personne en ligne sur les 2 dernières minutes.
            </p>
          ) : (
            <div className="space-y-2">
              {visitorsResult.rows.slice(0, 8).map((visitor) => (
                <div
                  key={visitor.visitorId}
                  className="flex items-center justify-between gap-3 rounded-lg bg-white/[0.04] p-2"
                >
                  <div className="min-w-0">
                    <div className="truncate text-sm font-semibold text-white">
                      {visitor.userEmail || "Visiteur anonyme"}
                    </div>
                    <div className="truncate text-xs text-gray-500">
                      {visitor.path || "/"}
                    </div>
                  </div>
                  <div className="shrink-0 text-xs text-gray-400">
                    {formatTime(visitor.lastSeenAt)}
                  </div>
                </div>
              ))}
            </div>
          )}
        </Panel>
      </section>

      <section className="mb-6 grid gap-4 xl:grid-cols-[1.15fr_0.85fr]">
        <Panel title="Ventes par mois">
          <ResponsiveTable
            empty="Aucune commande à analyser pour le moment."
            minWidth="780px"
            headers={[
              "Mois",
              "Commandes",
              "Ventes connues",
              "Panier moyen",
              "Livraison",
              "Remises",
              "Sans montant",
            ]}
          >
            {summaries.map((month) => (
              <tr key={month.key} className="border-b border-white/5 text-gray-200">
                <td className="py-3 pr-4 font-semibold text-white">{month.label}</td>
                <td className="py-3 pr-4">{month.orderCount}</td>
                <td className="py-3 pr-4">{formatCents(month.totalCents)}</td>
                <td className="py-3 pr-4">{formatCents(getAverage(month))}</td>
                <td className="py-3 pr-4">{formatCents(month.shippingCents)}</td>
                <td className="py-3 pr-4">- {formatCents(month.discountCents)}</td>
                <td className="py-3">{month.unknownAmountCount}</td>
              </tr>
            ))}
          </ResponsiveTable>
        </Panel>

        <Panel title="Meilleurs clients">
          {topCustomers.length === 0 ? (
            <p className="text-sm text-gray-400">Aucun client à afficher.</p>
          ) : (
            <div className="space-y-2">
              {topCustomers.slice(0, 8).map((customer, index) => (
                <div
                  key={customer.key}
                  className="rounded-xl border border-white/10 bg-white/[0.03] p-3"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="text-xs font-bold text-violet-200">
                        #{index + 1}
                      </div>
                      <div className="truncate font-semibold text-white">
                        {customer.name}
                      </div>
                      <div className="truncate text-xs text-gray-500">
                        {customer.email}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-bold text-white">
                        {formatCents(customer.totalCents)}
                      </div>
                      <div className="text-xs text-gray-500">
                        {customer.orderCount} commande
                        {customer.orderCount > 1 ? "s" : ""}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Panel>
      </section>

      <section className="mb-6 grid gap-4 xl:grid-cols-[0.9fr_1.1fr]">
        <InfoPanel title="Record">
          <InfoLine label="Meilleur mois" value={bestMonth?.label ?? "-"} />
          <InfoLine
            label="Ventes du meilleur mois"
            value={formatCents(bestMonth?.totalCents ?? 0)}
          />
          <InfoLine label="Commandes" value={bestMonth?.orderCount ?? 0} />
          <InfoLine
            label="Panier moyen"
            value={formatCents(bestMonth ? getAverage(bestMonth) : 0)}
          />
        </InfoPanel>

        <Panel title="14 derniers jours">
          <ResponsiveTable
            empty="Aucune commande récente."
            minWidth="560px"
            headers={["Jour", "Commandes", "Ventes connues", "Panier moyen"]}
          >
            {dailySummaries.map((day) => (
              <tr key={day.key} className="border-b border-white/5 text-gray-200">
                <td className="py-3 pr-4 font-semibold text-white">{day.label}</td>
                <td className="py-3 pr-4">{day.orderCount}</td>
                <td className="py-3 pr-4">{formatCents(day.totalCents)}</td>
                <td className="py-3">{formatCents(getAverage(day))}</td>
              </tr>
            ))}
          </ResponsiveTable>
        </Panel>
      </section>
    </div>
  );
}

async function getOrderAnalyticsRows() {
  try {
    const rows = await getDb().select().from(orderAnalytics);
    return { rows, tableReady: true };
  } catch {
    return { rows: [] as OrderAnalyticsRow[], tableReady: false };
  }
}

async function getActiveVisitorRows() {
  try {
    const rows = await getDb()
      .select()
      .from(activeVisitors)
      .where(gt(activeVisitors.lastSeenAt, new Date(Date.now() - ONLINE_AFTER_MS)))
      .orderBy(desc(activeVisitors.lastSeenAt))
      .limit(20);

    return { rows, tableReady: true };
  } catch {
    return { rows: [] as ActiveVisitorRow[], tableReady: false };
  }
}

async function getCartRows() {
  try {
    const rows = await getDb()
      .select()
      .from(cartSnapshots)
      .orderBy(desc(cartSnapshots.updatedAt))
      .limit(100);

    return { rows, tableReady: true };
  } catch {
    return { rows: [] as CartSnapshotRow[], tableReady: false };
  }
}

function summarizePeriod(
  orderRows: OrderRow[],
  analyticsByOrderId: Map<string, OrderAnalyticsRow>,
): PeriodSummary {
  return orderRows.reduce<PeriodSummary>(
    (summary, order) => {
      const analytics = analyticsByOrderId.get(order.id);
      summary.orderCount += 1;

      if (analytics?.amountTotalEuros != null) {
        summary.knownOrderCount += 1;
        summary.totalCents += eurosToCents(analytics.amountTotalEuros);
        summary.subtotalCents += eurosToCents(analytics.amountSubtotalEuros);
        summary.shippingCents += eurosToCents(analytics.shippingTotalEuros);
        summary.discountCents += eurosToCents(analytics.discountTotalEuros);
      } else {
        summary.unknownAmountCount += 1;
      }

      return summary;
    },
    {
      orderCount: 0,
      knownOrderCount: 0,
      totalCents: 0,
      subtotalCents: 0,
      shippingCents: 0,
      discountCents: 0,
      unknownAmountCount: 0,
    },
  );
}

function buildMonthlySummaries(
  orderRows: OrderRow[],
  analyticsByOrderId: Map<string, OrderAnalyticsRow>,
) {
  const grouped = new Map<string, OrderRow[]>();

  for (const order of orderRows) {
    const key = getMonthKey(order.createdAt);
    grouped.set(key, [...(grouped.get(key) ?? []), order]);
  }

  return Array.from(grouped.entries())
    .map(([key, rows]) => ({
      key,
      label: getMonthLabel(key),
      ...summarizePeriod(rows, analyticsByOrderId),
    }))
    .sort((a, b) => b.key.localeCompare(a.key));
}

function buildDailySummaries(
  orderRows: OrderRow[],
  analyticsByOrderId: Map<string, OrderAnalyticsRow>,
  days: number,
) {
  const today = startOfDay(new Date());
  const rows = Array.from({ length: days }, (_, index) => {
    const date = daysAgo(today, index);
    const key = getDayKey(date);
    const dayOrders = orderRows.filter((order) => getDayKey(order.createdAt) === key);

    return {
      key,
      label: formatShortDate(date),
      ...summarizePeriod(dayOrders, analyticsByOrderId),
    };
  });

  return rows;
}

function buildTopCustomers(
  orderRows: OrderRow[],
  analyticsByOrderId: Map<string, OrderAnalyticsRow>,
) {
  const customers = new Map<string, CustomerSummary>();

  for (const order of orderRows) {
    const key = order.customerEmail?.trim().toLowerCase() || order.customerName || order.id;
    const current =
      customers.get(key) ??
      ({
        key,
        name: order.customerName || "Client",
        email: order.customerEmail || "Email inconnu",
        orderCount: 0,
        knownOrderCount: 0,
        totalCents: 0,
        lastOrderAt: order.createdAt,
      } satisfies CustomerSummary);
    const analytics = analyticsByOrderId.get(order.id);

    current.orderCount += 1;
    if (analytics?.amountTotalEuros != null) {
      current.knownOrderCount += 1;
      current.totalCents += eurosToCents(analytics.amountTotalEuros);
    }
    if (new Date(order.createdAt) > new Date(current.lastOrderAt)) {
      current.lastOrderAt = order.createdAt;
    }

    customers.set(key, current);
  }

  return Array.from(customers.values()).sort((a, b) => {
    if (b.totalCents !== a.totalCents) return b.totalCents - a.totalCents;
    if (b.orderCount !== a.orderCount) return b.orderCount - a.orderCount;
    return new Date(b.lastOrderAt).getTime() - new Date(a.lastOrderAt).getTime();
  });
}

function buildStatusStats(orderRows: OrderRow[]) {
  const counts = new Map<string, number>();

  for (const order of orderRows) {
    counts.set(order.status, (counts.get(order.status) ?? 0) + 1);
  }

  return Object.keys(STATUS_LABELS).map((status) => ({
    status,
    count: counts.get(status) ?? 0,
  }));
}

function buildCartStats(rows: CartSnapshotRow[]) {
  const now = Date.now();
  const stats = {
    activeCount: 0,
    activeTotalCents: 0,
    recentCount: 0,
    recentTotalCents: 0,
    abandonedCount: 0,
    abandonedTotalCents: 0,
  };

  for (const row of rows) {
    const age = now - new Date(row.updatedAt).getTime();

    if (age <= ACTIVE_CART_AFTER_MS) {
      stats.activeCount += 1;
      stats.activeTotalCents += row.totalCents;
    } else if (age <= RECENT_CART_AFTER_MS) {
      stats.recentCount += 1;
      stats.recentTotalCents += row.totalCents;
    } else {
      stats.abandonedCount += 1;
      stats.abandonedTotalCents += row.totalCents;
    }
  }

  return stats;
}

function filterOrdersSince(orderRows: OrderRow[], from: Date) {
  return orderRows.filter((order) => new Date(order.createdAt) >= from);
}

function getAverage(summary: PeriodSummary) {
  if (summary.knownOrderCount === 0) return 0;
  return Math.round(summary.totalCents / summary.knownOrderCount);
}

function eurosToCents(value: number | null | undefined) {
  return typeof value === "number" ? Math.round(value * 100) : 0;
}

function getGrowthPercent(previous: number, current: number) {
  if (previous <= 0) return current > 0 ? 100 : null;
  return Math.round(((current - previous) / previous) * 100);
}

function formatGrowth(value: number | null) {
  if (value === null) return "-";
  return `${value >= 0 ? "+" : ""}${value}%`;
}

function startOfDay(value: Date) {
  return new Date(value.getFullYear(), value.getMonth(), value.getDate());
}

function daysAgo(value: Date, days: number) {
  return new Date(value.getFullYear(), value.getMonth(), value.getDate() - days);
}

function getMonthKey(value: Date | string) {
  const date = new Date(value);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

function getDayKey(value: Date | string) {
  const date = new Date(value);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function getMonthLabel(key: string) {
  const [year, month] = key.split("-").map(Number);
  return new Date(year, month - 1, 1).toLocaleDateString("fr-FR", {
    month: "long",
    year: "numeric",
  });
}

function formatShortDate(value: Date) {
  return value.toLocaleDateString("fr-FR", {
    day: "2-digit",
    month: "short",
  });
}

function formatTime(value: Date | string) {
  return new Date(value).toLocaleTimeString("fr-FR", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

type StatTone =
  | "violet"
  | "emerald"
  | "sky"
  | "blue"
  | "amber"
  | "fuchsia"
  | "zinc";

function toneClass(tone: StatTone) {
  return {
    violet: "border-violet-400/20 bg-violet-500/10 text-violet-200",
    emerald: "border-emerald-400/20 bg-emerald-500/10 text-emerald-200",
    sky: "border-sky-400/20 bg-sky-500/10 text-sky-200",
    blue: "border-blue-400/20 bg-blue-500/10 text-blue-200",
    amber: "border-amber-400/20 bg-amber-500/10 text-amber-200",
    fuchsia: "border-fuchsia-400/20 bg-fuchsia-500/10 text-fuchsia-200",
    zinc: "border-white/10 bg-white/[0.04] text-gray-200",
  }[tone];
}

function StatCard({
  label,
  value,
  tone = "violet",
}: {
  label: string;
  value: string;
  tone?: StatTone;
}) {
  return (
    <div className={`rounded-xl border p-4 ${toneClass(tone)}`}>
      <div className="text-sm">{label}</div>
      <div className="mt-1 text-2xl font-bold text-white">{value}</div>
    </div>
  );
}

function StatusPill({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone: StatTone;
}) {
  return (
    <div className={`rounded-xl border p-3 ${toneClass(tone)}`}>
      <div className="flex items-center justify-between gap-3">
        <span className="text-sm">{label}</span>
        <span className="text-xl font-bold text-white">{value}</span>
      </div>
    </div>
  );
}

function Panel({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="rounded-2xl border border-white/10 bg-zinc-950/70 p-4">
      <h2 className="mb-4 text-xl font-bold text-white">{title}</h2>
      {children}
    </section>
  );
}

function InfoPanel({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-zinc-950/70 p-4">
      <h2 className="mb-3 text-lg font-bold text-white">{title}</h2>
      <div className="space-y-2">{children}</div>
    </div>
  );
}

function InfoLine({
  label,
  value,
  tone = "normal",
}: {
  label: string;
  value: ReactNode;
  tone?: "normal" | "good" | "bad" | "warn" | "muted";
}) {
  const valueClass = {
    normal: "text-white",
    good: "text-emerald-200",
    bad: "text-red-200",
    warn: "text-amber-200",
    muted: "text-gray-300",
  }[tone];

  return (
    <div className="flex items-center justify-between gap-3 text-sm">
      <span className="text-gray-400">{label}</span>
      <span className={`text-right font-semibold ${valueClass}`}>{value}</span>
    </div>
  );
}

function ResponsiveTable({
  headers,
  children,
  empty,
  minWidth,
}: {
  headers: string[];
  children: ReactNode;
  empty: string;
  minWidth: string;
}) {
  const rows = Array.isArray(children) ? children.filter(Boolean) : children;
  const isEmpty = Array.isArray(rows) ? rows.length === 0 : !rows;

  if (isEmpty) {
    return (
      <div className="rounded-xl bg-white/[0.03] p-4 text-center text-gray-400">
        {empty}
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left text-sm" style={{ minWidth }}>
        <thead className="text-xs uppercase tracking-[0.16em] text-gray-500">
          <tr className="border-b border-white/10">
            {headers.map((header) => (
              <th key={header} className="py-3 pr-4">
                {header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>{children}</tbody>
      </table>
    </div>
  );
}

function Notice({ children }: { children: ReactNode }) {
  return (
    <div className="mb-4 rounded-2xl border border-amber-400/25 bg-amber-500/10 p-4 text-sm text-amber-100">
      {children}
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
