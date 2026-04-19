import Link from "next/link";
import type { Bloc } from "@/lib/catalog";
import { seriesForBloc } from "@/lib/catalog";

export default function BlocTile({ bloc }: { bloc: Bloc }) {
  const seriesCount = seriesForBloc(bloc.id).length;
  return (
    <Link
      href={`/blocs/${bloc.id}`}
      className="card-hover group relative block rounded-xl overflow-hidden shadow-sm border border-amber-100"
    >
      <div
        className={`relative bg-gradient-to-br ${bloc.coverColor} h-40 flex items-end p-4 overflow-hidden`}
      >
        {bloc.image && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={bloc.image}
            alt={bloc.name}
            className="absolute inset-0 w-full h-full object-cover"
          />
        )}
        {bloc.image && (
          <div className="absolute inset-0 bg-black/40" />
        )}
        <div className="relative text-white">
          <div className="text-xs uppercase opacity-80">Bloc</div>
          <div className="text-2xl font-bold drop-shadow">{bloc.name}</div>
        </div>
      </div>
      <div className="p-4 bg-white">
        <p className="text-sm text-gray-600">{bloc.tagline}</p>
        <p className="mt-2 text-xs text-gray-500">
          {seriesCount} serie{seriesCount > 1 ? "s" : ""} disponible
          {seriesCount > 1 ? "s" : ""}
        </p>
      </div>
    </Link>
  );
}
