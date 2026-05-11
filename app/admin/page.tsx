import Link from "next/link";
import { redirect } from "next/navigation";
import AdminStockRow from "@/components/AdminStockRow";
import LogoutButton from "@/components/LogoutButton";
import { isAdmin } from "@/lib/admin/auth";
import { CARDS, SERIES, cardsForSerie, getSerie } from "@/lib/catalog";
import { applyStockOverrides } from "@/lib/stock";

export const dynamic = "force-dynamic";

type Search = { serie?: string; q?: string };

export default async function AdminPage({
  searchParams,
}: {
  searchParams: Promise<Search>;
}) {
  if (!(await isAdmin())) redirect("/admin/login");

  const params = await searchParams;
  const serieId = params.serie ?? "";
  const query = (params.q ?? "").trim().toLowerCase();

  const serie = serieId ? getSerie(serieId) : undefined;
  let cards = serie ? cardsForSerie(serie.id) : [];

  if (query) {
    cards = cards.filter(
      (c) =>
        c.name.toLowerCase().includes(query) ||
        c.number.toLowerCase().includes(query),
    );
  }

  const withStock = await applyStockOverrides(cards);
  const sortedSeries = [...SERIES].sort((a, b) => a.code.localeCompare(b.code));
  const totalCards = CARDS.length;

  return (
    <div className="py-6">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white">Admin - Stocks & prix</h1>
          <p className="mt-1 text-sm text-gray-400">
            {totalCards} cartes dans le catalogue. Modifie le stock et le prix
            par variante - les valeurs écrasent celles du catalogue.
          </p>
        </div>
        <LogoutButton />
      </div>

      <form className="mb-6 flex flex-wrap gap-3" action="/admin">
        <select
          name="serie"
          defaultValue={serieId}
          className="rounded border border-white/10 bg-zinc-900 px-3 py-2 text-sm text-white"
        >
          <option value="">-- Choisis une série --</option>
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
          placeholder="Rechercher (nom ou numéro)"
          className="rounded border border-white/10 bg-zinc-900 px-3 py-2 text-sm text-white"
        />

        <button
          type="submit"
          className="rounded bg-brand-500 px-4 py-2 text-sm font-medium text-white hover:bg-brand-600"
        >
          Filtrer
        </button>

        {serieId && (
          <Link
            href="/admin"
            className="rounded bg-white/10 px-4 py-2 text-sm text-white hover:bg-white/20"
          >
            Reset
          </Link>
        )}

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
      </form>

      {!serie ? (
        <p className="text-gray-400">
          Sélectionne une série pour afficher ses cartes.
        </p>
      ) : withStock.length === 0 ? (
        <p className="text-gray-400">Aucune carte trouvée.</p>
      ) : (
        <div className="space-y-3">
          {withStock.map((c) => (
            <AdminStockRow key={c.id} card={c} />
          ))}
        </div>
      )}
    </div>
  );
}
