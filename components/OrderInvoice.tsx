import PrintInvoiceButton from "@/components/PrintInvoiceButton";
import { formatCents } from "@/lib/format";
import type { OrderContent } from "@/lib/order-contents";

type InvoiceOrder = {
  id: string;
  stripeSessionId: string;
  customerEmail: string | null;
  customerName: string | null;
  customerPhone: string | null;
  relayName: string | null;
  relayAddress: string | null;
  relayPostcode: string | null;
  relayCity: string | null;
  relayCode: string | null;
  createdAt: Date;
};

function invoiceNumber(order: InvoiceOrder) {
  const year = new Date(order.createdAt).getFullYear();
  return `PD-${year}-${order.id.slice(-8).toUpperCase()}`;
}

function invoiceDate(order: InvoiceOrder) {
  return new Date(order.createdAt).toLocaleDateString("fr-FR", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
}

function sellerLines() {
  return [
    process.env.INVOICE_SELLER_NAME || "PokeDel62",
    process.env.INVOICE_SELLER_ADDRESS,
    process.env.INVOICE_SELLER_POSTCODE_CITY,
    process.env.INVOICE_SELLER_SIRET
      ? `SIRET : ${process.env.INVOICE_SELLER_SIRET}`
      : null,
    process.env.INVOICE_SELLER_EMAIL || "contact@pokedel62.fr",
  ].filter((line): line is string => Boolean(line));
}

export default function OrderInvoice({
  order,
  content,
  backHref,
}: {
  order: InvoiceOrder;
  content?: OrderContent;
  backHref: string;
}) {
  const visibleTotalCents =
    content?.orderTotalCents ??
    (content
      ? content.itemsTotalCents +
        (content.shippingTotalCents ?? 0) -
        content.discountTotalCents
      : 0);

  return (
    <main className="mx-auto max-w-4xl bg-white p-6 text-zinc-950 shadow-2xl print:max-w-none print:shadow-none sm:p-10">
      <div className="mb-8 flex flex-wrap items-start justify-between gap-4 print:hidden">
        <a
          href={backHref}
          className="rounded-full border border-zinc-300 px-4 py-2 text-sm font-semibold text-zinc-800 transition hover:bg-zinc-100"
        >
          Retour
        </a>
        <PrintInvoiceButton />
      </div>

      <header className="flex flex-wrap items-start justify-between gap-8 border-b border-zinc-200 pb-8">
        <div>
          <div className="text-3xl font-black tracking-tight">Facture</div>
          <div className="mt-3 text-sm text-zinc-600">
            <div>Numero : {invoiceNumber(order)}</div>
            <div>Date : {invoiceDate(order)}</div>
            <div>Commande : {order.stripeSessionId}</div>
          </div>
        </div>

        <div className="text-right text-sm">
          {sellerLines().map((line) => (
            <div key={line}>{line}</div>
          ))}
        </div>
      </header>

      <section className="grid gap-6 border-b border-zinc-200 py-8 sm:grid-cols-2">
        <div>
          <h2 className="text-xs font-bold uppercase tracking-[0.18em] text-zinc-500">
            Client
          </h2>
          <div className="mt-3 text-sm">
            <div className="font-bold">{order.customerName ?? "Client"}</div>
            {order.customerEmail && <div>{order.customerEmail}</div>}
            {order.customerPhone && <div>{order.customerPhone}</div>}
          </div>
        </div>

        <div>
          <h2 className="text-xs font-bold uppercase tracking-[0.18em] text-zinc-500">
            Livraison
          </h2>
          <div className="mt-3 text-sm">
            <div className="font-bold">{order.relayName ?? "Point relais"}</div>
            {order.relayAddress && <div>{order.relayAddress}</div>}
            {(order.relayPostcode || order.relayCity) && (
              <div>
                {order.relayPostcode} {order.relayCity}
              </div>
            )}
            {order.relayCode && (
              <div className="mt-1 text-zinc-500">Code : {order.relayCode}</div>
            )}
          </div>
        </div>
      </section>

      <section className="py-8">
        <table className="w-full border-collapse text-left text-sm">
          <thead>
            <tr className="border-b border-zinc-300 text-xs uppercase tracking-[0.14em] text-zinc-500">
              <th className="py-3 pr-3">Article</th>
              <th className="py-3 pr-3 text-right">Qté</th>
              <th className="py-3 pr-3 text-right">Prix unit.</th>
              <th className="py-3 text-right">Total</th>
            </tr>
          </thead>
          <tbody>
            {content?.cardGroups.flatMap((group) =>
              group.lines.map((line) => (
                <tr key={`card:${line.key}`} className="border-b border-zinc-100">
                  <td className="py-3 pr-3">
                    <div className="font-semibold">{line.name}</div>
                    <div className="text-xs text-zinc-500">
                      {group.serieName} - {line.number} - {line.rarity}
                    </div>
                  </td>
                  <td className="py-3 pr-3 text-right">{line.quantity}</td>
                  <td className="py-3 pr-3 text-right">
                    {formatCents(line.unitPriceCents)}
                  </td>
                  <td className="py-3 text-right font-semibold">
                    {formatCents(line.lineTotalCents)}
                  </td>
                </tr>
              )),
            )}

            {content?.sleeveLines.map((line) => (
              <tr key={`sleeve:${line.key}`} className="border-b border-zinc-100">
                <td className="py-3 pr-3">
                  <div className="font-semibold">{line.name}</div>
                  <div className="text-xs text-zinc-500">Sleeve</div>
                </td>
                <td className="py-3 pr-3 text-right">{line.quantity}</td>
                <td className="py-3 pr-3 text-right">
                  {formatCents(line.unitPriceCents)}
                </td>
                <td className="py-3 text-right font-semibold">
                  {formatCents(line.lineTotalCents)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {!content || content.error ? (
          <div className="mt-4 rounded border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900">
            Le détail des articles est indisponible pour cette facture.
          </div>
        ) : null}
      </section>

      <section className="ml-auto max-w-sm space-y-2 border-t border-zinc-200 pt-5 text-sm">
        <div className="flex justify-between gap-4">
          <span>Articles</span>
          <span>{formatCents(content?.itemsTotalCents ?? 0)}</span>
        </div>
        {content && content.discountTotalCents > 0 && (
          <div className="flex justify-between gap-4 text-emerald-700">
            <span>Reduction</span>
            <span>- {formatCents(content.discountTotalCents)}</span>
          </div>
        )}
        {content?.shippingTotalCents !== null &&
          typeof content?.shippingTotalCents === "number" && (
            <div className="flex justify-between gap-4">
              <span>Livraison</span>
              <span>{formatCents(content.shippingTotalCents)}</span>
            </div>
          )}
        <div className="flex justify-between gap-4 border-t border-zinc-200 pt-3 text-lg font-black">
          <span>Total payé</span>
          <span>{formatCents(visibleTotalCents)}</span>
        </div>
      </section>

      <footer className="mt-10 border-t border-zinc-200 pt-4 text-xs text-zinc-500">
        Paiement sécurisé par Stripe. Facture générée automatiquement à partir de
        la commande validée.
      </footer>
    </main>
  );
}
