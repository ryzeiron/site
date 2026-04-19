import Link from "next/link";
import type { Bloc, Serie } from "@/lib/catalog";
import { cardsForSerie } from "@/lib/catalog";

export default function SerieTile({ bloc, serie }: { bloc: Bloc; serie: Serie }) {
  const count = cardsForSerie(serie.id).length;
  return (
    <Link
      href={`/blocs/${bloc.id}/${serie.id}`}
      className="card-hover block rounded-lg border border-amber-100 bg-white p-4"
    >
      <div
        className={`inline-block rounded bg-gradient-to-br ${bloc.coverColor} text-white text-xs font-semibold px-2 py-1`}
      >
        {serie.code}
      </div>
      <h3 className="mt-2 font-semibold">{serie.name}</h3>
      <p className="text-xs text-gray-500 mt-1">{serie.releaseYear}</p>
      <p className="text-sm text-gray-600 mt-2">
        {count} carte{count > 1 ? "s" : ""} en vente
      </p>
    </Link>
  );
}
