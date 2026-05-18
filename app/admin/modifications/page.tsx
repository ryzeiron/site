import Link from "next/link";
import { redirect } from "next/navigation";
import { desc } from "drizzle-orm";
import LogoutButton from "@/components/LogoutButton";
import { isAdmin } from "@/lib/admin/auth";
import { getCard, getSerie } from "@/lib/catalog";
import { getDb } from "@/lib/db/client";
import { cardOverrides, stockOverrides } from "@/lib/db/schema";
import { formatPrice } from "@/lib/format";

export const dynamic = "force-dynamic";

type ModificationEntry = {
  id: string;
  type: "stock" | "infos";
  cardId: string;
  cardName: string;
  cardNumber: string;
  serieLabel: string;
  updatedAt: Date | string;
  details: string[];
};

function formatDate(value: Date | string | null | undefined) {
  if (!value) return "-";
  return new Date(value).toLocaleString("fr-FR", {
    day: "2-digit",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function variantLabel(value: string) {
  if (value === "base") return "Base";
  if (value === "alt") return "Alt";
  return value;
}

function cardAdminHref(cardId: string) {
  const card = getCard(cardId);
  if (!card) return "/admin";

  return `/admin?serie=${encodeURIComponent(card.serieId)}&q=${encodeURIComponent(
    card.number,
  )}`;
}

function cardSummary(cardId: string) {
  const card = getCard(cardId);
  const serie = card ? getSerie(card.serieId) : null;

  return {
    cardName: card?.name ?? "Carte introuvable",
    cardNumber: card?.number ?? cardId,
    serieLabel: serie ? `${serie.code} - ${serie.name}` : "Serie inconnue",
  };
}

async function getStockModificationRows(db: ReturnType<typeof getDb>) {
  try {
    return await db
      .select({
        cardId: stockOverrides.cardId,
        variant: stockOverrides.variant,
        stock: stockOverrides.stock,
        priceCents: stockOverrides.priceCents,
        rarity: stockOverrides.rarity,
        condition: stockOverrides.condition,
        updatedAt: stockOverrides.updatedAt,
      })
      .from(stockOverrides)
      .orderBy(desc(stockOverrides.updatedAt))
      .limit(50);
  } catch {
    const rows = await db
      .select({
        cardId: stockOverrides.cardId,
        variant: stockOverrides.variant,
        stock: stockOverrides.stock,
        priceCents: stockOverrides.priceCents,
        rarity: stockOverrides.rarity,
        updatedAt: stockOverrides.updatedAt,
      })
      .from(stockOverrides)
      .orderBy(desc(stockOverrides.updatedAt))
      .limit(50);

    return rows.map((row) => ({ ...row, condition: null }));
  }
}

export default async function AdminModificationsPage() {
  if (!(await isAdmin())) redirect("/admin/login");

  const db = getDb();
  const [stockRows, cardRows] = await Promise.all([
    getStockModificationRows(db),
    db
      .select()
      .from(cardOverrides)
      .orderBy(desc(cardOverrides.updatedAt))
      .limit(50),
  ]);

  const stockEntries: ModificationEntry[] = stockRows.map((row) => {
    const summary = cardSummary(row.cardId);
    const details = [
      `Variante ${variantLabel(row.variant)}`,
      `Stock ${row.stock}`,
    ];

    if (row.priceCents !== null) {
      details.push(`Prix ${formatPrice(row.priceCents / 100)}`);
    }

    if (row.rarity) {
      details.push(`Rarete ${row.rarity}`);
    }

    if (row.condition) {
      details.push(`Etat ${row.condition}`);
    }

    return {
      id: `stock-${row.cardId}-${row.variant}`,
      type: "stock",
      cardId: row.cardId,
      updatedAt: row.updatedAt,
      details,
      ...summary,
    };
  });

  const cardEntries: ModificationEntry[] = cardRows.map((row) => {
    const summary = cardSummary(row.cardId);
    const details = [];

    if (row.name) details.push(`Nom ${row.name}`);
    if (row.condition) details.push(`Etat ${row.condition}`);
    if (row.image) details.push("Image devant modifiee");
    if (row.imageBack) details.push("Image dos modifiee");
    if (row.description) details.push("Description modifiee");
    if (row.weightGrams !== null) details.push(`Poids ${row.weightGrams} g`);

    return {
      id: `infos-${row.cardId}`,
      type: "infos",
      cardId: row.cardId,
      updatedAt: row.updatedAt,
      details: details.length > 0 ? details : ["Infos carte modifiees"],
      ...summary,
    };
  });

  const entries = [...stockEntries, ...cardEntries]
    .sort(
      (a, b) =>
        new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
    )
    .slice(0, 50);

  return (
    <div className="py-6">
      <div className="mb-6 flex items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-white">
            Admin - Modifications
          </h1>
          <p className="mt-1 text-sm text-gray-400">
            Les 50 derniers changements de stock, prix, rarete et infos carte.
          </p>
        </div>

        <LogoutButton />
      </div>

      <div className="mb-6 flex flex-wrap gap-3">
        <Link
          href="/admin"
          className="rounded bg-white/10 px-4 py-2 text-sm text-white hover:bg-white/20"
        >
          Retour stocks
        </Link>

        <Link
          href="/admin/commandes"
          className="rounded bg-white/10 px-4 py-2 text-sm text-white hover:bg-white/20"
        >
          Commandes
        </Link>

        <Link
          href="/admin/clients"
          className="rounded bg-white/10 px-4 py-2 text-sm text-white hover:bg-white/20"
        >
          Clients
        </Link>

        <Link
          href="/admin/favoris"
          className="rounded bg-white/10 px-4 py-2 text-sm text-white hover:bg-white/20"
        >
          Favoris
        </Link>

        <Link
          href="/admin/avis"
          className="rounded bg-white/10 px-4 py-2 text-sm text-white hover:bg-white/20"
        >
          Avis
        </Link>
      </div>

      {entries.length === 0 ? (
        <p className="text-gray-400">Aucune modification pour le moment.</p>
      ) : (
        <div className="space-y-3">
          {entries.map((entry) => (
            <div
              key={entry.id}
              className="rounded-lg border border-white/10 bg-zinc-900/70 p-4"
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <span
                      className={`rounded px-2 py-0.5 text-xs font-semibold uppercase tracking-wider ${
                        entry.type === "stock"
                          ? "bg-violet-500/20 text-violet-200"
                          : "bg-sky-500/20 text-sky-200"
                      }`}
                    >
                      {entry.type === "stock" ? "Stock / prix" : "Infos carte"}
                    </span>
                    <span className="font-mono text-xs text-gray-500">
                      {entry.cardNumber}
                    </span>
                  </div>

                  <div className="mt-2 font-semibold text-white">
                    {entry.cardName}
                  </div>
                  <div className="text-sm text-gray-400">
                    {entry.serieLabel}
                  </div>
                </div>

                <div className="text-right text-xs text-gray-400">
                  {formatDate(entry.updatedAt)}
                </div>
              </div>

              <div className="mt-3 flex flex-wrap gap-2">
                {entry.details.map((detail) => (
                  <span
                    key={detail}
                    className="rounded bg-white/10 px-2 py-1 text-xs text-gray-200"
                  >
                    {detail}
                  </span>
                ))}
              </div>

              <div className="mt-3">
                <Link
                  href={cardAdminHref(entry.cardId)}
                  className="text-sm font-medium text-violet-300 hover:text-violet-200"
                >
                  Voir dans les stocks
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
