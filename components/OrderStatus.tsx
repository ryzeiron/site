import Link from "next/link";
import type Stripe from "stripe";
import { eq } from "drizzle-orm";
import { getStripe } from "@/lib/stripe";
import { getDb } from "@/lib/db/client";
import { orders } from "@/lib/db/schema";
import { formatPrice } from "@/lib/format";
import SuccessClearCart from "@/components/SuccessClearCart";

type OrderRow = typeof orders.$inferSelect;

type RelayInfo = {
  code: string | null;
  name: string | null;
  address: string | null;
  postcode: string | null;
  city: string | null;
};

type OrderLookup = {
  session: Stripe.Checkout.Session | null;
  lineItems: Stripe.LineItem[];
  order: OrderRow | null;
};

const STATUS_LABELS: Record<string, { title: string; detail: string }> = {
  paid: {
    title: "Paiement recu",
    detail: "Ta commande est enregistree et va etre preparee.",
  },
  label_to_create: {
    title: "Preparation de l'expedition",
    detail: "La commande est payee. Le bordereau Mondial Relay va etre cree.",
  },
  label_created: {
    title: "Expedition prete",
    detail: "Le bordereau est cree. Le colis peut etre depose en point relais.",
  },
  shipped: {
    title: "Colis expedie",
    detail: "Le colis est en route vers le point relais choisi.",
  },
};

async function getOrder(sessionId: string): Promise<OrderLookup> {
  let session: Stripe.Checkout.Session | null = null;
  let lineItems: Stripe.LineItem[] = [];
  let order: OrderRow | null = null;

  try {
    const stripe = getStripe();
    session = await stripe.checkout.sessions.retrieve(sessionId);
    const items = await stripe.checkout.sessions.listLineItems(sessionId, {
      limit: 100,
    });
    lineItems = items.data;
  } catch {
    session = null;
  }

  try {
    const db = getDb();
    const rows = await db
      .select()
      .from(orders)
      .where(eq(orders.stripeSessionId, sessionId))
      .limit(1);

    order = rows[0] ?? null;
  } catch {
    order = null;
  }

  return { session, lineItems, order };
}

function getRelay(
  session: Stripe.Checkout.Session | null,
  order: OrderRow | null,
): RelayInfo {
  const metadata = session?.metadata ?? {};

  return {
    code: order?.relayCode ?? metadata.relay_code ?? null,
    name: order?.relayName ?? metadata.relay_name ?? null,
    address: order?.relayAddress ?? metadata.relay_address ?? null,
    postcode: order?.relayPostcode ?? metadata.relay_postcode ?? null,
    city: order?.relayCity ?? metadata.relay_city ?? null,
  };
}

function getStatus(
  order: OrderRow | null,
  session: Stripe.Checkout.Session | null,
) {
  if (order?.status && STATUS_LABELS[order.status]) {
    return STATUS_LABELS[order.status];
  }

  if (session?.payment_status === "paid") {
    return STATUS_LABELS.paid;
  }

  return {
    title: "Commande en verification",
    detail:
      "Le paiement est en cours de verification. Reviens dans quelques instants.",
  };
}

