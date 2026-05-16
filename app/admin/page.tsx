import Link from "next/link";
import { redirect } from "next/navigation";
import AdminStockRow from "@/components/AdminStockRow";
import LogoutButton from "@/components/LogoutButton";
import { isAdmin } from "@/lib/admin/auth";
import {
  CARDS,
  RARITIES,
  SERIES,
  getBloc,
  getSerie,
  isRarity,
  listVariants,
  type Card,
  type Serie,
} from "@/lib/catalog";
import { applyStockOverrides } from "@/lib/stock";

export const dynamic = "force-dynamic";

type Search = { serie?: string; q?: string; rarity?: string };

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
    seriesIds: ["promo-dp", "dp01", "dp02", "dp03", "dp04", "dp05", "dp06", "dp07"],
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
  const rarity = params.rarity && isRarity(params.rarity) ? params.rarity : "";
  const hasSearch = terms.length > 0 || Boolean(rarity);

  const serie = serieId ? getSerie(serieId) : undefined;
  const allCardsWithStock = await applyStockOverrides(CARDS);
  const stockedCards = allCardsWithStock.filter((card) =>
    listVariants(card).some(({ variant }) => variant.stock > 0),
  ).length;
  const totalStock = allCardsWithStock.reduce(
    (total, card) =>
      total +
      listVariants(card).reduce(
        (variantTotal, { variant }) => variantTotal + variant.stock,
        0,
      ),
    0,
  );
  const cards = serie
    ? allCardsWithStock.filter((card) => card.serieId === serie.id)
    : serieId
      ? []
      : hasSearch
        ? allCardsWithStock
        : [];
  let filteredCards = cards;

  if (terms.length > 0) {
    filteredCards = filteredCards.filter((c) => {
      const text = searchableText(c);
      return terms.every((term) => text.includes(term));
    });
  }

  if (rarity) {
    filteredCards = filteredCards.filter((c) =>
      listVariants(c).some(({ variant }) => variant.rarity === rarity),
    );
  }

  const serieGroups = getAdminSerieGroups();
  const totalCards = CARDS.length;

  return (
    <div className="py-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold text-white">
            Admin - Stocks & prix
          </h1>
          <p className="text-sm text-gray-400 mt-1">
            {stockedCards} cartes en stock sur {totalCards} cartes
            enregistrees, {totalStock} exemplaires au total. Modifie le stock
            et le prix par variante - les valeurs ecrasent celles du catalogue.
          </p>
        </div>

        <LogoutButton />
      </div>

      <form className="flex flex-wrap gap-3 mb-6" action="/admin">
        <select
          name="serie"
          defaultValue={serieId}
          className="rounded bg-zinc-900 border border-white/10 text-white px-3 py-2 text-sm"
        >
          <option value="">-- Toutes les series --</option>
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
          placeholder="Rechercher dans les series"
          className="rounded bg-zinc-900 border border-white/10 text-white px-3 py-2 text-sm"
        />

        <select
          name="rarity"
          defaultValue={rarity}
          className="rounded bg-zinc-900 border border-white/10 text-white px-3 py-2 text-sm"
        >
          <option value="">-- Toutes les raretes --</option>
          {RARITIES.map((r) => (
            <option key={r} value={r}>
              {r}
            </option>
          ))}
        </select>

        <button
          type="submit"
          className="rounded bg-brand-500 hover:bg-brand-600 text-white px-4 py-2 text-sm font-medium"
        >
          Filtrer
        </button>

        {(serieId || query || rarity) && (
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

      {!serie && !hasSearch ? (
        <p className="text-gray-400">
          Choisis une serie ou lance une recherche dans toutes les series.
        </p>
      ) : filteredCards.length === 0 ? (
        <p className="text-gray-400">Aucune carte trouvee.</p>
      ) : (
        <div className="space-y-3">
          {filteredCards.map((c) => (
            <AdminStockRow key={c.id} card={c} />
          ))}
        </div>
      )}
    </div>
  );
}
