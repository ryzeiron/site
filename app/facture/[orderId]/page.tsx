import { notFound, redirect } from "next/navigation";
import { and, eq, or } from "drizzle-orm";
import OrderInvoice from "@/components/OrderInvoice";
import { auth } from "@/lib/auth";
import { getDb } from "@/lib/db/client";
import { orders } from "@/lib/db/schema";
import { buildOrderContents } from "@/lib/order-contents";

export const dynamic = "force-dynamic";

export default async function CustomerOrderInvoicePage({
  params,
}: {
  params: Promise<{ orderId: string }>;
}) {
  const session = await auth();
  if (!session?.user) redirect("/connexion?callbackUrl=/compte?section=commandes");

  const { orderId } = await params;
  const db = getDb();
  const [order] = await db
    .select()
    .from(orders)
    .where(
      and(
        eq(orders.id, decodeURIComponent(orderId)),
        or(
          eq(orders.userId, session.user.id),
          eq(orders.customerEmail, session.user.email),
        ),
      ),
    )
    .limit(1);

  if (!order) notFound();

  const contents = await buildOrderContents([order]);

  return (
    <div className="min-h-screen bg-zinc-100 py-8 print:bg-white print:py-0">
      <OrderInvoice
        order={order}
        content={contents.get(order.id)}
        backHref="/compte?section=commandes"
      />
    </div>
  );
}
