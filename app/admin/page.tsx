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
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold text-white">Admin - Stocks & prix</h1>
          <p className="text-sm text-gray-400 mt-1">
            {totalCards} cartes dans le catalogue. Modifie le stock et le prix
            par variante - les valeurs ecrasent celles du catalogue.
          </p>
          <Link
            href="/admin/tickets"
            className="inline-block mt-2 text-sm text-violet-300 hover:text-violet-200 underline"
          >
            Voir les tickets de contact
          </Link>
        </div>
        <LogoutButton />
      </div>

      <form className="flex flex-wrap gap-3 mb-6" action="/admin">
        <select
          name="serie"
          defaultValue={serieId}
          className="rounded bg-zinc-900 border border-white/10 text-white px-3 py-2 text-sm"
        >
          <option value="">-- Choisis une serie --</option>
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
          placeholder="Rechercher (nom ou numero)"
          className="rounded bg-zinc-900 border border-white/10 text-white px-3 py-2 text-sm"
        />
        <button
          type="submit"
          className="rounded bg-brand-500 hover:bg-brand-600 text-white px-4 py-2 text-sm font-medium"
        >
          Filtrer
        </button>
        {serieId && (
          <Link
            href="/admin"
            className="rounded bg-white/10 hover:bg-white/20 text-white px-4 py-2 text-sm"
          >
            Reset
          </Link>
        )}
        <Link
          href="/admin/commandes"
          className="rounded bg-white/10 hover:bg-white/20 text-white px-4 py-2 text-sm"
        >
          Commandes
        </Link>
      </form>

      {!serie ? (
        <p className="text-gray-400">
          Selectionne une serie pour afficher ses cartes.
        </p>
      ) : withStock.length === 0 ? (
        <p className="text-gray-400">Aucune carte trouvee.</p>
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
