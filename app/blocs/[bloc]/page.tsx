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
  return { title: bloc ? bloc.name : "Bloc" };
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

  return (
    <div>
      <nav className="text-sm text-gray-500">
        <Link href="/blocs" className="hover:underline">Blocs</Link> /{" "}
        <span>{bloc.name}</span>
      </nav>
      <div
        className={`relative mt-4 rounded-2xl bg-gradient-to-br ${bloc.coverColor} text-white p-8 overflow-hidden`}
      >
        {bloc.image && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={bloc.image}
            alt={bloc.name}
            className="absolute inset-0 w-full h-full object-cover"
          />
        )}
        {bloc.image && <div className="absolute inset-0 bg-black/50" />}
        <div className="relative">
          <div className="text-xs uppercase opacity-80">Bloc</div>
          <h1 className="text-3xl md:text-4xl font-bold">{bloc.name}</h1>
          <p className="mt-2 opacity-90 max-w-2xl">{bloc.tagline}</p>
        </div>
      </div>

      <h2 className="mt-8 text-xl font-bold">Series</h2>
      {series.length === 0 ? (
        <p className="text-gray-500 mt-2">Aucune serie pour le moment.</p>
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
