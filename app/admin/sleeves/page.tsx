import Link from "next/link";
import { redirect } from "next/navigation";
import AdminSleeveManager from "@/components/AdminSleeveManager";
import LogoutButton from "@/components/LogoutButton";
import { isAdmin } from "@/lib/admin/auth";
import { getSleeves } from "@/lib/sleeves";

export const dynamic = "force-dynamic";

export default async function AdminSleevesPage() {
  if (!(await isAdmin())) redirect("/admin/login");

  const sleeveRows = await getSleeves();
  const activeCount = sleeveRows.filter((sleeve) => sleeve.active).length;
  const totalStock = sleeveRows.reduce((total, sleeve) => total + sleeve.stock, 0);

  return (
    <div className="py-6">
      <div className="mb-6 flex items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-white">Admin - Sleeves</h1>
          <p className="mt-1 text-sm text-gray-400">
            {activeCount} sleeve{activeCount > 1 ? "s" : ""} visible
            {activeCount > 1 ? "s" : ""}, {totalStock} exemplaire
            {totalStock > 1 ? "s" : ""} en stock.
          </p>
        </div>

        <LogoutButton />
      </div>

      <div className="mb-6 flex flex-wrap gap-3">
        <Link
          href="/admin"
          className="rounded bg-white/10 px-4 py-2 text-sm text-white hover:bg-white/20"
        >
          Stocks cartes
        </Link>
        <Link
          href="/admin/commandes"
          className="rounded bg-white/10 px-4 py-2 text-sm text-white hover:bg-white/20"
        >
          Commandes
        </Link>
        <Link
          href="/sleeve"
          className="rounded bg-violet-600 px-4 py-2 text-sm font-medium text-white hover:bg-violet-700"
        >
          Voir la page sleeve
        </Link>
      </div>

      <AdminSleeveManager sleeves={sleeveRows} />
    </div>
  );
}
