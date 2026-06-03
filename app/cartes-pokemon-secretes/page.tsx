import type { Metadata } from "next";
import SeoLandingPage from "@/components/SeoLandingPage";
import { getSeoCards } from "@/lib/seo-pages";

export const metadata: Metadata = {
  title: "Cartes Pokémon secrètes",
  description:
    "Cartes Pokémon secrètes françaises à l'unité : raretés, cartes de collection et derniers ajouts sur PokeDel62.",
  alternates: { canonical: "/cartes-pokemon-secretes" },
};

export default function CartesPokemonSecretesPage() {
  return (
    <SeoLandingPage
      eyebrow="Secrètes"
      title="Cartes Pokémon secrètes"
      description="Une page dédiée aux cartes Pokémon secrètes en français, pensée pour les collectionneurs qui cherchent les raretés les plus visibles."
      highlights={[
        "Cartes secrètes FR",
        "Fiches détaillées",
        "Paiement Stripe",
      ]}
      cards={getSeoCards("secret")}
    />
  );
}
