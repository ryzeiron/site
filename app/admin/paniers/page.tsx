import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";
import type { ReactNode } from "react";
import { desc } from "drizzle-orm";
import AdminCatalogTabs from "@/components/AdminCatalogTabs";
import LogoutButton from "@/components/LogoutButton";
import { isAdmin } from "@/lib/admin/auth";
import { getDb } from "@/lib/db/client";
import { cartSnapshots, type CartSnapshotItem } from "@/lib/db/schema";
import { formatCents } from "@/lib/format";

export const dynamic = "force-dynamic";

type CartSnapshotRow = typeof cartSnapshots.$inferSelect;

export default async function AdminCartsPage() {
  if (!(await isAdmin())) {
    redirect("/admin/login");
  }

  const { rows, tableReady } = await getCartRows();
  const activeRows = rows.filter((row) => getCartState(row.updatedAt).key === "active");
  const recentRows = rows.filter((row) => getCartState(row.updatedAt).key === "recent");
  const abandonedRows = rows.filter(
    (row) => getCartState(row.updatedAt).key === "abandoned",
  );

  return (
    <div className="py-6">
      <div className="mb-6 flex items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-white">Admin - Paniers</h1>
          <p className="mt-1 text-sm text-gray-400">
            Consulte les paniers actifs et les paniers abandonnés récents.
          </p>
        </div>

        <LogoutButton />
      </div>

      <AdminCatalogTabs active="carts" cartsCount={rows.length} />

      <div className="mb-6 flex flex-wrap gap-3">
        <AdminLink href="/admin/dashboard">Accueil admin</AdminLink>
        <AdminLink href="/admin/commandes">Commandes</AdminLink>
        <AdminLink href="/admin/clients">Clients</AdminLink>
        <AdminLink href="/admin/favoris">Favoris</AdminLink>
      </div>

      {!tableReady ? (
        <div className="rounded-2xl border border-amber-400/25 bg-amber-500/10 p-4 text-sm text-amber-100">
          La table des paniers n&apos;est pas encore créée dans Neon. Colle le SQL
          fourni avec la modification, puis recharge cette page.
        </div>
      ) : null}

      <section className="mb-6 grid gap-3 sm:grid-cols-3">
        <StatCard label="Actifs" value={activeRows.length} tone="emerald" />
        <StatCard label="Récents" value={recentRows.length} tone="sky" />
        <StatCard label="Abandonnés" value={abandonedRows.length} tone="amber" />
      </section>

      {rows.length === 0 ? (
        <div className="rounded-2xl border border-white/10 bg-zinc-950/60 p-6 text-center text-gray-400">
          Aucun panier récent pour le moment.
        </div>
      ) : (
        <div className="space-y-3">
          {rows.map((cart) => (
            <CartPanel key={cart.cartId} cart={cart} />
          ))}
        </div>
      )}
    </div>
  );
}

async function getCartRows() {
  try {
    const rows = await getDb()
      .select()
      .from(cartSnapshots)
      .orderBy(desc(cartSnapshots.updatedAt))
      .limit(100);

    return { rows, tableReady: true };
  } catch {
    return { rows: [] as CartSnapshotRow[], tableReady: false };
  }
}

