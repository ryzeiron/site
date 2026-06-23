import Link from "next/link";
import { redirect } from "next/navigation";
import type { ReactNode } from "react";
import { desc, gt } from "drizzle-orm";
import AdminCatalogTabs from "@/components/AdminCatalogTabs";
import LogoutButton from "@/components/LogoutButton";
import { isAdmin } from "@/lib/admin/auth";
import { getDb } from "@/lib/db/client";
import { activeVisitors, orderAnalytics, orders } from "@/lib/db/schema";
import { formatCents } from "@/lib/format";

export const dynamic = "force-dynamic";

type OrderRow = {
  id: string;
  status: string;
  createdAt: Date | string;
};

type OrderAnalyticsRow = typeof orderAnalytics.$inferSelect;
type ActiveVisitorRow = typeof activeVisitors.$inferSelect;

type MonthSummary = {
  key: string;
  label: string;
  orderCount: number;
  knownOrderCount: number;
  totalCents: number;
  subtotalCents: number;
  shippingCents: number;
  discountCents: number;
  unknownAmountCount: number;
};

const ONLINE_AFTER_MS = 2 * 60 * 1000;

export default async function AdminAnalyticsPage() {
  if (!(await isAdmin())) redirect("/admin/login");

  const db = getDb();
  const [orderRows, analyticsResult, visitorsResult] = await Promise.all([
    db
      .select({
        id: orders.id,
        status: orders.status,
        createdAt: orders.createdAt,
      })
      .from(orders)
      .orderBy(desc(orders.createdAt)),
    getOrderAnalyticsRows(),
    getActiveVisitorRows(),
  ]);

  const analyticsByOrderId = new Map(
    analyticsResult.rows.map((row) => [row.orderId, row]),
  );
  const summaries = buildMonthlySummaries(orderRows, analyticsByOrderId);
  const knownRows = orderRows
    .map((order) => analyticsByOrderId.get(order.id) ?? null)
    .filter((row): row is OrderAnalyticsRow => Boolean(row));
  const totalRevenueCents = knownRows.reduce(
    (total, row) => total + (row.amountTotalCents ?? 0),
    0,
  );
  const totalShippingCents = knownRows.reduce(
    (total, row) => total + (row.shippingTotalCents ?? 0),
    0,
  );
  const totalDiscountCents = knownRows.reduce(
    (total, row) => total + (row.discountTotalCents ?? 0),
    0,
  );
  const averageOrderCents =
    knownRows.length > 0 ? Math.round(totalRevenueCents / knownRows.length) : 0;
  const unknownAmountCount = Math.max(0, orderRows.length - knownRows.length);

  return (
    <div className="py-6">
      <div className="mb-6 flex items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-white">Admin - Analyse</h1>
          <p className="mt-1 text-sm text-gray-400">
            Vue rapide sur les ventes, les mois forts et les visiteurs en ligne.
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
          La table d&apos;analyse n&apos;est pas encore creee dans Neon. Colle le
          SQL fourni avec la modification, puis recharge cette page.
        </Notice>
      ) : null}

      {!visitorsResult.tableReady ? (
        <Notice>
          La table des visiteurs en ligne n&apos;est pas encore creee dans Neon. Le
          compteur restera a 0 tant que le SQL n&apos;est pas ajoute.
        </Notice>
      ) : null}

      <section className="mb-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        <StatCard label="Ventes connues" value={formatCents(totalRevenueCents)} />
        <StatCard label="Commandes" value={orderRows.length.toString()} />
        <StatCard label="Panier moyen" value={formatCents(averageOrderCents)} />
        <StatCard label="Remises" value={formatCents(totalDiscountCents)} />
        <StatCard
          label="En ligne"
          value={visitorsResult.rows.length.toString()}
          tone="emerald"
        />
      </section>

      <section className="mb-6 grid gap-4 lg:grid-cols-3">
        <InfoPanel title="Total">
          <InfoLine label="Chiffre connu" value={formatCents(totalRevenueCents)} />
          <InfoLine label="Livraison" value={formatCents(totalShippingCents)} />
          <InfoLine label="Remises" value={formatCents(totalDiscountCents)} />
          <InfoLine label="Commandes sans montant" value={unknownAmountCount} />
        </InfoPanel>

        <InfoPanel title="Mois en cours">
          {summaries[0] ? (
            <>
              <InfoLine label="Mois" value={summaries[0].label} />
              <InfoLine label="Commandes" value={summaries[0].orderCount} />
              <InfoLine label="Ventes connues" value={formatCents(summaries[0].totalCents)} />
              <InfoLine label="Panier moyen" value={formatCents(getAverage(summaries[0]))} />
            </>
          ) : (
            <p className="text-sm text-gray-400">Aucune commande pour le moment.</p>
          )}
        </InfoPanel>

        <InfoPanel title="Visiteurs actifs">
          {visitorsResult.rows.length === 0 ? (
            <p className="text-sm text-gray-400">
              Personne en ligne sur les 2 dernieres minutes.
            </p>
          ) : (
            <div className="space-y-2">
              {visitorsResult.rows.slice(0, 5).map((visitor) => (
                <div key={visitor.visitorId} className="rounded-lg bg-white/[0.04] p-2">
                  <div className="truncate text-sm font-semibold text-white">
                    {visitor.userEmail || "Visiteur anonyme"}
                  </div>
                  <div className="truncate text-xs text-gray-500">
                    {visitor.path || "/"} - {formatDate(visitor.lastSeenAt)}
                  </div>
                </div>
              ))}
            </div>
          )}
        </InfoPanel>
      </section>

      <section className="rounded-2xl border border-white/10 bg-zinc-950/70 p-4">
        <div className="mb-4 flex items-center justify-between gap-3">
          <div>
            <h2 className="text-xl font-bold text-white">Ventes par mois</h2>
            <p className="text-sm text-gray-400">
              Les montants se remplissent automatiquement pour les nouvelles commandes.
            </p>
          </div>
        </div>

        {summaries.length === 0 ? (
          <div className="rounded-xl bg-white/[0.03] p-4 text-center text-gray-400">
            Aucune commande a analyser pour le moment.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] text-left text-sm">
              <thead className="text-xs uppercase tracking-[0.16em] text-gray-500">
                <tr className="border-b border-white/10">
                  <th className="py-3 pr-4">Mois</th>
                  <th className="py-3 pr-4">Commandes</th>
                  <th className="py-3 pr-4">Ventes connues</th>
                  <th className="py-3 pr-4">Panier moyen</th>
                  <th className="py-3 pr-4">Livraison</th>
                  <th className="py-3 pr-4">Remises</th>
                  <th className="py-3">Sans montant</th>
                </tr>
              </thead>
              <tbody>
                {summaries.map((month) => (
                  <tr key={month.key} className="border-b border-white/5 text-gray-200">
                    <td className="py-3 pr-4 font-semibold text-white">{month.label}</td>
                    <td className="py-3 pr-4">{month.orderCount}</td>
                    <td className="py-3 pr-4">{formatCents(month.totalCents)}</td>
                    <td className="py-3 pr-4">{formatCents(getAverage(month))}</td>
                    <td className="py-3 pr-4">{formatCents(month.shippingCents)}</td>
                    <td className="py-3 pr-4">{formatCents(month.discountCents)}</td>
                    <td className="py-3">{month.unknownAmountCount}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
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

function buildMonthlySummaries(
  orderRows: OrderRow[],
  analyticsByOrderId: Map<string, OrderAnalyticsRow>,
) {
  const months = new Map<string, MonthSummary>();

  for (const order of orderRows) {
    const key = getMonthKey(order.createdAt);
    const current =
      months.get(key) ??
      ({
        key,
        label: getMonthLabel(key),
        orderCount: 0,
        knownOrderCount: 0,
        totalCents: 0,
        subtotalCents: 0,
        shippingCents: 0,
        discountCents: 0,
        unknownAmountCount: 0,
      } satisfies MonthSummary);
    const analytics = analyticsByOrderId.get(order.id);

    current.orderCount += 1;

    if (analytics?.amountTotalCents != null) {
      current.knownOrderCount += 1;
      current.totalCents += analytics.amountTotalCents;
      current.subtotalCents += analytics.amountSubtotalCents ?? 0;
      current.shippingCents += analytics.shippingTotalCents ?? 0;
      current.discountCents += analytics.discountTotalCents ?? 0;
    } else {
      current.unknownAmountCount += 1;
    }

    months.set(key, current);
  }

  return Array.from(months.values()).sort((a, b) => b.key.localeCompare(a.key));
}

function getAverage(month: MonthSummary) {
  if (month.knownOrderCount === 0) return 0;
  return Math.round(month.totalCents / month.knownOrderCount);
}

function getMonthKey(value: Date | string) {
  const date = new Date(value);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

function getMonthLabel(key: string) {
  const [year, month] = key.split("-").map(Number);
  return new Date(year, month - 1, 1).toLocaleDateString("fr-FR", {
    month: "long",
    year: "numeric",
  });
}

function formatDate(value: Date | string) {
  return new Date(value).toLocaleTimeString("fr-FR", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function StatCard({
  label,
  value,
  tone = "violet",
}: {
  label: string;
  value: string;
  tone?: "violet" | "emerald";
}) {
  const classes =
    tone === "emerald"
      ? "border-emerald-400/20 bg-emerald-500/10 text-emerald-200"
      : "border-violet-400/20 bg-violet-500/10 text-violet-200";

  return (
    <div className={`rounded-xl border p-4 ${classes}`}>
      <div className="text-sm">{label}</div>
      <div className="mt-1 text-2xl font-bold text-white">{value}</div>
    </div>
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

function InfoLine({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3 text-sm">
      <span className="text-gray-400">{label}</span>
      <span className="text-right font-semibold text-white">{value}</span>
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
