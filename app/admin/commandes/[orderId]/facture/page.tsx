import { notFound, redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import OrderInvoice from "@/components/OrderInvoice";
import { isAdmin } from "@/lib/admin/auth";
import { getDb } from "@/lib/db/client";
import { orders } from "@/lib/db/schema";
import { buildOrderContents } from "@/lib/order-contents";

export const dynamic = "force-dynamic";

export default async function AdminOrderInvoicePage({
  params,
}: {
  params: Promise<{ orderId: string }>;
}) {
  if (!(await isAdmin())) redirect("/admin/login");

  const { orderId } = await params;
  const db = getDb();
  const [order] = await db
    .select()
    .from(orders)
    .where(eq(orders.id, decodeURIComponent(orderId)))
    .limit(1);

  if (!order) notFound();

  const contents = await buildOrderContents([order]);

  return (
    <div className="min-h-screen bg-zinc-100 py-8 print:bg-white print:py-0">
      <OrderInvoice
        order={order}
        content={contents.get(order.id)}
        backHref="/admin/commandes"
      />
    </div>
  );
}
