import Link from "next/link";
import { redirect } from "next/navigation";
import AdminStockRow from "@/components/AdminStockRow";
import LogoutButton from "@/components/LogoutButton";
import { isAdmin } from "@/lib/admin/auth";
import {
  CARDS,
  RARITIES,
  SERIES,
  cardsForSerie,
  getBloc,
  getSerie,
  isRarity,
  listVariants,
  type Card,
} from "@/lib/catalog";
import { applyStockOverrides } from "@/lib/stock";

export const dynamic = "force-dynamic";

type Search = { serie?: string; q?: string; rarity?: string };

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
  const cards = serie ? cardsForSerie(serie.id) : serieId ? [] : hasSearch ? CARDS : [];
  const withStock = await applyStockOverrides(cards);
  let filteredCards = withStock;

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

  const sortedSeries = [...SERIES].sort((a, b) => a.code.localeCompare(b.code));
  const totalCards = CARDS.length;

  return (
    <div className="py-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold text-white">
            Admin - Stocks & prix
          </h1>
          <p className="text-sm text-gray-400 mt-1">
            {totalCards} cartes dans le catalogue. Modifie le stock et le prix
            par variante - les valeurs ecrasent celles du catalogue.
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
          {sortedSeries.map((s) => (
            <option key={s.id} value={s.id}>
              {s.code} - {s.name}
            </option>
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
