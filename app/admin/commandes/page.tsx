import Link from "next/link";
import { redirect } from "next/navigation";
import { desc, eq } from "drizzle-orm";
import LogoutButton from "@/components/LogoutButton";
import AdminOrderShippingForm from "@/components/AdminOrderShippingForm";
import { isAdmin } from "@/lib/admin/auth";
import { getDb } from "@/lib/db/client";
import { orders } from "@/lib/db/schema";

export const dynamic = "force-dynamic";

type Search = {
  status?: string;
  page?: string;
};

type OrderStatus = "paid" | "label_to_create" | "label_created" | "shipped";

const PAGE_SIZE = 25;

const STATUS_LABELS: Record<string, string> = {
  paid: "Commande payée",
  label_to_create: "Bordereau à créer",
  label_created: "Étiquette créée",
  shipped: "Colis expédié",
};

function isOrderStatus(value?: string): value is OrderStatus {
  return (
    value === "paid" ||
    value === "label_to_create" ||
    value === "label_created" ||
    value === "shipped"
  );
}

function parsePage(value?: string) {
  const page = Number.parseInt(value ?? "1", 10);
  return Number.isFinite(page) && page > 0 ? page : 1;
}

function ordersHref(status: OrderStatus | "", page = 1) {
  const params = new URLSearchParams();
  if (status) params.set("status", status);
  if (page > 1) params.set("page", String(page));
  const search = params.toString();
  return search ? `/admin/commandes?${search}` : "/admin/commandes";
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
    return "border-emerald-400/35 bg-emerald-500/15 text-emerald-200";
  }
  return "border-white/15 bg-white/10 text-gray-200";
}

