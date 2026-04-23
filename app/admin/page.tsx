import { SERIES } from "@/lib/catalog";
import { cardsForSerieDb, countsBySerieDb } from "@/lib/db/queries";
import AdminTable from "./AdminTable";

export const dynamic = "force-dynamic";

export default async function AdminPage({
  searchParams,
}: {
  searchParams: Promise<{ serie?: string }>;
}) {
  const { serie } = await searchParams;
  const counts = await countsBySerieDb();
  const selectedSerieId = serie ?? SERIES[0]?.id;
  const selectedSerie = SERIES.find((s) => s.id === selectedSerieId);
  const cards = selectedSerie ? await cardsForSerieDb(selectedSerie.id) : [];

  return (
    <div>
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <h1 className="text-2xl font-bold text-white">Administration</h1>
        <form action="/api/admin/logout" method="POST">
          <button
            type="submit"
            className="rounded bg-white/10 hover:bg-white/20 text-gray-200 px-3 py-1.5 text-sm"
          >
            Deconnexion
          </button>
        </form>
      </div>

      <div className="mt-6">
        <label className="text-sm text-gray-300 block mb-2">
          Choisir une serie
        </label>
        <form method="GET" className="flex gap-2">
          <select
            name="serie"
            defaultValue={selectedSerieId}
            className="rounded bg-zinc-800 border border-white/10 text-white px-3 py-2 min-w-[280px]"
          >
            {SERIES.map((s) => (
              <option key={s.id} value={s.id}>
                {s.code} - {s.name} ({counts[s.id] ?? 0} cartes)
              </option>
            ))}
          </select>
          <button
            type="submit"
            className="rounded bg-violet-600 hover:bg-violet-500 text-white px-4 py-2 text-sm"
          >
            Afficher
          </button>
        </form>
      </div>

      {selectedSerie && (
        <div className="mt-8">
          <h2 className="text-lg font-semibold text-white mb-3">
            {selectedSerie.code} - {selectedSerie.name}
            <span className="text-sm text-gray-400 ml-2">
              ({cards.length} cartes)
            </span>
          </h2>
          <AdminTable cards={cards} />
        </div>
      )}
    </div>
  );
}
