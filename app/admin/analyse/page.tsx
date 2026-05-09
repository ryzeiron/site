import Link from "next/link";
import { redirect } from "next/navigation";
import { sql } from "drizzle-orm";
import LogoutButton from "@/components/LogoutButton";
import { isAdmin } from "@/lib/admin/auth";
import { getDb } from "@/lib/db/client";
import { orders, siteVisits, tickets, users } from "@/lib/db/schema";

export const dynamic = "force-dynamic";

type Metric = {
  label: string;
  value: number;
  help: string;
};

type PopularPage = {
  path: string;
  visits: number;
};


export default async function AdminAnalysePage() {
  if (!(await isAdmin())) redirect("/admin/login");

  let metrics: Metric[] = [];
  let popularPages: PopularPage[] = [];
  let dbError: string | null = null;

  try {
    const db = getDb();
    const [visitsAll] = await db
      .select({ value: sql<number>`count(*)` })
      .from(siteVisits);
    const [uniqueVisitorsAll] = await db
      .select({ value: sql<number>`count(distinct ${siteVisits.visitorId})` })
      .from(siteVisits);
    const [visitsToday] = await db
      .select({ value: sql<number>`count(*)` })
      .from(siteVisits)
      .where(sql`${siteVisits.createdAt} >= date_trunc('day', now())`);
    const [uniqueVisitorsToday] = await db
      .select({ value: sql<number>`count(distinct ${siteVisits.visitorId})` })
      .from(siteVisits)
      .where(sql`${siteVisits.createdAt} >= date_trunc('day', now())`);
    const [visitsSevenDays] = await db
      .select({ value: sql<number>`count(*)` })
      .from(siteVisits)
      .where(sql`${siteVisits.createdAt} >= now() - interval '7 days'`);
    const [ordersToday] = await db
      .select({ value: sql<number>`count(*)` })
      .from(orders)
      .where(sql`${orders.createdAt} >= date_trunc('day', now())`);

    const [totalOrdersRow] = await db
      .select({ value: sql<number>`count(*)` })
      .from(orders);
    const [totalUsersRow] = await db
      .select({ value: sql<number>`count(*)` })
      .from(users);
    const openTicketsRows = await db
      .select({ value: sql<number>`count(*)` })
      .from(tickets)
      .where(sql`${tickets.status} = 'open'`);

    metrics = [
      {
        label: "Visites totales",
        value: Number(visitsAll?.value ?? 0),
        help: "Nombre total de pages vues enregistrees.",
      },
      {
        label: "Visiteurs uniques",
        value: Number(uniqueVisitorsAll?.value ?? 0),
        help: "Estimation basee sur un identifiant anonyme stocke dans le navigateur.",
      },
      {
        label: "Visites aujourd'hui",
        value: Number(visitsToday?.value ?? 0),
        help: "Pages vues depuis minuit, heure de la base de donnees.",
      },
      {
        label: "Visiteurs aujourd'hui",
        value: Number(uniqueVisitorsToday?.value ?? 0),
        help: "Visiteurs uniques estimes sur la journee.",
      },
      {
        label: "Visites 7 jours",
        value: Number(visitsSevenDays?.value ?? 0),
        help: "Pages vues sur les sept derniers jours.",
      },
      {
        label: "Commandes totales",
        value: Number(totalOrdersRow?.value ?? 0),
        help: "Commandes enregistrees apres paiement Stripe.",
      },
      {
        label: "Commandes aujourd'hui",
        value: Number(ordersToday?.value ?? 0),
        help: "Commandes creees depuis minuit.",
      },
      {
        label: "Comptes clients",
        value: Number(totalUsersRow?.value ?? 0),
        help: "Nombre de comptes inscrits.",
      },
      {
        label: "Tickets ouverts",
        value: Number(openTicketsRows[0]?.value ?? 0),
        help: "Demandes de contact encore a traiter.",
      },
    ];

    popularPages = (await db
      .select({
        path: siteVisits.path,
        visits: sql<number>`count(*)`,
      })
      .from(siteVisits)
      .groupBy(siteVisits.path)
      .orderBy(sql`count(*) desc`)
      .limit(10)) as PopularPage[];
  } catch (e) {
    dbError = e instanceof Error ? e.message : "Erreur DB";
  }

  return (
    <div className="py-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold text-white">Admin - Analyse</h1>
          <p className="text-sm text-gray-400 mt-1">
            Suivi des visites, des commandes et des actions importantes du site.
          </p>
        </div>
        <LogoutButton />
      </div>

      <div className="mb-6 flex flex-wrap gap-3">
        <Link
          href="/admin"
          className="rounded bg-white/10 hover:bg-white/20 text-white px-4 py-2 text-sm"
        >
          Stocks
        </Link>
        <Link
          href="/admin/commandes"
          className="rounded bg-white/10 hover:bg-white/20 text-white px-4 py-2 text-sm"
        >
          Commandes
        </Link>
        <Link
          href="/admin/tickets"
          className="rounded bg-white/10 hover:bg-white/20 text-white px-4 py-2 text-sm"
        >
          Tickets
        </Link>
      </div>

      {dbError ? (
        <div className="rounded bg-red-500/10 border border-red-500/30 text-red-300 p-4 text-sm">
          <p className="font-semibold">Impossible de charger les statistiques.</p>
          <p className="mt-1">{dbError}</p>
          <p className="mt-3 text-red-200">
            Si la table de suivi vient d'etre ajoutee, lance la synchronisation de
            schema Drizzle avant de consulter cette page.
          </p>
        </div>
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {metrics.map((metric) => (
              <div
                key={metric.label}
                className="rounded-lg border border-white/10 bg-zinc-900/70 p-5"
              >
                <div className="text-sm text-gray-400">{metric.label}</div>
                <div className="mt-2 text-3xl font-bold text-white">
                  {metric.value.toLocaleString("fr-FR")}
                </div>
                <p className="mt-2 text-xs text-gray-500">{metric.help}</p>
              </div>
            ))}
          </div>

          <div className="mt-8 rounded-lg border border-white/10 bg-zinc-900/70 p-5">
            <h2 className="text-xl font-semibold text-white">Pages les plus vues</h2>
            <p className="text-sm text-gray-400 mt-1">
              Classement base sur les visites enregistrees par le navigateur.
            </p>

            {popularPages.length === 0 ? (
              <p className="mt-4 text-gray-400">Aucune visite enregistree.</p>
            ) : (
              <div className="mt-4 overflow-x-auto">
                <table className="w-full text-left text-sm text-gray-200">
                  <thead className="text-xs uppercase text-gray-500">
                    <tr>
                      <th className="py-2 pr-4">Page</th>
                      <th className="py-2 text-right">Visites</th>
                    </tr>
                  </thead>
                  <tbody>
                    {popularPages.map((page) => (
                      <tr key={page.path} className="border-t border-white/10">
                        <td className="py-3 pr-4 font-mono text-xs text-gray-300">
                          {page.path}
                        </td>
                        <td className="py-3 text-right font-semibold text-white">
                          {Number(page.visits).toLocaleString("fr-FR")}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
