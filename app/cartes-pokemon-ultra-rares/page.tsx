import type { Metadata } from "next";
import SeoLandingPage from "@/components/SeoLandingPage";
import { getSeoCards } from "@/lib/seo-pages";

export const metadata: Metadata = {
  title: "Cartes Pokémon ultra rares",
  description:
    "Sélection de cartes Pokémon Ultra Rare françaises disponibles à l'unité sur PokeDel62.",
  alternates: { canonical: "/cartes-pokemon-ultra-rares" },
};

export default function CartesPokemonUltraRaresPage() {
  return (
    <SeoLandingPage
      eyebrow="Ultra rares"
      title="Cartes Pokémon ultra rares"
      description="Retrouve les cartes Pokémon Ultra Rare en français disponibles à l'unité, avec paiement sécurisé et expédition suivie."
      highlights={[
        "Ultra rares FR",
        "Protection soignée",
        "Stock suivi",
      ]}
      cards={getSeoCards("ultraRare")}
    />
  );
}
