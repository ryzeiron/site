import type { Metadata } from "next";

export const metadata: Metadata = { title: "Mentions légales" };

export default function MentionsLegalesPage() {
  return (
    <article className="prose prose-invert max-w-none">
      <h1 className="text-3xl font-bold text-white">Mentions légales</h1>

      <p className="text-sm text-gray-400">
        Dernière mise à jour : 12 mai 2026
      </p>

      <h2 className="mt-8 text-xl font-semibold text-white">Éditeur du site</h2>
      <ul className="mt-2 space-y-1 text-gray-300">
        <li>Nom commercial : PokeDel62</li>
        <li>Statut : Micro-entrepreneur</li>
        <li>SIREN / SIRET : 75347133300025</li>
        <li>Adresse : disponible sur demande légitime</li>
        <li>Email : contact@pokedel62.fr</li>
      </ul>

      <h2 className="mt-6 text-xl font-semibold text-white">Hébergement</h2>
      <p className="text-gray-300">
        Site hébergé par Vercel Inc., 440 N Barranca Ave #4133, Covina, CA
        91723, États-Unis.
      </p>
      <p className="text-gray-300">
        Site web :{" "}
        <a href="https://vercel.com" target="_blank" rel="noreferrer">
          https://vercel.com
        </a>
      </p>

      <h2 className="mt-6 text-xl font-semibold text-white">Paiement</h2>
      <p className="text-gray-300">
        Les paiements en ligne sont traités par Stripe Payments Europe, Ltd.
        PokeDel62 ne stocke pas les numéros de carte bancaire.
      </p>

      <h2 className="mt-6 text-xl font-semibold text-white">TVA</h2>
      <p className="text-gray-300">
        TVA non applicable, article 293 B du Code général des impôts.
      </p>

      <h2 className="mt-6 text-xl font-semibold text-white">
        Propriété intellectuelle
      </h2>
      <p className="text-gray-300">
        L’ensemble du contenu présent sur le site PokeDel62, incluant notamment les
        textes, éléments graphiques, logos, visuels et interfaces, est protégé par
        le droit de la propriété intellectuelle lorsqu’il appartient à PokeDel62 ou
        à ses partenaires.
      </p>

      <h2 className="mt-6 text-xl font-semibold text-white">
        Marques et licences
      </h2>
      <p className="text-gray-300">
        Pokémon est une marque appartenant à ses titulaires respectifs. PokeDel62
        est une boutique indépendante et n’est pas affiliée, sponsorisée ou
        approuvée par The Pokémon Company, Nintendo, Game Freak ou Creatures Inc.
      </p>

      <h2 className="mt-6 text-xl font-semibold text-white">
        Données personnelles
      </h2>
      <p className="text-gray-300">
        Les informations relatives au traitement des données personnelles sont
        détaillées dans la politique de confidentialité du site.
      </p>
    </article>
  );
}
