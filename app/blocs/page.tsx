import type { Metadata } from "next";
import BlocTile from "@/components/BlocTile";
import { BLOCS } from "@/lib/catalog";

export const metadata: Metadata = {
  title: "Tous les blocs",
};

export default function BlocsPage() {
  return (
    <div>
      <h1 className="text-3xl font-bold text-white">Les blocs Pokémon</h1>
      <p className="text-gray-300 mt-2">
        Chaque bloc correspond à une génération de cartes. Clique pour voir les
        séries et les cartes disponibles à la vente.
      </p>
      <div className="mt-8 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {BLOCS.map((b) => (
          <BlocTile key={b.id} bloc={b} />
        ))}
      </div>
    </div>
  );
}
