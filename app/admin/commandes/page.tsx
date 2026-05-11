import Link from "next/link";
import { redirect } from "next/navigation";
import { desc } from "drizzle-orm";
import LogoutButton from "@/components/LogoutButton";
import AdminOrderShippingForm from "@/components/AdminOrderShippingForm";
import { isAdmin } from "@/lib/admin/auth";
import { getDb } from "@/lib/db/client";
import { orders } from "@/lib/db/schema";

export const dynamic = "force-dynamic";

export default async function AdminOrdersPage() {
  if (!(await isAdmin())) redirect("/admin/login");

  const db = getDb();
  const rows = await db.select().from(orders).orderBy(desc(orders.createdAt));

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
          href="/admin"
          className="rounded bg-white/10 hover:bg-white/20 text-white px-4 py-2 text-sm"
        >
          Retour stocks
        </Link>
      </div>

      {rows.length === 0 ? (
        <p className="text-gray-400">Aucune commande pour le moment.</p>
      ) : (
        <div className="space-y-3">
          {rows.map((order) => (
            <div
              key={order.id}
              className="rounded-lg border border-white/10 bg-zinc-900/70 p-4 text-gray-200"
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

                <div className="text-xs text-gray-400">
                  {order.createdAt
                    ? new Date(order.createdAt).toLocaleString("fr-FR")
                    : ""}
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

                <div>
                  <span className="text-gray-400">Statut :</span> {order.status}
                </div>
              </div>

              {order.mondialRelayExpeditionNumber && (
                <div className="mt-3 text-sm text-emerald-300">
                  Expedition Mondial Relay :{" "}
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
                  Telecharger le bordereau
                </a>
              ) : (
                <p className="mt-3 text-sm text-yellow-300">
                  Bordereau a creer manuellement sur Mondial Relay.
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
        </div>
      )}
    </div>
  );
}
