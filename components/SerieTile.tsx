import Link from "next/link";
import type { Bloc, Serie } from "@/lib/catalog";
import { cardsForSerie } from "@/lib/catalog";

export default function SerieTile({ bloc, serie }: { bloc: Bloc; serie: Serie }) {
  const count = cardsForSerie(serie.id).length;
  return (
    <Link
      href={`/blocs/${bloc.id}/${serie.id}`}
      className="card-hover block rounded-lg border border-white/10 bg-zinc-900/70 backdrop-blur-sm overflow-hidden text-gray-200"
    >
      <div
        className={`relative aspect-[4/3] bg-gradient-to-br ${bloc.coverColor} overflow-hidden flex items-center justify-center`}
      >
        {serie.image ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={serie.image}
            alt={serie.name}
            className="absolute inset-0 w-full h-full object-cover"
          />
        ) : (
          <div className="relative text-white text-center px-3 drop-shadow">
            <div className="text-[10px] uppercase tracking-widest opacity-80">
              Serie
            </div>
            <div className="text-3xl md:text-4xl font-extrabold leading-tight">
              {serie.code}
            </div>
          </div>
        )}
      </div>
      <div className="p-4">
        <div
          className={`inline-block rounded bg-gradient-to-br ${bloc.coverColor} text-white text-xs font-semibold px-2 py-1`}
        >
          {serie.code}
        </div>
        <h3 className="mt-2 font-semibold text-white">{serie.name}</h3>
        <p className="text-xs text-gray-500 mt-1">{serie.releaseYear}</p>
        <p className="text-sm text-gray-400 mt-2">
          {count} carte{count > 1 ? "s" : ""} en vente
        </p>
      </div>
    </Link>
  );
}
