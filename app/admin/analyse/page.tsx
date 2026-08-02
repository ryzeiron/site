import Link from "next/link";
import { redirect } from "next/navigation";
import type { ReactNode } from "react";
import { desc, eq, gt, notInArray } from "drizzle-orm";
import AdminCatalogTabs from "@/components/AdminCatalogTabs";
import LogoutButton from "@/components/LogoutButton";
import { isAdmin } from "@/lib/admin/auth";
import { getDb } from "@/lib/db/client";
import {
  activeVisitors,
  cartSnapshots,
  loyaltyLedger,
  orderAnalytics,
  orders,
  users,
  visitorDailyStats,
  visitorHourlyStats,
} from "@/lib/db/schema";
import { formatCents } from "@/lib/format";
import { LOYALTY_TIERS, getTierByPoints } from "@/lib/loyalty-tiers";

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
type VisitorDailyRow = typeof visitorDailyStats.$inferSelect;
type VisitorHourlyRow = typeof visitorHourlyStats.$inferSelect;

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

type VisitorDaySummary = {
  key: string;
  label: string;
  uniqueVisitors: number;
  pings: number;
};

type VisitorHourSummary = {
  key: string;
  label: string;
  uniqueVisitors: number;
  pings: number;
};

type VisitorPageSummary = {
  path: string;
  uniqueVisitors: number;
  pings: number;
};

type VisitorWeekdaySummary = {
  key: string;
  label: string;
  daysCount: number;
  totalUniqueVisitors: number;
  averageUniqueVisitors: number;
  totalPings: number;
  averagePings: number;
  bestUniqueVisitors: number;
};

type VisitorPersonSummary = {
  key: string;
  label: string;
  email: string | null;
  visitDays: number;
  todayVisits: number;
  last7DaysVisits: number;
  last30DaysVisits: number;
  pings: number;
  lastPath: string;
  lastSeenAt: Date | string;
  isOnline: boolean;
};

