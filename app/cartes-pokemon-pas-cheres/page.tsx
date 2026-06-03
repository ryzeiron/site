import type { Metadata } from "next";
import SeoLandingPage from "@/components/SeoLandingPage";
import { getSeoCards } from "@/lib/seo-pages";

export const metadata: Metadata = {
  title: "Cartes Pokémon pas chères",
  description:
    "Cartes Pokémon à petit prix sur PokeDel62, avec des cartes à l'unité dès 0,50 euro selon le stock disponible.",
  alternates: { canonical: "/cartes-pokemon-pas-cheres" },
};

export default function CartesPokemonPasCheresPage() {
  return (
    <SeoLandingPage
      eyebrow="Petits prix"
      title="Cartes Pokémon pas chères"
      description="Une sélection de cartes Pokémon à l'unité pour compléter une collection sans exploser le budget, avec le code BIENVENUE pour la première commande."
      highlights={[
        "Cartes dès 0,50 euro",
        "Idéal pour compléter un set",
        "Code BIENVENUE",
      ]}
      cards={getSeoCards("cheap")}
    />
  );
}
