import Link from "next/link";
import { redirect } from "next/navigation";
import { lte } from "drizzle-orm";
import AdminCatalogTabs from "@/components/AdminCatalogTabs";
import AdminSerieBulkActions from "@/components/AdminSerieBulkActions";
import { formatRarityLabel } from "@/lib/display-variants";
import AdminStockRow from "@/components/AdminStockRow";
import LogoutButton from "@/components/LogoutButton";
import { isAdmin } from "@/lib/admin/auth";
import { getDb } from "@/lib/db/client";
import { cardOverrides, hiddenVariants, stockOverrides } from "@/lib/db/schema";
import {
  CARDS,
  RARITIES,
  SERIES,
  getBloc,
  getSerie,
  isVariantHidden,
  isRarity,
  listVariants,
  type Card,
  type Rarity,
  type Serie,
} from "@/lib/catalog";
import { applyStockOverrides } from "@/lib/stock";

export const dynamic = "force-dynamic";

type Search = {
  serie?: string;
  q?: string;
  rarity?: string;
  quick?: string;
  page?: string;
};
type QuickFilter = "out" | "modified" | "hidden" | "premium";
type AdminHrefParams = {
  serieId: string;
  query: string;
  rarity: Rarity | "";
  quick: QuickFilter | "";
  page?: number;
};

const ADMIN_PAGE_SIZE = 50;

type AdminSerieGroup = {
  label: string;
  seriesIds: readonly string[];
};

// Change l'ordre ici pour ranger les groupes et les series dans le menu admin.
const ADMIN_SERIE_GROUPS: readonly AdminSerieGroup[] = [
  {
    label: "ME",
    seriesIds: [
      "me-promo",
      "me01",
      "me02",
      "me02.5",
      "me03",
      "me04",
      "me05",
    ],
  },
  {
    label: "EV",
    seriesIds: [
      "promo",
      "ev01",
      "ev02",
      "ev03",
      "ev03.5",
      "ev04",
      "ev04.5",
      "ev05",
      "ev06",
      "ev06.5",
      "ev07",
      "ev08",
      "ev08.5",
      "ev09",
      "ev10",
      "ev10.5",
      "foudre-noire",
    ],
  },
  {
    label: "EB",
    seriesIds: [
      "promo-eb",
      "eb01",
      "eb02",
      "eb03",
      "eb03.5",
      "eb04",
      "eb04.5",
      "eb05",
      "eb06",
      "eb07",
      "eb07.5",
      "eb08",
      "eb09",
      "eb10",
      "eb10.5",
      "eb11",
      "eb12",
      "crown-zenith",
    ],
  },
  {
    label: "SL",
    seriesIds: [
      "PRSM",
      "sl01",
      "sl02",
      "sl03",
      "sl03.5",
      "sl04",
      "sl05",
      "sl06",
      "sl07",
      "sl07.5",
      "sl08",
      "sl09",
      "sl10",
      "sl11",
      "sl11.5",
      "sl12",
    ],
  },
  {
    label: "XY",
    seriesIds: [
      "prxy",
      "xy00",
      "xy01",
      "xy02",
      "xy03",
      "xy04",
      "xy05",
      "xy05.5",
      "xy06",
      "xy07",
      "xy08",
      "xy09",
      "xy09.5",
      "xy10",
      "xy11",
      "xy12",
    ],
  },
  {
    label: "NB",
    seriesIds: [
      "prbw",
      "nb01",
      "nb02",
      "nb03",
      "nb04",
      "nb05",
      "nb06",
      "nb07",
      "nb07.5",
      "nb08",
      "nb09",
      "nb10",
    ],
  },
  {
    label: "ADL",
    seriesIds: ["adl"],
  },
  {
    label: "HGSS",
    seriesIds: ["prhgss", "HGSS01", "HGSS02", "HGSS03", "HGSS04"],
  },
  {
    label: "PT",
    seriesIds: ["PT01", "PT02", "PT03", "PT04"],
  },
  {
    label: "DP",
    seriesIds: ["PRDP", "DP01", "DP02", "DP03", "DP04", "DP05", "DP06", "DP07"],
  },
  {
    label: "EX",
    seriesIds: [
      "EX01",
      "EX02",
      "EX03",
      "EX04",
      "EX05",
      "EX06",
      "EX07",
      "EX08",
      "EX09",
      "EX010",
      "EX011",
      "EX012",
      "EX013",
      "EX014",
      "EX015",
    ],
  },
];

