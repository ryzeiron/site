import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import SerieTile from "@/components/SerieTile";
import { BLOCS, getBloc, seriesForBloc } from "@/lib/catalog";

type Params = { bloc: string };

export function generateStaticParams(): Params[] {
  return BLOCS.map((b) => ({ bloc: b.id }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<Params>;
}): Promise<Metadata> {
  const { bloc: blocId } = await params;
  const bloc = getBloc(blocId);
  if (!bloc) return { title: "Bloc" };

  return {
    title: bloc.name,
    description: `Retrouvez les cartes Pokémon françaises du bloc ${bloc.name} à l'unité sur PokeDel62.`,
    alternates: { canonical: `/blocs/${bloc.id}` },
  };
}

export default async function BlocPage({
  params,
}: {
  params: Promise<Params>;
}) {
  const { bloc: blocId } = await params;
  const bloc = getBloc(blocId);
  if (!bloc) notFound();
  const series = seriesForBloc(bloc.id);
  const imageFit = bloc.imageFit ?? "cover";

  return (
    <div>
      <nav className="text-sm text-gray-400">
        <Link href="/blocs" className="hover:underline hover:text-white">Blocs</Link> /{" "}
        <span className="text-gray-200">{bloc.name}</span>
      </nav>
      <div
        className={`relative mt-4 min-h-[190px] overflow-hidden rounded-2xl bg-gradient-to-br ${bloc.coverColor} p-8 text-white shadow-lg shadow-black/30 md:min-h-[220px]`}
      >
        {bloc.image && (
          <>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={bloc.image}
              alt={bloc.name}
              className={
                imageFit === "contain"
                  ? "absolute inset-0 h-full w-full object-contain p-6 md:p-10"
                  : "absolute inset-0 h-full w-full object-cover"
              }
            />
            <div className="absolute inset-0 bg-gradient-to-r from-black/75 via-black/45 to-black/20" />
          </>
        )}
        <div className="relative max-w-2xl">
          <div className="text-xs uppercase opacity-80">Bloc</div>
          <h1 className="text-3xl md:text-4xl font-bold">{bloc.name}</h1>
          <p className="mt-2 opacity-90 max-w-2xl">{bloc.tagline}</p>
        </div>
      </div>

      <p className="mt-4 max-w-3xl text-sm leading-6 text-gray-300">
        Retrouvez les cartes Pokémon françaises du bloc {bloc.name} à l'unité :
        séries, raretés, reverses, promos et cartes de collection disponibles
        selon le stock.
      </p>

      <h2 className="mt-8 text-xl font-bold text-white">Séries</h2>
      {series.length === 0 ? (
        <p className="text-gray-400 mt-2">Aucune série pour le moment.</p>
      ) : (
        <div className="mt-4 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
          {series.map((s) => (
            <SerieTile key={s.id} bloc={bloc} serie={s} />
          ))}
        </div>
      )}
    </div>
  );
}
