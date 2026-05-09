import { redirect } from "next/navigation";
import AdminMenu from "@/components/AdminMenu";
import AdminTicketsList from "@/components/AdminTicketsList";
import LogoutButton from "@/components/LogoutButton";
import { isAdmin } from "@/lib/admin/auth";
import { getDb } from "@/lib/db/client";
import { tickets } from "@/lib/db/schema";
import { desc } from "drizzle-orm";

export const dynamic = "force-dynamic";

type Ticket = {
  id: string;
  subject: string;
  email: string;
  name: string | null;
  phone: string | null;
  message: string;
  status: string;
  adminResponse: string | null;
  createdAt: Date;
  updatedAt: Date;
};

export default async function AdminTicketsPage() {
  if (!(await isAdmin())) redirect("/admin/login");

  let rows: Ticket[] = [];
  let dbError: string | null = null;
  try {
    const db = getDb();
    rows = (await db
      .select()
      .from(tickets)
      .orderBy(desc(tickets.createdAt))) as Ticket[];
  } catch (e) {
    dbError = e instanceof Error ? e.message : "Erreur DB";
  }

  return (
    <div className="py-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold text-white">Admin - Tickets</h1>
          <p className="text-sm text-gray-400 mt-1">
            Demandes recues via le formulaire de contact.
          </p>
        </div>
        <LogoutButton />
      </div>

      <AdminMenu active="tickets" className="mb-6" />

      {dbError && (
        <p className="rounded bg-red-500/10 border border-red-500/30 text-red-300 p-3 text-sm">
          {dbError}
        </p>
      )}

      <AdminTicketsList initial={rows} />
    </div>
  );
}