function normalizeSearch(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

function searchableText(card: Card) {
  const serie = getSerie(card.serieId);
  const bloc = serie ? getBloc(serie.blocId) : undefined;

  return normalizeSearch(
    [
      card.name,
      card.number,
      card.rarity,
      card.condition,
      card.language,
      serie?.name,
      serie?.code,
      bloc?.name,
    ]
      .filter(Boolean)
      .join(" "),
  );
}

function isQuickFilter(value?: string): value is QuickFilter {
  return (
    value === "out" ||
    value === "modified" ||
    value === "hidden" ||
    value === "premium"
  );
}

function AdminPagination({
  currentPage,
  totalPages,
  paginationHref,
}: {
  currentPage: number;
  totalPages: number;
  paginationHref: (page: number) => string;
}) {
  const firstPage = Math.max(1, currentPage - 2);
  const lastPage = Math.min(totalPages, currentPage + 2);
  const pages = Array.from(
    { length: lastPage - firstPage + 1 },
    (_, index) => firstPage + index,
  );

  return (
    <nav
      className="flex flex-wrap items-center gap-2"
      aria-label="Pagination admin"
    >
      <Link
        href={paginationHref(Math.max(1, currentPage - 1))}
        aria-disabled={currentPage === 1}
        className={`rounded-full px-3 py-1.5 text-sm font-medium ${
          currentPage === 1
            ? "pointer-events-none bg-white/5 text-gray-600"
            : "bg-white/10 text-white hover:bg-white/20"
        }`}
      >
        Précédent
      </Link>

      {firstPage > 1 ? (
        <>
          <Link
            href={paginationHref(1)}
            className="rounded-full bg-white/10 px-3 py-1.5 text-sm font-medium text-white hover:bg-white/20"
          >
            1
          </Link>
          {firstPage > 2 ? (
            <span className="px-1 text-gray-500">...</span>
          ) : null}
        </>
      ) : null}

      {pages.map((page) => (
        <Link
          key={page}
          href={paginationHref(page)}
          aria-current={page === currentPage ? "page" : undefined}
          className={`rounded-full px-3 py-1.5 text-sm font-medium ${
            page === currentPage
              ? "bg-violet-600 text-white"
              : "bg-white/10 text-white hover:bg-white/20"
          }`}
        >
          {page}
        </Link>
      ))}

      {lastPage < totalPages ? (
        <>
          {lastPage < totalPages - 1 ? (
            <span className="px-1 text-gray-500">...</span>
          ) : null}
          <Link
            href={paginationHref(totalPages)}
            className="rounded-full bg-white/10 px-3 py-1.5 text-sm font-medium text-white hover:bg-white/20"
          >
            {totalPages}
          </Link>
        </>
      ) : null}

      <Link
        href={paginationHref(Math.min(totalPages, currentPage + 1))}
        aria-disabled={currentPage === totalPages}
        className={`rounded-full px-3 py-1.5 text-sm font-medium ${
          currentPage === totalPages
            ? "pointer-events-none bg-white/5 text-gray-600"
            : "bg-white/10 text-white hover:bg-white/20"
        }`}
      >
        Suivant
      </Link>
    </nav>
  );
}

function variantSignature(card: Card) {
  return listVariants(card, { includeHidden: true })
    .map(
      ({ key, variant }) =>
        `${key}:${variant.rarity}:${variant.stock}:${variant.price}:${variant.condition ?? card.condition}:${isVariantHidden(card, key)}`,
    )
    .join("|");
}

function isModifiedFromCatalog(card: Card, catalogCard?: Card) {
  if (!catalogCard) return true;
  return variantSignature(card) !== variantSignature(catalogCard);
}

function cardMatchesQuickFilter(
  card: Card,
  quick: QuickFilter,
  catalogCard?: Card,
) {
  const variants = listVariants(card, { includeHidden: true });

  if (quick === "out") {
    return variants.some(({ variant }) => variant.stock <= 0);
  }

  if (quick === "hidden") {
    return variants.some(({ key }) => isVariantHidden(card, key));
  }

  if (quick === "premium") {
    return variants.some(
      ({ variant }) =>
        variant.rarity === "Ultra Rare" || variant.rarity === "Secrete",
    );
  }

  return isModifiedFromCatalog(card, catalogCard);
}

async function getQuickOverrideCardIds(quick: QuickFilter) {
  const db = getDb();

  try {
    if (quick === "out") {
      const rows = await db
        .select({ cardId: stockOverrides.cardId })
        .from(stockOverrides)
        .where(lte(stockOverrides.stock, 0));

      return rows.map((row) => row.cardId);
    }

    if (quick === "hidden") {
      const rows = await db
        .select({ cardId: hiddenVariants.cardId })
        .from(hiddenVariants);

      return rows.map((row) => row.cardId);
    }

    if (quick === "modified") {
      const [stockRows, cardRows, hiddenRows] = await Promise.all([
        db.select({ cardId: stockOverrides.cardId }).from(stockOverrides),
        db.select({ cardId: cardOverrides.cardId }).from(cardOverrides),
        db.select({ cardId: hiddenVariants.cardId }).from(hiddenVariants),
      ]);

      return [
        ...stockRows.map((row) => row.cardId),
        ...cardRows.map((row) => row.cardId),
        ...hiddenRows.map((row) => row.cardId),
      ];
    }
  } catch {
    return [];
  }

  return [];
}

async function getQuickCandidateCards(
  quick: QuickFilter,
  catalogById: Map<string, Card>,
) {
  const ids = new Set<string>();

  for (const card of CARDS) {
    if (cardMatchesQuickFilter(card, quick, catalogById.get(card.id))) {
      ids.add(card.id);
    }
  }

  for (const cardId of await getQuickOverrideCardIds(quick)) {
    ids.add(cardId);
  }

  return Array.from(ids)
    .map((id) => catalogById.get(id))
    .filter((card): card is Card => Boolean(card));
}

function cardMatchesTextAndRarity(
  card: Card,
  terms: string[],
  rarity: Rarity | "",
) {
  if (terms.length > 0) {
    const text = searchableText(card);
    if (!terms.every((term) => text.includes(term))) return false;
  }

  if (rarity) {
    return listVariants(card, { includeHidden: true }).some(
      ({ variant }) => variant.rarity === rarity,
    );
  }

  return true;
}

function parsePage(value?: string) {
  const page = Number.parseInt(value ?? "1", 10);
  return Number.isFinite(page) && page > 0 ? page : 1;
}

function adminHref({
  serieId,
  query,
  rarity,
  quick,
  page,
}: AdminHrefParams) {
  const params = new URLSearchParams();

  if (serieId) params.set("serie", serieId);
  if (query) params.set("q", query);
  if (rarity) params.set("rarity", rarity);
  if (quick) params.set("quick", quick);
  if (page && page > 1) params.set("page", String(page));

  const search = params.toString();
  return search ? `/admin?${search}` : "/admin";
}

function getAdminSerieGroups() {
  const groupedSerieIds = new Set(
    ADMIN_SERIE_GROUPS.flatMap((group) => group.seriesIds),
  );
  const groups = ADMIN_SERIE_GROUPS.map((group) => ({
    label: group.label,
    series: group.seriesIds
      .map((id) => SERIES.find((serie) => serie.id === id))
      .filter((serie): serie is Serie => Boolean(serie)),
  })).filter((group) => group.series.length > 0);
  const otherSeries = SERIES.filter((serie) => !groupedSerieIds.has(serie.id))
    .sort((a, b) => a.code.localeCompare(b.code, "fr", { numeric: true }));

  if (otherSeries.length === 0) return groups;

  return [...groups, { label: "Autres", series: otherSeries }];
}

export default async function AdminPage({
  searchParams,
}: {
  searchParams: Promise<Search>;
}) {
  if (!(await isAdmin())) redirect("/admin/login");

  const params = await searchParams;
  const serieId = params.serie ?? "";
  const query = (params.q ?? "").trim();
  const terms = normalizeSearch(query).split(/\s+/).filter(Boolean);
  const rarity: Rarity | "" =
    params.rarity && isRarity(params.rarity) ? params.rarity : "";
  const quick = isQuickFilter(params.quick) ? params.quick : "";
  const requestedPage = parsePage(params.page);
  const hasSearch = terms.length > 0 || Boolean(rarity) || Boolean(quick);

  const serie = serieId ? getSerie(serieId) : undefined;
  const catalogById = new Map(CARDS.map((card) => [card.id, card]));
  let filteredCards: Card[] = [];

  if (serie) {
    const serieCards = CARDS.filter((card) => card.serieId === serie.id);
    const serieCardsWithStock = await applyStockOverrides(serieCards);

    filteredCards = serieCardsWithStock.filter(
      (card) =>
        cardMatchesTextAndRarity(card, terms, rarity) &&
        (!quick || cardMatchesQuickFilter(card, quick, catalogById.get(card.id))),
    );
  } else if (serieId) {
    filteredCards = [];
  } else if (hasSearch) {
    const candidateCards = quick
      ? await getQuickCandidateCards(quick, catalogById)
      : CARDS;

    filteredCards = candidateCards.filter((card) =>
      cardMatchesTextAndRarity(card, terms, rarity),
    );
  }

  const serieGroups = getAdminSerieGroups();
  const totalCards = CARDS.length;
  const totalFilteredCards = filteredCards.length;
  const totalPages = Math.max(1, Math.ceil(totalFilteredCards / ADMIN_PAGE_SIZE));
  const currentPage = Math.min(requestedPage, totalPages);
  const startIndex = (currentPage - 1) * ADMIN_PAGE_SIZE;
  const pageCatalogCards = filteredCards.slice(
    startIndex,
    startIndex + ADMIN_PAGE_SIZE,
  );
  const paginatedCards = serie
    ? pageCatalogCards
    : await applyStockOverrides(pageCatalogCards);
  const visibleStart = totalFilteredCards === 0 ? 0 : startIndex + 1;
  const visibleEnd = Math.min(startIndex + ADMIN_PAGE_SIZE, totalFilteredCards);
  const paginationHref = (page: number) =>
    adminHref({ serieId, query, rarity, quick, page });

  return (
    <div className="py-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold text-white">
            Admin - Stocks & prix
          </h1>
          <p className="text-sm text-gray-400 mt-1">
            {totalCards} cartes enregistrées. Choisis une série ou lance une
            recherche pour charger uniquement les cartes utiles.
          </p>
        </div>

        <LogoutButton />
      </div>

      <AdminCatalogTabs active="cards" cardsCount={totalCards} />

      <form className="flex flex-wrap gap-3 mb-6" action="/admin">
        <select
          name="serie"
          defaultValue={serieId}
          className="rounded bg-zinc-900 border border-white/10 text-white px-3 py-2 text-sm"
        >
          <option value="">-- Toutes les séries --</option>
          {serieGroups.map((group) => (
            <optgroup key={group.label} label={group.label}>
              {group.series.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.code} - {s.name}
                </option>
              ))}
            </optgroup>
          ))}
        </select>

        <input
          type="text"
          name="q"
          defaultValue={query}
          placeholder="Rechercher dans les séries"
          className="rounded bg-zinc-900 border border-white/10 text-white px-3 py-2 text-sm"
        />

        <select
          name="rarity"
          defaultValue={rarity}
          className="rounded bg-zinc-900 border border-white/10 text-white px-3 py-2 text-sm"
        >
          <option value="">-- Toutes les raretés --</option>
          {RARITIES.map((r) => (
            <option key={r} value={r}>
              {formatRarityLabel(r)}
            </option>
          ))}
        </select>

        {quick ? <input type="hidden" name="quick" value={quick} /> : null}

        <button
          type="submit"
          className="rounded bg-brand-500 hover:bg-brand-600 text-white px-4 py-2 text-sm font-medium"
        >
          Filtrer
        </button>

        {(serieId || query || rarity || quick) && (
          <Link
            href="/admin"
            className="rounded bg-white/10 hover:bg-white/20 text-white px-4 py-2 text-sm"
          >
            Reset
          </Link>
        )}

        <Link
          href="/admin/modifications"
          className="rounded bg-white/10 hover:bg-white/20 text-white px-4 py-2 text-sm"
        >
          Modifications
        </Link>

        <Link
          href="/admin/commandes"
          className="rounded bg-white/10 hover:bg-white/20 text-white px-4 py-2 text-sm"
        >
          Commandes
        </Link>

        <Link
          href="/admin/clients"
          className="rounded bg-white/10 hover:bg-white/20 text-white px-4 py-2 text-sm"
        >
          Clients
        </Link>

        <Link
          href="/admin/favoris"
          className="rounded bg-white/10 hover:bg-white/20 text-white px-4 py-2 text-sm"
        >
          Favoris
        </Link>

        <Link
          href="/admin/avis"
          className="rounded bg-white/10 hover:bg-white/20 text-white px-4 py-2 text-sm"
        >
          Avis
        </Link>
      </form>

      <section className="mb-6 rounded-2xl border border-white/10 bg-zinc-950/65 p-4">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-bold text-white">À traiter</h2>
            <p className="mt-1 text-sm text-gray-400">
              Raccourcis rapides sans charger tout le catalogue au départ.
            </p>
          </div>
          {quick ? (
            <Link
              href="/admin"
              className="rounded-full bg-white/10 px-3 py-1.5 text-sm text-white hover:bg-white/20"
            >
              Voir tout
            </Link>
          ) : null}
        </div>

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {[
            { key: "out", label: "Rupture" },
            { key: "modified", label: "Modifiées" },
            { key: "hidden", label: "Masquées" },
            { key: "premium", label: "Ultra/Secrètes" },
          ].map((item) => (
            <Link
              key={item.key}
              href={`/admin?quick=${item.key}`}
              className={`rounded-xl border p-4 transition hover:-translate-y-0.5 ${
                quick === item.key
                  ? "border-violet-300/60 bg-violet-500/20"
                  : "border-white/10 bg-white/[0.03] hover:border-violet-300/40"
              }`}
            >
              <div className="text-sm text-gray-400">{item.label}</div>
              <div className="mt-2 text-sm font-semibold text-white">
                Ouvrir la liste
              </div>
            </Link>
          ))}
        </div>
      </section>

      {serie && (
        <AdminSerieBulkActions
          serieId={serie.id}
          serieLabel={`${serie.code} - ${serie.name}`}
          defaultRarity={rarity || "Commune"}
        />
      )}

      {!serie && !hasSearch ? (
        <p className="text-gray-400">
          Choisis une série ou lance une recherche dans toutes les séries.
        </p>
      ) : filteredCards.length === 0 ? (
        <p className="text-gray-400">Aucune carte trouvée.</p>
      ) : (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-white/10 bg-zinc-950/65 p-4 text-sm text-gray-300">
            <div>
              Affichage de{" "}
              <span className="font-semibold text-white">{visibleStart}</span> à{" "}
              <span className="font-semibold text-white">{visibleEnd}</span> sur{" "}
              <span className="font-semibold text-white">{totalFilteredCards}</span>{" "}
              carte{totalFilteredCards > 1 ? "s" : ""}.
            </div>

            {totalPages > 1 ? (
              <AdminPagination
                currentPage={currentPage}
                totalPages={totalPages}
                paginationHref={paginationHref}
              />
            ) : null}
          </div>

          <div className="space-y-3">
            {paginatedCards.map((c) => (
              <AdminStockRow key={c.id} card={c} />
            ))}
          </div>

          {totalPages > 1 ? (
            <div className="flex justify-center rounded-2xl border border-white/10 bg-zinc-950/65 p-4">
              <AdminPagination
                currentPage={currentPage}
                totalPages={totalPages}
                paginationHref={paginationHref}
              />
            </div>
          ) : null}
        </div>
      )}
    </div>
  );
}
