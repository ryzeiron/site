import Link from "next/link";
import { redirect } from "next/navigation";
import type Stripe from "stripe";
import { desc, eq } from "drizzle-orm";
import LogoutButton from "@/components/LogoutButton";
import AdminOrderShippingForm from "@/components/AdminOrderShippingForm";
import { isAdmin } from "@/lib/admin/auth";
import {
  BLOCS,
  SERIES,
  getBloc,
  getCard,
  getSerie,
  resolveVariant,
  type Card,
  type VariantKey,
} from "@/lib/catalog";
import { getDb } from "@/lib/db/client";
import { orders } from "@/lib/db/schema";
import { formatRarityLabel } from "@/lib/display-variants";
import { getSleevesByIds, type SleeveProduct } from "@/lib/sleeves";
import { applyStockOverrides } from "@/lib/stock";
import { getStripe } from "@/lib/stripe";

export const dynamic = "force-dynamic";

type Search = {
  status?: string;
  page?: string;
};

type OrderStatus =
  | "paid"
  | "label_to_create"
  | "label_created"
  | "shipped"
  | "picked_up";

const PAGE_SIZE = 25;

type CompactItem = [string, VariantKey, number];
type CompactSleeveItem = [string, number];
type OrderRow = typeof orders.$inferSelect;

type CardOrderLine = {
  type: "card";
  key: string;
  cardId: string;
  variant: VariantKey;
  quantity: number;
  card?: Card;
  name: string;
  number: string;
  image?: string;
  blocName: string;
  blocOrder: number;
  serieName: string;
  serieCode: string;
  serieOrder: number;
  rarity: string;
  condition: string;
};

type SleeveOrderLine = {
  type: "sleeve";
  key: string;
  sleeveId: string;
  quantity: number;
  name: string;
  image?: string | null;
};

type OrderContent = {
  cardGroups: {
    key: string;
    blocName: string;
    serieName: string;
    serieCode: string;
    lines: CardOrderLine[];
  }[];
  sleeveLines: SleeveOrderLine[];
  totalQuantity: number;
  error?: string;
};

type StripeOrderMetadata = {
  metadata: Stripe.Metadata | null;
  error?: string;
};

const STATUS_LABELS: Record<string, string> = {
  paid: "Commande payée",
  label_to_create: "Bordereau à créer",
  label_created: "Étiquette créée",
  shipped: "Colis expédié",
  picked_up: "Colis retiré",
};