const ONLINE_AFTER_MS = 2 * 60 * 1000;
const ACTIVE_CART_AFTER_MS = 30 * 60 * 1000;
const RECENT_CART_AFTER_MS = 3 * 60 * 60 * 1000;
const PARIS_TIME_ZONE = "Europe/Paris";
const WEEKDAY_LABELS = [
  "Lundi",
  "Mardi",
  "Mercredi",
  "Jeudi",
  "Vendredi",
  "Samedi",
  "Dimanche",
];

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
  const [
    orderRows,
    analyticsResult,
    visitorsResult,
    cartsResult,
    visitorHistoryResult,
    loyaltyResult,
  ] = await Promise.all([
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
    getVisitorHistoryRows(),
    getLoyaltyRows(),
  ]);

  const loyaltyStats = buildLoyaltyStats(
    loyaltyResult.balances,
    loyaltyResult.ledger,
  );

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
  const visitorStats = buildVisitorStats(
    visitorHistoryResult.dailyRows,
    visitorHistoryResult.hourlyRows,
    now,
    visitorsResult.rows,
  );

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

      {!visitorHistoryResult.tableReady ? (
        <Notice>
          La table d&apos;historique visiteurs n&apos;est pas encore crÃ©Ã©e dans Neon. Les
          records visiteurs resteront vides tant que le SQL n&apos;est pas ajoutÃ©.
        </Notice>
      ) : null}

      <section className="mb-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-6">
        <StatCard label="Ventes totales" value={formatCents(total.totalCents)} />
        <StatCard label="Aujourd'hui" value={formatCents(today.totalCents)} tone="emerald" />
        <StatCard label="7 jours" value={formatCents(last7Days.totalCents)} tone="sky" />
        <StatCard label="30 jours" value={formatCents(last30Days.totalCents)} tone="blue" />
        <StatCard label="Panier moyen" value={formatCents(getAverage(total))} tone="violet" />
        <StatCard label="Visiteurs totaux" value={visitorStats.totalUniqueVisitors.toString()} tone="amber" />
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

      <section className="mb-6 grid gap-4 xl:grid-cols-[1.25fr_0.75fr]">
        <Panel title="Visiteurs">
          <div className="mb-4 grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
            <MiniMetric label="En ligne" value={visitorsResult.rows.length} tone="good" />
            <MiniMetric label="Aujourd'hui" value={visitorStats.todayUniqueVisitors} />
            <MiniMetric label="7 jours" value={visitorStats.last7DaysUniqueVisitors} />
            <MiniMetric label="30 jours" value={visitorStats.last30DaysUniqueVisitors} />
          </div>
          <VisitorBarChart days={visitorStats.last7DaysChart} />
        </Panel>

        <InfoPanel title="Records visiteurs">
          <InfoLine label="Meilleur jour" value={visitorStats.bestDay?.label ?? "-"} />
          <InfoLine
            label="Visiteurs ce jour"
            value={visitorStats.bestDay?.uniqueVisitors ?? 0}
            tone={visitorStats.bestDay ? "good" : "muted"}
          />
          <InfoLine label="Heure la plus active" value={visitorStats.bestHour?.label ?? "-"} />
          <InfoLine
            label="Visiteurs cette heure"
            value={visitorStats.bestHour?.uniqueVisitors ?? 0}
            tone={visitorStats.bestHour ? "good" : "muted"}
          />
        </InfoPanel>
      </section>

      <section className="mb-6 grid gap-4 xl:grid-cols-[0.75fr_0.75fr_1.2fr]">
        <Panel title="Pages les plus actives">
          {visitorStats.topPages.length === 0 ? (
            <p className="text-sm text-gray-400">Pas encore d&apos;historique visiteurs.</p>
          ) : (
            <div className="space-y-2">
              {visitorStats.topPages.slice(0, 6).map((page) => (
                <div
                  key={page.path}
                  className="flex items-center justify-between gap-3 rounded-lg bg-white/[0.04] p-2 text-sm"
                >
                  <span className="min-w-0 truncate text-gray-200">{page.path}</span>
                  <span className="shrink-0 font-semibold text-white">
                    {page.uniqueVisitors}
                  </span>
                </div>
              ))}
            </div>
          )}
        </Panel>

        <Panel title="Moyenne par jour">
          <WeekdayAverageList days={visitorStats.weekdayAverages} />
        </Panel>

        <Panel title="Historique par visiteur">
          <ResponsiveTable
            empty="Pas encore de visiteurs à afficher."
            minWidth="760px"
            headers={[
              "Visiteur",
              "Jours",
              "Aujourd'hui",
              "7 jours",
              "30 jours",
              "Activité",
              "Dernière page",
            ]}
          >
            {visitorStats.visitorPeople.slice(0, 12).map((visitor) => (
              <tr key={visitor.key} className="border-b border-white/5 text-gray-200">
                <td className="py-3 pr-4">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-white">{visitor.label}</span>
                    {visitor.isOnline ? (
                      <span className="rounded-full bg-emerald-500/15 px-2 py-0.5 text-xs font-semibold text-emerald-200">
                        en ligne
                      </span>
                    ) : null}
                  </div>
                </td>
                <td className="py-3 pr-4">{visitor.visitDays}</td>
                <td className="py-3 pr-4">{visitor.todayVisits}</td>
                <td className="py-3 pr-4">{visitor.last7DaysVisits}</td>
                <td className="py-3 pr-4">{visitor.last30DaysVisits}</td>
                <td className="py-3 pr-4">{visitor.pings}</td>
                <td className="max-w-[240px] truncate py-3 text-gray-400">
                  {visitor.lastPath}
                </td>
              </tr>
            ))}
          </ResponsiveTable>
        </Panel>
      </section>

      <section className="mb-6">
        <Panel title="Fidélité">
          {!loyaltyResult.tableReady ? (
            <p className="text-sm text-gray-400">
              Table de fidélité indisponible.
            </p>
          ) : (
            <>
              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                <StatCard
                  label="Points en circulation"
                  value={loyaltyStats.inCirculation.toLocaleString("fr-FR")}
                  tone="violet"
                />
                <StatCard
                  label="Clients avec des points"
                  value={loyaltyStats.holders.toString()}
                  tone="sky"
                />
                <StatCard
                  label="Points distribués"
                  value={loyaltyStats.earned.toLocaleString("fr-FR")}
                  tone="emerald"
                />
                <StatCard
                  label="Points dépensés"
                  value={loyaltyStats.spent.toLocaleString("fr-FR")}
                  tone="amber"
                />
              </div>

              <h3 className="mb-3 mt-6 text-sm font-semibold uppercase tracking-[0.14em] text-violet-200">
                Avantages utilisés ({loyaltyStats.totalRedeems})
              </h3>

              {loyaltyStats.totalRedeems === 0 ? (
                <p className="text-sm text-gray-400">
                  Aucun palier utilisé pour le moment.
                </p>
              ) : (
                <LoyaltyTierChart
                  tiers={loyaltyStats.tiers}
                  total={loyaltyStats.totalRedeems}
                />
              )}

              <p className="mt-4 text-[11px] text-gray-500">
                Comptes internes exclus :{" "}
                {LOYALTY_EXCLUDED_EMAILS.join(", ")}.
              </p>
            </>
          )}
        </Panel>
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
            <ResponsiveTable
              empty="Personne en ligne sur les 2 dernières minutes."
              minWidth="560px"
              headers={["Visiteur", "Page", "Dernière activité"]}
            >
              {visitorsResult.rows.slice(0, 12).map((visitor) => (
                <tr key={visitor.visitorId} className="border-b border-white/5 text-gray-200">
                  <td className="py-3 pr-4 font-semibold text-white">
                    {visitor.userEmail || "Visiteur anonyme"}
                  </td>
                  <td className="max-w-[280px] truncate py-3 pr-4 text-gray-400">
                    {visitor.path || "/"}
                  </td>
                  <td className="py-3">{formatTime(visitor.lastSeenAt)}</td>
                </tr>
              ))}
            </ResponsiveTable>
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

      <section className="mb-6 grid gap-4 xl:grid-cols-[0.8fr_1.1fr_1.1fr]">
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

        <Panel title="Ventes - 14 derniers jours">
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

        <Panel title="Visiteurs - 14 derniers jours">
          <ResponsiveTable
            empty="Pas encore d&apos;historique visiteurs."
            minWidth="420px"
            headers={["Jour", "Visiteurs", "Activite"]}
          >
            {visitorStats.dailySummaries.map((day) => (
              <tr key={day.key} className="border-b border-white/5 text-gray-200">
                <td className="py-3 pr-4 font-semibold text-white">{day.label}</td>
                <td className="py-3 pr-4">{day.uniqueVisitors}</td>
                <td className="py-3">{day.pings}</td>
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

// Comptes internes, exclus de toutes les stats de fidelite.
const LOYALTY_EXCLUDED_EMAILS = [
  "del6.2pokemon@gmail.com",
  "antoningiolda@gmail.com",
];

async function getLoyaltyRows() {
  try {
    const db = getDb();

    // Le solde en circulation vient des comptes, le detail des usages du ledger.
    const [balances, ledger] = await Promise.all([
      db
        .select({ balance: users.pointsBalance, email: users.email })
        .from(users)
        .where(notInArray(users.email, LOYALTY_EXCLUDED_EMAILS)),
      db
        .select({
          delta: loyaltyLedger.delta,
          reason: loyaltyLedger.reason,
          email: users.email,
        })
        .from(loyaltyLedger)
        .innerJoin(users, eq(users.id, loyaltyLedger.userId))
        .where(notInArray(users.email, LOYALTY_EXCLUDED_EMAILS)),
    ]);

    return { balances, ledger, tableReady: true };
  } catch {
    return {
      balances: [] as { balance: number; email: string }[],
      ledger: [] as { delta: number; reason: string; email: string }[],
      tableReady: false,
    };
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

async function getVisitorHistoryRows() {
  try {
    const db = getDb();
    const [dailyRows, hourlyRows] = await Promise.all([
      db.select().from(visitorDailyStats).orderBy(desc(visitorDailyStats.day)).limit(20000),
      db
        .select()
        .from(visitorHourlyStats)
        .orderBy(desc(visitorHourlyStats.hour))
        .limit(50000),
    ]);

    return { dailyRows, hourlyRows, tableReady: true };
  } catch {
    return {
      dailyRows: [] as VisitorDailyRow[],
      hourlyRows: [] as VisitorHourlyRow[],
      tableReady: false,
    };
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

// Le palier utilise se deduit du nombre de points debites : chaque palier a un
// cout unique, qui sert donc d'identifiant. Un palier retire de la grille depuis
// n'est plus resolvable et bascule dans "Palier supprime".
function buildLoyaltyStats(
  balances: { balance: number; email: string }[],
  ledger: { delta: number; reason: string; email: string }[],
) {
  const inCirculation = balances.reduce(
    (total, row) => total + (row.balance ?? 0),
    0,
  );
  const holders = balances.filter((row) => (row.balance ?? 0) > 0).length;

  let earned = 0;
  let spent = 0;
  const redeemsByPoints = new Map<number, number>();

  for (const row of ledger) {
    if (row.delta > 0) {
      earned += row.delta;
      continue;
    }

    const points = -row.delta;
    spent += points;

    if (row.reason === "redeem") {
      redeemsByPoints.set(points, (redeemsByPoints.get(points) ?? 0) + 1);
    }
  }

  const knownTiers = LOYALTY_TIERS.map((tier) => ({
    points: tier.points,
    label: tier.label,
    count: redeemsByPoints.get(tier.points) ?? 0,
    stillOffered: true,
  }));

  const retiredTiers = [...redeemsByPoints.entries()]
    .filter(([points]) => !getTierByPoints(points))
    .map(([points, count]) => ({
      points,
      label: `Palier supprimé (${points} pts)`,
      count,
      stillOffered: false,
    }));

  const tiers = [...knownTiers, ...retiredTiers].sort(
    (a, b) => b.count - a.count || a.points - b.points,
  );
  const totalRedeems = tiers.reduce((total, tier) => total + tier.count, 0);

  return { inCirculation, holders, earned, spent, tiers, totalRedeems };
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

function buildVisitorStats(
  dailyRows: VisitorDailyRow[],
  hourlyRows: VisitorHourlyRow[],
  now: Date,
  activeRows: ActiveVisitorRow[],
) {
  const todayKey = getDayKey(now);
  const sevenDaysAgoKey = getDayKey(daysAgoInParis(now, 6));
  const thirtyDaysAgoKey = getDayKey(daysAgoInParis(now, 29));
  const daySummaries = buildVisitorDaySummaries(dailyRows);
  const hourSummaries = buildVisitorHourSummaries(hourlyRows);
  const dailySummaries = buildRecentVisitorDailySummaries(dailyRows, 14, now);

  return {
    totalUniqueVisitors: new Set(dailyRows.map((row) => row.visitorId)).size,
    todayUniqueVisitors: dailyRows.filter((row) => row.day === todayKey).length,
    last7DaysUniqueVisitors: countUniqueVisitorsSince(dailyRows, sevenDaysAgoKey),
    last30DaysUniqueVisitors: countUniqueVisitorsSince(dailyRows, thirtyDaysAgoKey),
    bestDay: daySummaries.reduce<VisitorDaySummary | null>(
      (best, day) =>
        !best || day.uniqueVisitors > best.uniqueVisitors ? day : best,
      null,
    ),
    bestHour: hourSummaries.reduce<VisitorHourSummary | null>(
      (best, hour) =>
        !best || hour.uniqueVisitors > best.uniqueVisitors ? hour : best,
      null,
    ),
    dailySummaries,
    last7DaysChart: dailySummaries.slice(0, 7).reverse(),
    weekdayAverages: buildVisitorWeekdayAverages(dailyRows, now),
    topPages: buildTopVisitorPages(dailyRows),
    visitorPeople: buildVisitorPeople(
      dailyRows,
      activeRows,
      todayKey,
      sevenDaysAgoKey,
      thirtyDaysAgoKey,
    ),
  };
}

function buildVisitorPeople(
  rows: VisitorDailyRow[],
  activeRows: ActiveVisitorRow[],
  todayKey: string,
  sevenDaysAgoKey: string,
  thirtyDaysAgoKey: string,
) {
  const activeKeys = new Set(
    activeRows.map((row) => getVisitorPersonKey(row.visitorId, row.userEmail)),
  );
  const grouped = new Map<string, VisitorPersonSummary>();

  for (const row of rows) {
    const key = getVisitorPersonKey(row.visitorId, row.userEmail);
    const label = row.userEmail?.trim() || `Visiteur ${row.visitorId.slice(0, 8)}`;
    const current =
      grouped.get(key) ??
      ({
        key,
        label,
        email: row.userEmail ?? null,
        visitDays: 0,
        todayVisits: 0,
        last7DaysVisits: 0,
        last30DaysVisits: 0,
        pings: 0,
        lastPath: row.lastPath || row.firstPath || "/",
        lastSeenAt: row.lastSeenAt,
        isOnline: activeKeys.has(key),
      } satisfies VisitorPersonSummary);

    current.visitDays += 1;
    current.pings += row.pingCount;

    if (row.day === todayKey) current.todayVisits += 1;
    if (row.day >= sevenDaysAgoKey) current.last7DaysVisits += 1;
    if (row.day >= thirtyDaysAgoKey) current.last30DaysVisits += 1;

    if (new Date(row.lastSeenAt) > new Date(current.lastSeenAt)) {
      current.lastSeenAt = row.lastSeenAt;
      current.lastPath = row.lastPath || row.firstPath || "/";
    }

    current.isOnline = current.isOnline || activeKeys.has(key);
    grouped.set(key, current);
  }

  return Array.from(grouped.values()).sort((a, b) => {
    if (Number(b.isOnline) !== Number(a.isOnline)) {
      return Number(b.isOnline) - Number(a.isOnline);
    }

    if (b.last30DaysVisits !== a.last30DaysVisits) {
      return b.last30DaysVisits - a.last30DaysVisits;
    }

    if (b.pings !== a.pings) return b.pings - a.pings;

    return new Date(b.lastSeenAt).getTime() - new Date(a.lastSeenAt).getTime();
  });
}

function getVisitorPersonKey(visitorId: string, email: string | null) {
  const normalizedEmail = email?.trim().toLowerCase();
  return normalizedEmail ? `email:${normalizedEmail}` : `visitor:${visitorId}`;
}

function countUniqueVisitorsSince(rows: VisitorDailyRow[], fromDay: string) {
  return new Set(
    rows.filter((row) => row.day >= fromDay).map((row) => row.visitorId),
  ).size;
}

function buildVisitorDaySummaries(rows: VisitorDailyRow[]) {
  const grouped = new Map<string, VisitorDaySummary>();

  for (const row of rows) {
    const current =
      grouped.get(row.day) ??
      ({
        key: row.day,
        label: formatVisitorDayLabel(row.day),
        uniqueVisitors: 0,
        pings: 0,
      } satisfies VisitorDaySummary);

    current.uniqueVisitors += 1;
    current.pings += row.pingCount;
    grouped.set(row.day, current);
  }

  return Array.from(grouped.values()).sort((a, b) => b.key.localeCompare(a.key));
}

function buildVisitorWeekdayAverages(rows: VisitorDailyRow[], now: Date) {
  const byDay = new Map<string, VisitorDaySummary>();
  for (const day of buildVisitorDaySummaries(rows)) {
    byDay.set(day.key, day);
  }

  const todayKey = getDayKey(now);
  const dayKeys = rows.map((row) => row.day);
  const firstKey =
    dayKeys.length > 0
      ? dayKeys.reduce((first, key) => (key < first ? key : first))
      : todayKey;
  const lastKey =
    dayKeys.length > 0
      ? dayKeys.reduce((last, key) => (key > last ? key : last), todayKey)
      : todayKey;

  const summaries = WEEKDAY_LABELS.map((label, index) => ({
    key: String(index),
    label,
    daysCount: 0,
    totalUniqueVisitors: 0,
    averageUniqueVisitors: 0,
    totalPings: 0,
    averagePings: 0,
    bestUniqueVisitors: 0,
  } satisfies VisitorWeekdaySummary));

  const cursor = parseDayKeyAtNoonUtc(firstKey);
  const end = parseDayKeyAtNoonUtc(lastKey);

  while (cursor <= end) {
    const key = getDayKey(cursor);
    const weekdayIndex = (cursor.getUTCDay() + 6) % 7;
    const summary = summaries[weekdayIndex];
    const day = byDay.get(key);

    summary.daysCount += 1;
    summary.totalUniqueVisitors += day?.uniqueVisitors ?? 0;
    summary.totalPings += day?.pings ?? 0;
    summary.bestUniqueVisitors = Math.max(
      summary.bestUniqueVisitors,
      day?.uniqueVisitors ?? 0,
    );

    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }

  return summaries.map((summary) => ({
    ...summary,
    averageUniqueVisitors:
      summary.daysCount > 0
        ? summary.totalUniqueVisitors / summary.daysCount
        : 0,
    averagePings:
      summary.daysCount > 0 ? summary.totalPings / summary.daysCount : 0,
  }));
}

function buildRecentVisitorDailySummaries(
  rows: VisitorDailyRow[],
  days: number,
  now: Date,
) {
  return Array.from({ length: days }, (_, index) => {
    const date = daysAgoInParis(now, index);
    const key = getDayKey(date);
    const dayRows = rows.filter((row) => row.day === key);

    return {
      key,
      label: formatShortVisitorDayLabel(key),
      uniqueVisitors: dayRows.length,
      pings: dayRows.reduce((total, row) => total + row.pingCount, 0),
    } satisfies VisitorDaySummary;
  });
}

function buildVisitorHourSummaries(rows: VisitorHourlyRow[]) {
  const grouped = new Map<string, VisitorHourSummary>();

  for (const row of rows) {
    const current =
      grouped.get(row.hour) ??
      ({
        key: row.hour,
        label: formatVisitorHourLabel(row.hour),
        uniqueVisitors: 0,
        pings: 0,
      } satisfies VisitorHourSummary);

    current.uniqueVisitors += 1;
    current.pings += row.pingCount;
    grouped.set(row.hour, current);
  }

  return Array.from(grouped.values()).sort((a, b) => b.key.localeCompare(a.key));
}

function buildTopVisitorPages(rows: VisitorDailyRow[]) {
  const grouped = new Map<string, VisitorPageSummary>();

  for (const row of rows) {
    const path = row.lastPath || row.firstPath || "/";
    const current =
      grouped.get(path) ??
      ({
        path,
        uniqueVisitors: 0,
        pings: 0,
      } satisfies VisitorPageSummary);

    current.uniqueVisitors += 1;
    current.pings += row.pingCount;
    grouped.set(path, current);
  }

  return Array.from(grouped.values()).sort((a, b) => {
    if (b.uniqueVisitors !== a.uniqueVisitors) {
      return b.uniqueVisitors - a.uniqueVisitors;
    }

    return b.pings - a.pings;
  });
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
  const { year, month } = getParisDateParts(value);
  return `${year}-${month}`;
}

function getDayKey(value: Date | string) {
  const { year, month, day } = getParisDateParts(value);
  return `${year}-${month}-${day}`;
}

function getParisDateParts(value: Date | string) {
  const parts = new Intl.DateTimeFormat("fr-FR", {
    timeZone: PARIS_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date(value));
  const values = Object.fromEntries(
    parts
      .filter((part) => part.type !== "literal")
      .map((part) => [part.type, part.value]),
  );

  return {
    year: values.year,
    month: values.month,
    day: values.day,
  };
}

function daysAgoInParis(value: Date, days: number) {
  const { year, month, day } = getParisDateParts(value);

  return new Date(
    Date.UTC(Number(year), Number(month) - 1, Number(day) - days, 12),
  );
}

function parseDayKeyAtNoonUtc(key: string) {
  const [year, month, day] = key.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, day, 12));
}

function getMonthLabel(key: string) {
  const [year, month] = key.split("-").map(Number);
  return new Date(year, month - 1, 1).toLocaleDateString("fr-FR", {
    timeZone: PARIS_TIME_ZONE,
    month: "long",
    year: "numeric",
  });
}

function formatShortDate(value: Date) {
  return value.toLocaleDateString("fr-FR", {
    timeZone: PARIS_TIME_ZONE,
    day: "2-digit",
    month: "short",
  });
}

function formatShortVisitorDayLabel(key: string) {
  const [year, month, day] = key.split("-").map(Number);

  if (!year || !month || !day) return key;

  return new Date(Date.UTC(year, month - 1, day, 12)).toLocaleDateString("fr-FR", {
    timeZone: PARIS_TIME_ZONE,
    day: "2-digit",
    month: "short",
  });
}

function formatVisitorDayLabel(key: string) {
  const [year, month, day] = key.split("-").map(Number);

  if (!year || !month || !day) return key;

  return new Date(year, month - 1, day).toLocaleDateString("fr-FR", {
    timeZone: PARIS_TIME_ZONE,
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
}

function formatVisitorHourLabel(key: string) {
  const [datePart, timePart = "00:00"] = key.split(" ");
  const [year, month, day] = datePart.split("-").map(Number);

  if (!year || !month || !day) return key;

  const dateLabel = new Date(year, month - 1, day).toLocaleDateString("fr-FR", {
    timeZone: PARIS_TIME_ZONE,
    day: "2-digit",
    month: "short",
  });
  const hour = timePart.slice(0, 2);

  return `${dateLabel} a ${hour}h`;
}

function formatTime(value: Date | string) {
  return new Date(value).toLocaleTimeString("fr-FR", {
    timeZone: PARIS_TIME_ZONE,
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

function MiniMetric({
  label,
  value,
  tone = "normal",
}: {
  label: string;
  value: number | string;
  tone?: "normal" | "good";
}) {
  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.04] p-3">
      <div className="text-xs uppercase tracking-[0.14em] text-gray-500">{label}</div>
      <div
        className={`mt-1 text-2xl font-bold ${
          tone === "good" ? "text-emerald-200" : "text-white"
        }`}
      >
        {value}
      </div>
    </div>
  );
}

function VisitorBarChart({ days }: { days: VisitorDaySummary[] }) {
  const maxVisitors = Math.max(1, ...days.map((day) => day.uniqueVisitors));

  return (
    <div className="rounded-xl border border-white/10 bg-black/20 p-4">
      <div className="mb-3 flex items-center justify-between gap-3">
        <div>
          <div className="text-sm font-semibold text-white">Graphique 7 jours</div>
          <div className="text-xs text-gray-500">Visiteurs uniques par jour</div>
        </div>
        <div className="text-xs text-gray-500">max {maxVisitors}</div>
      </div>

      <div className="flex h-48 items-end gap-3">
        {days.map((day) => {
          const height = Math.max(
            day.uniqueVisitors > 0 ? 10 : 2,
            Math.round((day.uniqueVisitors / maxVisitors) * 100),
          );

          return (
            <div key={day.key} className="flex min-w-0 flex-1 flex-col items-center gap-2">
              <div className="flex h-36 w-full items-end rounded-lg bg-white/[0.03] px-1">
                <div
                  className="w-full rounded-t-md bg-gradient-to-t from-violet-600 to-fuchsia-400"
                  style={{ height: `${height}%` }}
                  title={`${day.label}: ${day.uniqueVisitors} visiteur(s)`}
                />
              </div>
              <div className="text-xs font-semibold text-white">{day.uniqueVisitors}</div>
              <div className="w-full truncate text-center text-[11px] text-gray-500">
                {day.label}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function WeekdayAverageList({ days }: { days: VisitorWeekdaySummary[] }) {
  const hasData = days.some((day) => day.daysCount > 0);
  const maxAverage = Math.max(
    1,
    ...days.map((day) => day.averageUniqueVisitors),
  );

  if (!hasData) {
    return (
      <p className="text-sm text-gray-400">
        Pas encore assez d&apos;historique visiteurs.
      </p>
    );
  }

  return (
    <div className="space-y-2">
      {days.map((day) => {
        const width = Math.max(
          day.averageUniqueVisitors > 0 ? 8 : 2,
          Math.round((day.averageUniqueVisitors / maxAverage) * 100),
        );

        return (
          <div key={day.key} className="rounded-lg bg-white/[0.04] p-2">
            <div className="mb-1 flex items-center justify-between gap-3 text-sm">
              <span className="font-semibold text-white">{day.label}</span>
              <span className="text-gray-300">
                {formatAverageNumber(day.averageUniqueVisitors)} / jour
              </span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-white/10">
              <div
                className="h-full rounded-full bg-gradient-to-r from-violet-600 to-fuchsia-400"
                style={{ width: `${width}%` }}
              />
            </div>
            <div className="mt-1 flex items-center justify-between gap-3 text-[11px] text-gray-500">
              <span>{day.daysCount} jour(s) comptes</span>
              <span>record {day.bestUniqueVisitors}</span>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function formatAverageNumber(value: number) {
  return value.toLocaleString("fr-FR", {
    maximumFractionDigits: 1,
  });
}

function LoyaltyTierChart({
  tiers,
  total,
}: {
  tiers: {
    points: number;
    label: string;
    count: number;
    stillOffered: boolean;
  }[];
  total: number;
}) {
  const max = Math.max(1, ...tiers.map((tier) => tier.count));

  return (
    <div className="space-y-2">
      {tiers.map((tier) => {
        const width = Math.max(tier.count > 0 ? 8 : 2, (tier.count / max) * 100);
        const share = total > 0 ? Math.round((tier.count / total) * 100) : 0;

        return (
          <div key={tier.points} className="rounded-lg bg-white/[0.04] p-2">
            <div className="mb-1 flex items-center justify-between gap-3 text-sm">
              <span
                className={
                  tier.stillOffered
                    ? "font-semibold text-white"
                    : "font-semibold text-gray-400 line-through"
                }
              >
                {tier.label}
              </span>
              <span className="shrink-0 text-gray-300">
                {tier.count} fois
              </span>
            </div>

            <div className="h-2 overflow-hidden rounded-full bg-white/10">
              <div
                className="h-full rounded-full bg-gradient-to-r from-violet-600 to-fuchsia-400"
                style={{ width: `${width}%` }}
              />
            </div>

            <div className="mt-1 flex items-center justify-between gap-3 text-[11px] text-gray-500">
              <span>{tier.points} pts</span>
              <span>{share} % des utilisations</span>
            </div>
          </div>
        );
      })}
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
