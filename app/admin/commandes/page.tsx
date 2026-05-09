import { redirect } from "next/navigation";
import { desc } from "drizzle-orm";
import AdminMenu from "@/components/AdminMenu";
import LogoutButton from "@/components/LogoutButton";
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

      <AdminMenu active="commandes" className="mb-6" />

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

              <p className="mt-3 text-sm text-yellow-300">
                Bordereau a creer manuellement sur Mondial Relay.
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
