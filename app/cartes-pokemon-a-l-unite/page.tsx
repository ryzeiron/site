import type { Metadata } from "next";
import SeoLandingPage from "@/components/SeoLandingPage";
import { getSeoCards } from "@/lib/seo-pages";

export const metadata: Metadata = {
  title: "Cartes Pokémon à l'unité",
  description:
    "Achetez des cartes Pokémon françaises à l'unité sur PokeDel62 : cartes communes, reverses, ultra rares, secrètes et promos.",
  alternates: { canonical: "/cartes-pokemon-a-l-unite" },
};

export default function CartesPokemonUnitePage() {
  return (
    <SeoLandingPage
      eyebrow="Cartes Pokémon"
      title="Cartes Pokémon à l'unité"
      description="Trouve des cartes Pokémon françaises à l'unité pour compléter ton classeur, remplacer une carte manquante ou ajouter une rareté à ta collection."
      highlights={[
        "Cartes françaises",
        "Paiement sécurisé Stripe",
        "Livraison Mondial Relay",
      ]}
      cards={getSeoCards("singles")}
    />
  );
}
