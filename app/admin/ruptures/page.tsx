import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";
import LogoutButton from "@/components/LogoutButton";
import { isAdmin } from "@/lib/admin/auth";
import {
  CARDS,
  SERIES,
  getSerie,
  listVariants,
  type Card,
  type VariantKey,
} from "@/lib/catalog";
import { formatPrice } from "@/lib/format";
import { applyStockOverrides } from "@/lib/stock";

export const dynamic = "force-dynamic";

type Search = { q?: string; serie?: string };

type MissingVariant = {
  card: Card;
  variantKey: VariantKey;
  rarity: string;
  price: number;
};

function normalize(value: string) {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

function variantLabel(key: VariantKey) {
  if (key === "base") return "Base";
  if (key === "alt") return "Alt";
  return key;
}

export default async function AdminRupturesPage({
  searchParams,
}: {
  searchParams: Promise<Search>;
}) {
  if (!(await isAdmin())) redirect("/admin/login");

  const params = await searchParams;
  const query = (params.q ?? "").trim();
  const serieId = params.serie ?? "";
  const selectedSerie = serieId ? getSerie(serieId) : undefined;

  const liveCards = await applyStockOverrides(CARDS);
  const missingVariants: MissingVariant[] = [];

  for (const card of liveCards) {
    if (selectedSerie && card.serieId !== selectedSerie.id) continue;

    for (const item of listVariants(card)) {
      if (item.variant.stock <= 0) {
        missingVariants.push({
          card,
          variantKey: item.key,
          rarity: item.variant.rarity,
          price: item.variant.price,
        });
      }
    }
  }

  const filteredMissing = query
    ? missingVariants.filter((item) => {
        const serie = getSerie(item.card.serieId);
        const haystack = normalize(
          [
            item.card.name,
            item.card.number,
            item.rarity,
            serie?.name ?? "",
            serie?.code ?? "",
          ].join(" "),
        );
        return haystack.includes(normalize(query));
      })
    : missingVariants;

  const groupedBySerie = new Map<string, MissingVariant[]>();
  for (const item of filteredMissing) {
    const group = groupedBySerie.get(item.card.serieId) ?? [];
    group.push(item);
    groupedBySerie.set(item.card.serieId, group);
  }

  const sortedGroups = Array.from(groupedBySerie.entries()).sort((a, b) => {
    const serieA = getSerie(a[0]);
    const serieB = getSerie(b[0]);
    return (serieA?.code ?? a[0]).localeCompare(serieB?.code ?? b[0]);
  });

  const sortedSeries = [...SERIES].sort((a, b) => a.code.localeCompare(b.code));

  return (
    <div className="mx-auto max-w-4xl py-5 sm:py-6">
      <div className="mb-5 flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-violet-300">
            Admin mobile
          </p>
          <h1 className="mt-1 text-3xl font-black text-white">
            Cartes en rupture
          </h1>
          <p className="mt-2 text-sm text-gray-400">
            Toutes les cartes et variantes avec un stock à 0.
          </p>
        </div>
        <LogoutButton />
      </div>

      <div className="mb-5 grid gap-3 sm:grid-cols-3">
        <div className="rounded-2xl border border-red-400/30 bg-red-500/10 p-4">
          <div className="text-sm text-red-200">Ruptures affichées</div>
          <div className="mt-1 text-4xl font-black text-white">
            {filteredMissing.length}
          </div>
        </div>
        <div className="rounded-2xl border border-violet-400/30 bg-violet-500/10 p-4">
          <div className="text-sm text-violet-200">Total ruptures</div>
          <div className="mt-1 text-4xl font-black text-white">
            {missingVariants.length}
          </div>
        </div>
        <div className="rounded-2xl border border-white/10 bg-zinc-900/70 p-4">
          <div className="text-sm text-gray-400">Cartes catalogue</div>
          <div className="mt-1 text-4xl font-black text-white">
            {CARDS.length}
          </div>
        </div>
      </div>

      <form
        action="/admin/ruptures"
        className="sticky top-3 z-20 mb-5 rounded-2xl border border-white/10 bg-black/80 p-3 shadow-2xl shadow-black/30 backdrop-blur"
      >
        <div className="grid gap-2 sm:grid-cols-[1fr_180px_auto]">
          <input
            type="search"
            name="q"
            defaultValue={query}
            placeholder="Rechercher une carte..."
            className="h-11 rounded-xl border border-white/10 bg-zinc-950 px-4 text-sm text-white outline-none transition placeholder:text-gray-500 focus:border-violet-400/70"
          />
          <select
            name="serie"
            defaultValue={serieId}
            className="h-11 rounded-xl border border-white/10 bg-zinc-950 px-3 text-sm text-white outline-none transition focus:border-violet-400/70"
          >
            <option value="">Toutes les séries</option>
            {sortedSeries.map((serie) => (
              <option key={serie.id} value={serie.id}>
                {serie.code} - {serie.name}
              </option>
            ))}
          </select>
          <button
            type="submit"
            className="h-11 rounded-xl bg-violet-600 px-5 text-sm font-bold text-white transition hover:bg-violet-500"
          >
            Filtrer
          </button>
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          <Link
            href="/admin"
            className="rounded-full bg-white/10 px-4 py-2 text-xs font-semibold text-white transition hover:bg-white/20"
          >
            Stocks
          </Link>
          <Link
            href="/admin/commandes"
            className="rounded-full bg-white/10 px-4 py-2 text-xs font-semibold text-white transition hover:bg-white/20"
          >
            Commandes
          </Link>
          <Link
            href="/admin/clients"
            className="rounded-full bg-white/10 px-4 py-2 text-xs font-semibold text-white transition hover:bg-white/20"
          >
            Clients
          </Link>
          {(query || serieId) && (
            <Link
              href="/admin/ruptures"
              className="rounded-full bg-red-500/20 px-4 py-2 text-xs font-semibold text-red-100 transition hover:bg-red-500/30"
            >
              Effacer
            </Link>
          )}
        </div>
      </form>

      {filteredMissing.length === 0 ? (
        <div className="rounded-2xl border border-emerald-400/30 bg-emerald-500/10 p-6 text-center">
          <div className="text-2xl font-black text-white">
            Aucune rupture trouvée
          </div>
          <p className="mt-2 text-sm text-emerald-100/80">
            Aucun résultat avec ce filtre.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {sortedGroups.map(([groupSerieId, items]) => {
            const serie = getSerie(groupSerieId);
            return (
              <section
                key={groupSerieId}
                className="overflow-hidden rounded-2xl border border-white/10 bg-zinc-900/70"
              >
                <div className="flex items-center justify-between gap-3 border-b border-white/10 bg-white/[0.03] px-4 py-3">
                  <div>
                    <div className="text-xs font-semibold uppercase tracking-[0.18em] text-violet-300">
                      {serie?.code ?? groupSerieId}
                    </div>
                    <h2 className="text-lg font-black text-white">
                      {serie?.name ?? "Série inconnue"}
                    </h2>
                  </div>
                  <div className="rounded-full bg-red-500/15 px-3 py-1 text-sm font-bold text-red-100">
                    {items.length}
                  </div>
                </div>

                <div className="divide-y divide-white/10">
                  {items.map((item) => (
                    <MissingCardRow
                      key={`${item.card.id}-${item.variantKey}`}
                      item={item}
                      serieId={groupSerieId}
                    />
                  ))}
                </div>
              </section>
            );
          })}
        </div>
      )}
    </div>
  );
}

function MissingCardRow({
  item,
  serieId,
}: {
  item: MissingVariant;
  serieId: string;
}) {
  return (
    <div className="flex gap-3 p-3 sm:p-4">
      <div className="relative h-24 w-17 shrink-0 overflow-hidden rounded-lg border border-white/10 bg-zinc-950 sm:h-28 sm:w-20">
        {item.card.image ? (
          <Image
            src={item.card.image}
            alt={item.card.name}
            fill
            sizes="80px"
            className="object-contain p-1"
          />
        ) : (
          <div className="flex h-full items-center justify-center px-2 text-center text-[10px] text-gray-500">
            Pas d'image
          </div>
        )}
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <div className="truncate text-base font-black text-white">
              {item.card.name}
            </div>
            <div className="mt-0.5 text-xs text-gray-400">
              {item.card.number} - {item.rarity}
            </div>
          </div>
          <span className="shrink-0 rounded-full bg-red-500/15 px-2.5 py-1 text-xs font-bold text-red-100">
            Rupture
          </span>
        </div>

        <div className="mt-2 flex flex-wrap items-center gap-2 text-xs">
          <span className="rounded-full bg-violet-500/15 px-2.5 py-1 text-violet-100">
            {variantLabel(item.variantKey)}
          </span>
          <span className="rounded-full bg-white/10 px-2.5 py-1 text-gray-200">
            {formatPrice(item.price)}
          </span>
        </div>

        <div className="mt-3 flex flex-wrap gap-2">
          <Link
            href={`/admin?serie=${encodeURIComponent(serieId)}&q=${encodeURIComponent(
              item.card.number,
            )}`}
            className="rounded-full bg-violet-600 px-3 py-2 text-xs font-bold text-white transition hover:bg-violet-500"
          >
            Modifier le stock
          </Link>
          <Link
            href={`/carte/${item.card.id}`}
            className="rounded-full bg-white/10 px-3 py-2 text-xs font-bold text-white transition hover:bg-white/20"
          >
            Voir la fiche
          </Link>
        </div>
      </div>
    </div>
  );
}