export default async function OrderStatus({
  sessionId,
  clearCart = false,
}: {
  sessionId: string;
  clearCart?: boolean;
}) {
  const { session, lineItems, order } = await getOrder(sessionId);
  const relay = getRelay(session, order);
  const status = getStatus(order, session);
  const total = session?.amount_total ? session.amount_total / 100 : null;
  const createdAt =
    order?.createdAt ?? (session?.created ? new Date(session.created * 1000) : null);

  if (!session && !order) {
    return (
      <div className="py-16 text-center">
        <h1 className="text-3xl font-bold text-white">Suivi de commande</h1>
        <p className="mt-3 max-w-xl mx-auto text-gray-300">
          Cette commande est introuvable pour le moment. Si tu viens juste de
          payer, attends quelques secondes puis recharge la page.
        </p>
        <Link
          href="/contact"
          className="mt-8 inline-block rounded-full bg-brand-500 hover:bg-brand-600 text-white px-6 py-3 font-medium"
        >
          Contacter la boutique
        </Link>
      </div>
    );
  }

  return (
    <div className="py-10">
      {clearCart ? <SuccessClearCart /> : null}

      <div className="text-center">
        <h1 className="text-3xl font-bold text-white">Suivi de commande</h1>
        <p className="mt-3 text-gray-300">
          Reference :{" "}
          <span className="font-mono text-gray-100">{sessionId}</span>
        </p>
      </div>

      <section className="mt-8 rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-5">
        <div className="text-xs uppercase tracking-wider text-emerald-300 font-semibold">
          Statut
        </div>
        <h2 className="mt-2 text-2xl font-bold text-white">{status.title}</h2>
        <p className="mt-2 text-emerald-100/80">{status.detail}</p>
      </section>

      <div className="mt-6 grid gap-6 md:grid-cols-2">
        <section className="rounded-lg border border-white/10 bg-zinc-900/70 p-5">
          <h2 className="text-lg font-semibold text-white">Commande</h2>
          <dl className="mt-4 space-y-3 text-sm">
            {createdAt ? (
              <div>
                <dt className="text-gray-400">Date</dt>
                <dd className="text-gray-100">
                  {createdAt.toLocaleString("fr-FR")}
                </dd>
              </div>
            ) : null}

            {total !== null ? (
              <div>
                <dt className="text-gray-400">Total</dt>
                <dd className="text-gray-100">{formatPrice(total)}</dd>
              </div>
            ) : null}

            {session?.customer_details?.email || order?.customerEmail ? (
              <div>
                <dt className="text-gray-400">Email</dt>
                <dd className="text-gray-100">
                  {order?.customerEmail ?? session?.customer_details?.email}
                </dd>
              </div>
            ) : null}
          </dl>
        </section>

        <section className="rounded-lg border border-white/10 bg-zinc-900/70 p-5">
          <h2 className="text-lg font-semibold text-white">Point relais</h2>

          {relay.code ? (
            <div className="mt-4 text-sm text-gray-100">
              {relay.name ? (
                <div className="font-semibold">{relay.name}</div>
              ) : null}

              {relay.address ? <div className="mt-1">{relay.address}</div> : null}

              {relay.postcode || relay.city ? (
                <div>
                  {relay.postcode} {relay.city}
                </div>
              ) : null}

              <div className="mt-3 text-xs text-gray-400">
                Code Mondial Relay : {relay.code}
              </div>
            </div>
          ) : (
            <p className="mt-4 text-sm text-gray-300">
              Les informations de point relais ne sont pas encore disponibles.
            </p>
          )}
        </section>
      </div>

      {lineItems.length > 0 ? (
        <section className="mt-6 rounded-lg border border-white/10 bg-zinc-900/70 p-5">
          <h2 className="text-lg font-semibold text-white">Articles</h2>

          <div className="mt-4 divide-y divide-white/10">
            {lineItems.map((item) => (
              <div
                key={item.id}
                className="flex items-center justify-between gap-4 py-3 text-sm"
              >
                <div className="text-gray-100">{item.description}</div>
                <div className="shrink-0 text-gray-300">x{item.quantity}</div>
              </div>
            ))}
          </div>
        </section>
      ) : null}

      <div className="mt-8 flex flex-wrap justify-center gap-3">
        <Link
          href="/blocs"
          className="rounded-full bg-brand-500 hover:bg-brand-600 text-white px-6 py-3 font-medium"
        >
          Continuer mes achats
        </Link>

        <Link
          href="/contact"
          className="rounded-full bg-white/10 border border-white/20 hover:bg-white/20 text-white px-6 py-3 font-medium"
        >
          Besoin d&apos;aide
        </Link>
      </div>
    </div>
  );
}
