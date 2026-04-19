import type { Metadata } from "next";
import BlocTile from "@/components/BlocTile";
import { BLOCS } from "@/lib/catalog";

export const metadata: Metadata = {
  title: "Tous les blocs",
};

export default function BlocsPage() {
  return (
    <div>
      <h1 className="text-3xl font-bold text-white">Les blocs Pokemon</h1>
      <p className="text-gray-300 mt-2">
        Chaque bloc correspond a une generation de cartes. Clique pour voir les
        series et les cartes disponibles a la vente.
      </p>
      <div className="mt-8 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {BLOCS.map((b) => (
          <BlocTile key={b.id} bloc={b} />
        ))}
      </div>
    </div>
  );
}