export default async function AdminOrdersPage({
  searchParams,
}: {
  searchParams: Promise<Search>;
}) {
  if (!(await isAdmin())) redirect("/admin/login");

  const params = await searchParams;
  const status = isOrderStatus(params.status) ? params.status : "";
  const currentPage = parsePage(params.page);
  const offset = (currentPage - 1) * PAGE_SIZE;
  const db = getDb();
  const [rowsPlusOne, statusRows] = await Promise.all([
    status
      ? db
          .select()
          .from(orders)
          .where(eq(orders.status, status))
          .orderBy(desc(orders.createdAt))
          .limit(PAGE_SIZE + 1)
          .offset(offset)
      : db
          .select()
          .from(orders)
          .orderBy(desc(orders.createdAt))
          .limit(PAGE_SIZE + 1)
          .offset(offset),
    db.select({ status: orders.status }).from(orders),
  ]);
  const rows = rowsPlusOne.slice(0, PAGE_SIZE);
  const hasNextPage = rowsPlusOne.length > PAGE_SIZE;
  const hasPreviousPage = currentPage > 1;
  const stats = {
    paid: statusRows.filter((order) => order.status === "paid").length,
    labelToCreate: statusRows.filter((order) => order.status === "label_to_create").length,
    labelCreated: statusRows.filter((order) => order.status === "label_created").length,
    shipped: statusRows.filter((order) => order.status === "shipped").length,
  };

  return (
    <div className="py-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold text-white">Admin - Commandes</h1>
          <p className="text-sm text-gray-400 mt-1">
            Retrouve les commandes Stripe et les informations de point relais.
          </p>
        </div>

        <LogoutButton />
      </div>

      <div className="mb-6">
        <Link
          href="/admin/dashboard"
          className="rounded bg-violet-600 hover:bg-violet-700 text-white px-4 py-2 text-sm"
        >
          Accueil admin
        </Link>

        <Link
          href="/admin"
          className="ml-3 rounded bg-white/10 hover:bg-white/20 text-white px-4 py-2 text-sm"
        >
          Retour stocks
        </Link>

        <Link
          href="/admin/modifications"
          className="ml-3 rounded bg-white/10 hover:bg-white/20 text-white px-4 py-2 text-sm"
        >
          Modifications
        </Link>

        <Link
          href="/admin/clients"
          className="ml-3 rounded bg-white/10 hover:bg-white/20 text-white px-4 py-2 text-sm"
        >
          Clients
        </Link>

        <Link
          href="/admin/favoris"
          className="ml-3 rounded bg-white/10 hover:bg-white/20 text-white px-4 py-2 text-sm"
        >
          Favoris
        </Link>

        <Link
          href="/admin/avis"
          className="ml-3 rounded bg-white/10 hover:bg-white/20 text-white px-4 py-2 text-sm"
        >
          Avis
        </Link>
      </div>

      <div className="mb-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-xl border border-sky-400/20 bg-sky-500/10 p-4">
          <div className="text-sm text-sky-200">Payées</div>
          <div className="mt-1 text-3xl font-bold text-white">{stats.paid}</div>
        </div>
        <div className="rounded-xl border border-amber-400/20 bg-amber-500/10 p-4">
          <div className="text-sm text-amber-200">Bordereaux à créer</div>
          <div className="mt-1 text-3xl font-bold text-white">
            {stats.labelToCreate}
          </div>
        </div>
        <div className="rounded-xl border border-violet-400/20 bg-violet-500/10 p-4">
          <div className="text-sm text-violet-200">Étiquettes créées</div>
          <div className="mt-1 text-3xl font-bold text-white">
            {stats.labelCreated}
          </div>
        </div>
        <div className="rounded-xl border border-emerald-400/20 bg-emerald-500/10 p-4">
          <div className="text-sm text-emerald-200">Expédiées</div>
          <div className="mt-1 text-3xl font-bold text-white">
            {stats.shipped}
          </div>
        </div>
      </div>

      <div className="mb-6 flex flex-wrap items-center gap-2 rounded-2xl border border-white/10 bg-zinc-950/65 p-3">
        {[
          { value: "", label: "Toutes" },
          { value: "paid", label: "Payées" },
          { value: "label_to_create", label: "Bordereau à créer" },
          { value: "label_created", label: "Étiquette créée" },
          { value: "shipped", label: "Expédiées" },
        ].map((item) => (
          <Link
            key={item.value || "all"}
            href={ordersHref(item.value as OrderStatus | "")}
            className={`rounded-full px-3 py-1.5 text-sm font-medium ${
              status === item.value
                ? "bg-violet-600 text-white"
                : "bg-white/10 text-gray-200 hover:bg-white/20"
            }`}
          >
            {item.label}
          </Link>
        ))}
      </div>

      {rows.length === 0 ? (
        <p className="text-gray-400">Aucune commande pour le moment.</p>
      ) : (
        <div className="space-y-3">
          {rows.map((order) => (
            <div
              key={order.id}
              className="rounded-2xl border border-white/10 bg-zinc-900/70 p-4 text-gray-200"
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <div className="font-semibold text-white">
                    {order.customerName ?? "Client"}
                  </div>

                  <div className="text-xs text-gray-400">
                    {order.customerEmail}
                  </div>

                  <div className="text-xs text-gray-400">
                    {order.customerPhone}
                  </div>
                </div>

                <div className="text-right">
                  <div className="text-xs text-gray-400">
                    {order.createdAt
                      ? new Date(order.createdAt).toLocaleString("fr-FR")
                      : ""}
                  </div>
                  <span
                    className={`mt-2 inline-flex rounded-full border px-3 py-1 text-xs font-semibold ${statusClass(order.status)}`}
                  >
                    {STATUS_LABELS[order.status] ?? order.status}
                  </span>
                </div>
              </div>

              <div className="mt-3 text-sm">
                <div>
                  <span className="text-gray-400">Pays :</span> {order.country}
                </div>

                <div>
                  <span className="text-gray-400">Point relais :</span>{" "}
                  {order.relayName ?? "-"}
                </div>

                <div>
                  <span className="text-gray-400">Code relais :</span>{" "}
                  {order.relayCode ?? "-"}
                </div>

                <div>
                  <span className="text-gray-400">Adresse relais :</span>{" "}
                  {order.relayAddress ?? "-"} {order.relayPostcode ?? ""}{" "}
                  {order.relayCity ?? ""}
                </div>

                <div className="mt-2 text-xs text-gray-500">
                  ID commande : <span className="font-mono">{order.id}</span>
                </div>
              </div>

              {order.mondialRelayExpeditionNumber && (
                <div className="mt-3 text-sm text-emerald-300">
                  Expédition Mondial Relay :{" "}
                  {order.mondialRelayExpeditionNumber}
                </div>
              )}

              {order.mondialRelayLabelUrl ? (
                <a
                  href={order.mondialRelayLabelUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-3 inline-block rounded bg-brand-500 hover:bg-brand-600 text-white px-4 py-2 text-sm"
                >
                  Télécharger le bordereau
                </a>
              ) : (
                <p className="mt-3 text-sm text-yellow-300">
                  Bordereau à créer manuellement sur Mondial Relay.
                </p>
              )}

              {order.mondialRelayError && (
                <pre className="mt-3 whitespace-pre-wrap rounded bg-red-500/10 border border-red-500/30 p-3 text-xs text-red-200">
                  {order.mondialRelayError}
                </pre>
              )}

              <AdminOrderShippingForm
                orderId={order.id}
                initialStatus={order.status}
                initialExpeditionNumber={order.mondialRelayExpeditionNumber}
                initialLabelUrl={order.mondialRelayLabelUrl}
              />
            </div>
          ))}

          {(hasPreviousPage || hasNextPage) && (
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-white/10 bg-zinc-950/65 p-4 text-sm text-gray-300">
              <span>Page {currentPage}</span>
              <div className="flex gap-2">
                <Link
                  href={ordersHref(status, Math.max(1, currentPage - 1))}
                  aria-disabled={!hasPreviousPage}
                  className={`rounded-full px-3 py-1.5 font-medium ${
                    hasPreviousPage
                      ? "bg-white/10 text-white hover:bg-white/20"
                      : "pointer-events-none bg-white/5 text-gray-600"
                  }`}
                >
                  Précédent
                </Link>
                <Link
                  href={ordersHref(status, currentPage + 1)}
                  aria-disabled={!hasNextPage}
                  className={`rounded-full px-3 py-1.5 font-medium ${
                    hasNextPage
                      ? "bg-white/10 text-white hover:bg-white/20"
                      : "pointer-events-none bg-white/5 text-gray-600"
                  }`}
                >
                  Suivant
                </Link>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