function CartPanel({ cart }: { cart: CartSnapshotRow }) {
  const state = getCartState(cart.updatedAt);
  const items = Array.isArray(cart.items) ? cart.items : [];
  const customer = cart.userEmail || cart.userName || "Visiteur anonyme";

  return (
    <details className="group rounded-2xl border border-white/10 bg-zinc-900/70 text-gray-200 transition open:border-violet-400/40 open:bg-zinc-900/90">
      <summary className="cursor-pointer list-none p-4 [&::-webkit-details-marker]:hidden">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <span className={`rounded-full px-2.5 py-1 text-xs font-bold ${state.className}`}>
                {state.label}
              </span>
              <span className="truncate font-semibold text-white">{customer}</span>
            </div>
            <div className="mt-1 text-xs text-gray-500">
              Panier {cart.cartId.slice(0, 8)} - Dernière activité{" "}
              {formatDate(cart.updatedAt)}
            </div>
          </div>

          <div className="text-right">
            <div className="font-bold text-white">{formatCents(cart.totalCents)}</div>
            <div className="text-xs text-gray-400">
              {cart.itemCount} article{cart.itemCount > 1 ? "s" : ""}
            </div>
          </div>
        </div>
      </summary>

      <div className="border-t border-white/10 p-4">
        <div className="mb-3 grid gap-2 text-xs text-gray-400 sm:grid-cols-3">
          <div>
            <span className="text-gray-500">Client :</span> {customer}
          </div>
          <div>
            <span className="text-gray-500">Total :</span>{" "}
            {formatCents(cart.totalCents)}
          </div>
          <div>
            <span className="text-gray-500">Dernière activité :</span>{" "}
            {formatDate(cart.updatedAt)}
          </div>
        </div>

        <div className="space-y-2">
          {items.map((item, index) => (
            <CartItemLine key={`${item.type}-${item.id}-${item.variant ?? "base"}-${index}`} item={item} />
          ))}
        </div>
      </div>
    </details>
  );
}

function CartItemLine({ item }: { item: CartSnapshotItem }) {
  return (
    <div className="flex items-center gap-3 rounded-xl border border-white/10 bg-black/20 p-3">
      <div className="relative h-16 w-12 shrink-0 overflow-hidden rounded bg-white/5">
        {item.image ? (
          <Image src={item.image} alt="" fill sizes="48px" className="object-contain" />
        ) : (
          <div className="flex h-full items-center justify-center text-[10px] text-gray-500">
            Image
          </div>
        )}
      </div>

      <div className="min-w-0 flex-1">
        <Link href={item.href} className="font-semibold text-white hover:text-violet-200">
          {item.name}
        </Link>
        <div className="mt-1 flex flex-wrap gap-2 text-xs text-gray-400">
          {item.number ? <span>{item.number}</span> : null}
          {item.serieName ? <span>{item.serieName}</span> : null}
          {item.rarity ? <span>{item.rarity}</span> : null}
          {item.condition ? <span>{item.condition}</span> : null}
          {item.variant ? <span>Variante : {item.variant}</span> : null}
        </div>
      </div>

      <div className="text-right text-sm">
        <div className="font-semibold text-white">
          x{item.quantity} - {formatCents(item.lineTotalCents)}
        </div>
        <div className="text-xs text-gray-500">{formatCents(item.unitPriceCents)} / unité</div>
      </div>
    </div>
  );
}

function getCartState(updatedAt: Date | string) {
  const updated = new Date(updatedAt).getTime();
  const diffMinutes = Math.max(0, (Date.now() - updated) / 60000);

  if (diffMinutes <= 30) {
    return {
      key: "active",
      label: "Actif",
      className: "bg-emerald-500/20 text-emerald-200",
    };
  }

  if (diffMinutes <= 180) {
    return {
      key: "recent",
      label: "Récent",
      className: "bg-sky-500/20 text-sky-200",
    };
  }

  return {
    key: "abandoned",
    label: "Abandonné",
    className: "bg-amber-500/20 text-amber-200",
  };
}

function formatDate(value: Date | string) {
  return new Date(value).toLocaleString("fr-FR", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function StatCard({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone: "emerald" | "sky" | "amber";
}) {
  const classes = {
    emerald: "border-emerald-400/20 bg-emerald-500/10 text-emerald-200",
    sky: "border-sky-400/20 bg-sky-500/10 text-sky-200",
    amber: "border-amber-400/20 bg-amber-500/10 text-amber-200",
  }[tone];

  return (
    <div className={`rounded-xl border p-4 ${classes}`}>
      <div className="text-sm">{label}</div>
      <div className="mt-1 text-3xl font-bold text-white">{value}</div>
    </div>
  );
}

function AdminLink({
  href,
  children,
}: {
  href: string;
  children: ReactNode;
}) {
  return (
    <Link
      href={href}
      className="rounded bg-white/10 px-4 py-2 text-sm text-white hover:bg-white/20"
    >
      {children}
    </Link>
  );
}