function isOrderStatus(value?: string): value is OrderStatus {
  return (
    value === "paid" ||
    value === "label_to_create" ||
    value === "label_created" ||
    value === "shipped" ||
    value === "picked_up"
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
  if (status === "picked_up") {
    return "border-fuchsia-400/35 bg-fuchsia-500/15 text-fuchsia-200";
  }
  return "border-white/15 bg-white/10 text-gray-200";
}

function decodeCompactItems(metadata: Stripe.Metadata | null, key: "items" | "sleeves") {
  if (!metadata) return [];

  const partsCount = Number(metadata[`${key}_parts`] ?? "0");
  let json = "";

  if (metadata[key]) {
    json = metadata[key] ?? "";
  } else if (partsCount > 0) {
    for (let i = 0; i < partsCount; i++) {
      const chunk = metadata[`${key}_${i}`];
      if (!chunk) return [];
      json += chunk;
    }
  }

  if (!json) return [];

  try {
    const parsed = JSON.parse(json) as unknown;
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function decodeCardItems(metadata: Stripe.Metadata | null): CompactItem[] {
  return decodeCompactItems(metadata, "items").filter(
    (item): item is CompactItem =>
      Array.isArray(item) &&
      typeof item[0] === "string" &&
      typeof item[1] === "string" &&
      typeof item[2] === "number",
  );
}

function decodeSleeveItems(metadata: Stripe.Metadata | null): CompactSleeveItem[] {
  return decodeCompactItems(metadata, "sleeves").filter(
    (item): item is CompactSleeveItem =>
      Array.isArray(item) &&
      typeof item[0] === "string" &&
      typeof item[1] === "number",
  );
}

function cardNumberSortValue(number: string) {
  const firstNumber = Number.parseInt(number.match(/\d+/)?.[0] ?? "0", 10);
  return Number.isFinite(firstNumber) ? firstNumber : 0;
}

function mergeCardItems(items: CompactItem[]) {
  const merged = new Map<string, CompactItem>();

  for (const [cardId, variant, quantity] of items) {
    if (!cardId || !variant || !Number.isFinite(quantity) || quantity <= 0) continue;

    const key = `${cardId}:${variant}`;
    const existing = merged.get(key);
    if (existing) {
      existing[2] += quantity;
    } else {
      merged.set(key, [cardId, variant, quantity]);
    }
  }

  return Array.from(merged.values());
}

function mergeSleeveItems(items: CompactSleeveItem[]) {
  const merged = new Map<string, CompactSleeveItem>();

  for (const [sleeveId, quantity] of items) {
    if (!sleeveId || !Number.isFinite(quantity) || quantity <= 0) continue;

    const existing = merged.get(sleeveId);
    if (existing) {
      existing[1] += quantity;
    } else {
      merged.set(sleeveId, [sleeveId, quantity]);
    }
  }

  return Array.from(merged.values());
}

async function getOrderMetadata(rows: OrderRow[]) {
  let stripe: Stripe;
  try {
    stripe = getStripe();
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Impossible de charger Stripe pour lire le contenu.";
    return new Map<string, StripeOrderMetadata>(
      rows.map((order) => [order.id, { metadata: null, error: message }]),
    );
  }

  const entries: Array<readonly [string, StripeOrderMetadata]> = await Promise.all(
    rows.map(async (order) => {
      try {
        const session = await stripe.checkout.sessions.retrieve(
          order.stripeSessionId || order.id,
        );
        return [order.id, { metadata: session.metadata ?? null }] as const;
      } catch (error) {
        const message =
          error instanceof Error
            ? error.message
            : "Impossible de lire la session Stripe.";
        return [order.id, { metadata: null, error: message }] as const;
      }
    }),
  );

  return new Map(entries);
}

async function buildOrderContents(rows: OrderRow[]) {
  const metadataByOrder = await getOrderMetadata(rows);
  const decoded = rows.map((order) => {
    const stripeData = metadataByOrder.get(order.id);
    return {
      orderId: order.id,
      error: stripeData?.error,
      cardItems: mergeCardItems(decodeCardItems(stripeData?.metadata ?? null)),
      sleeveItems: mergeSleeveItems(decodeSleeveItems(stripeData?.metadata ?? null)),
    };
  });
  const cardIds = Array.from(
    new Set(decoded.flatMap((entry) => entry.cardItems.map(([cardId]) => cardId))),
  );
  const rawCards = cardIds
    .map((cardId) => getCard(cardId))
    .filter((card): card is Card => Boolean(card));
  const liveCards = await applyStockOverrides(rawCards).catch(() => rawCards);
  const cardMap = new Map(liveCards.map((card) => [card.id, card]));

  const sleeveIds = Array.from(
    new Set(decoded.flatMap((entry) => entry.sleeveItems.map(([id]) => id))),
  );
  const sleeves = await getSleevesByIds(sleeveIds).catch(() => []);
  const sleeveMap = new Map(sleeves.map((sleeve) => [sleeve.id, sleeve]));

  return new Map(
    decoded.map((entry) => [
      entry.orderId,
      buildOrderContent(
        entry.cardItems,
        entry.sleeveItems,
        sleeveMap,
        cardMap,
        entry.error,
      ),
    ]),
  );
}

function buildOrderContent(
  cardItems: CompactItem[],
  sleeveItems: CompactSleeveItem[],
  sleeveMap: Map<string, SleeveProduct>,
  cardMap: Map<string, Card>,
  error?: string,
): OrderContent {
  const cardLines: CardOrderLine[] = cardItems.map(([cardId, variant, quantity]) => {
    const card = cardMap.get(cardId) ?? getCard(cardId);
    const serie = card ? getSerie(card.serieId) : undefined;
    const bloc = serie ? getBloc(serie.blocId) : undefined;
    const resolved = card ? resolveVariant(card, variant) : undefined;

    return {
      type: "card",
      key: `${cardId}:${variant}`,
      cardId,
      variant,
      quantity,
      card,
      name: card?.name ?? cardId,
      number: card?.number ?? "-",
      image: card?.image,
      blocName: bloc?.name ?? "Bloc inconnu",
      blocOrder: bloc ? BLOCS.findIndex((item) => item.id === bloc.id) : 9999,
      serieName: serie?.name ?? "Serie inconnue",
      serieCode: serie?.code ?? "-",
      serieOrder: serie ? SERIES.findIndex((item) => item.id === serie.id) : 9999,
      rarity: resolved?.rarity ? formatRarityLabel(resolved.rarity) : "-",
      condition: resolved?.condition ?? card?.condition ?? "-",
    };
  });

  cardLines.sort((a, b) => {
    if (a.blocOrder !== b.blocOrder) return a.blocOrder - b.blocOrder;
    if (a.serieOrder !== b.serieOrder) return a.serieOrder - b.serieOrder;
    return cardNumberSortValue(a.number) - cardNumberSortValue(b.number);
  });

  const groupMap = new Map<string, OrderContent["cardGroups"][number]>();

  for (const line of cardLines) {
    const groupKey = `${line.blocName}:${line.serieName}`;
    const group = groupMap.get(groupKey);
    if (group) {
      group.lines.push(line);
    } else {
      groupMap.set(groupKey, {
        key: groupKey,
        blocName: line.blocName,
        serieName: line.serieName,
        serieCode: line.serieCode,
        lines: [line],
      });
    }
  }

  const sleeveLines: SleeveOrderLine[] = sleeveItems.map(([sleeveId, quantity]) => {
    const sleeve = sleeveMap.get(sleeveId);
    return {
      type: "sleeve",
      key: sleeveId,
      sleeveId,
      quantity,
      name: sleeve?.name ?? sleeveId,
      image: sleeve?.image,
    };
  });

  return {
    cardGroups: Array.from(groupMap.values()),
    sleeveLines,
    totalQuantity:
      cardLines.reduce((total, line) => total + line.quantity, 0) +
      sleeveLines.reduce((total, line) => total + line.quantity, 0),
    error,
  };
}

function OrderContentDetails({ content }: { content?: OrderContent }) {
  if (!content) return null;

  if (content.error) {
    return (
      <div className="mt-4 rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-100">
        Contenu de commande indisponible : {content.error}
      </div>
    );
  }

  if (
    content.cardGroups.length === 0 &&
    content.sleeveLines.length === 0
  ) {
    return (
      <div className="mt-4 rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 text-sm text-amber-100">
        Aucun article trouve dans les metadonnees Stripe de cette commande.
      </div>
    );
  }

  return (
    <div className="mt-4 rounded-2xl border border-white/10 bg-zinc-950/55 p-4">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-sm font-semibold uppercase tracking-[0.16em] text-violet-200">
          Contenu de la commande
        </h2>
        <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-gray-300">
          {content.totalQuantity} article{content.totalQuantity > 1 ? "s" : ""}
        </span>
      </div>

      <div className="space-y-4">
        {content.cardGroups.map((group) => (
          <div key={group.key} className="rounded-xl border border-white/10 bg-white/[0.03]">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-white/10 px-3 py-2">
              <div>
                <div className="text-xs uppercase tracking-[0.14em] text-gray-500">
                  {group.blocName}
                </div>
                <div className="font-semibold text-white">
                  {group.serieName}{" "}
                  <span className="text-xs font-normal text-gray-500">
                    {group.serieCode}
                  </span>
                </div>
              </div>
              <span className="rounded-full bg-violet-500/15 px-2 py-1 text-xs text-violet-200">
                {group.lines.reduce((total, line) => total + line.quantity, 0)} carte
                {group.lines.reduce((total, line) => total + line.quantity, 0) > 1
                  ? "s"
                  : ""}
              </span>
            </div>

            <div className="divide-y divide-white/10">
              {group.lines.map((line) => (
                <div
                  key={line.key}
                  className="grid gap-3 px-3 py-3 sm:grid-cols-[3.25rem_1fr_auto] sm:items-center"
                >
                  <div className="flex h-16 w-12 items-center justify-center overflow-hidden rounded border border-white/10 bg-zinc-900 text-[10px] text-gray-500">
                    {line.image ? (
                      <img
                        src={line.image}
                        alt={line.name}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      "Image"
                    )}
                  </div>

                  <div>
                    <div className="font-semibold text-white">
                      {line.name}{" "}
                      <span className="font-mono text-xs text-gray-500">
                        {line.number}
                      </span>
                    </div>
                    <div className="mt-1 flex flex-wrap gap-1.5 text-xs text-gray-300">
                      <span className="rounded-full bg-white/10 px-2 py-1">
                        {line.rarity}
                      </span>
                      <span className="rounded-full bg-white/10 px-2 py-1">
                        {line.condition}
                      </span>
                      <span className="rounded-full bg-white/10 px-2 py-1">
                        Variante : {line.variant}
                      </span>
                    </div>
                  </div>

                  <div className="text-sm font-bold text-white">
                    x{line.quantity}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}

        {content.sleeveLines.length > 0 ? (
          <div className="rounded-xl border border-white/10 bg-white/[0.03]">
            <div className="border-b border-white/10 px-3 py-2 font-semibold text-white">
              Sleeves
            </div>
            <div className="divide-y divide-white/10">
              {content.sleeveLines.map((line) => (
                <div
                  key={line.key}
                  className="grid gap-3 px-3 py-3 sm:grid-cols-[3.25rem_1fr_auto] sm:items-center"
                >
                  <div className="flex h-16 w-12 items-center justify-center overflow-hidden rounded border border-white/10 bg-zinc-900 text-[10px] text-gray-500">
                    {line.image ? (
                      <img
                        src={line.image}
                        alt={line.name}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      "Sleeve"
                    )}
                  </div>
                  <div className="font-semibold text-white">{line.name}</div>
                  <div className="text-sm font-bold text-white">x{line.quantity}</div>
                </div>
              ))}
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
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
  const orderContents = await buildOrderContents(rows);
  const hasNextPage = rowsPlusOne.length > PAGE_SIZE;
  const hasPreviousPage = currentPage > 1;
  const stats = {
    paid: statusRows.filter((order) => order.status === "paid").length,
    labelToCreate: statusRows.filter((order) => order.status === "label_to_create").length,
    labelCreated: statusRows.filter((order) => order.status === "label_created").length,
    shipped: statusRows.filter((order) => order.status === "shipped").length,
    pickedUp: statusRows.filter((order) => order.status === "picked_up").length,
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

      <div className="mb-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
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
        <div className="rounded-xl border border-fuchsia-400/20 bg-fuchsia-500/10 p-4">
          <div className="text-sm text-fuchsia-200">Retirées</div>
          <div className="mt-1 text-3xl font-bold text-white">
            {stats.pickedUp}
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
          { value: "picked_up", label: "Retirées" },
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

              <OrderContentDetails content={orderContents.get(order.id)} />

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
