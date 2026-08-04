import type { Metadata } from "next";
import SeoLandingPage from "@/components/SeoLandingPage";
import { getSeoCards } from "@/lib/seo-pages";

export const metadata: Metadata = {
  title: "Cartes Pokémon françaises",
  description:
    "Sélection de cartes Pokémon FR à l'unité : langue française, visuels vérifiés et stock suivi sur PokeDel62.",
  alternates: { canonical: "/cartes-pokemon-francaises" },
};

export default function CartesPokemonFrancaisesPage() {
  return (
    <SeoLandingPage
      eyebrow="Cartes FR"
      title="Cartes Pokémon françaises"
      description="PokeDel62 met en avant des cartes Pokémon en français pour les collectionneurs qui veulent éviter les mauvaises langues dans leur classeur."
      highlights={[
        "Langue FR",
        "Rareté indiquée sur chaque carte",
        "Avis clients visibles",
      ]}
      cards={getSeoCards("french")}
    />
  );
}
