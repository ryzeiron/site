import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Conditions generales de vente",
};

export default function CgvPage() {
  return (
    <article className="prose prose-invert max-w-none">
      <h1 className="text-3xl font-bold text-white">
        Conditions générales de vente
      </h1>

      <p className="text-sm text-gray-400">
        Dernière mise à jour : 12 mai 2026
      </p>

      <p className="text-gray-300">
        Les présentes conditions générales de vente s’appliquent à toutes les
        commandes passées sur le site PokeDel62.
      </p>

      <h2 className="mt-8 text-xl font-semibold text-white">1. Vendeur</h2>
      <p className="text-gray-300">
        Le site PokeDel62 est exploité par une micro-entreprise spécialisée dans la
        vente de cartes Pokémon à collectionner.
      </p>
      <ul className="mt-2 space-y-1 text-gray-300">
        <li>Nom commercial : PokeDel62</li>
        <li>Statut : Micro-entrepreneur</li>
        <li>SIREN / SIRET : 75347133300025</li>
        <li>Email : contact@pokedel62.fr</li>
      </ul>

      <h2 className="mt-6 text-xl font-semibold text-white">
        2. Produits proposés
      </h2>
      <p className="text-gray-300">
        PokeDel62 propose à la vente des cartes Pokémon à l’unité, 
        lorsque ceux-ci sont disponibles. Chaque fiche produit
        indique les informations disponibles : nom de la carte, série, numéro,
        rareté, langue, état, prix, stock et visuels lorsque ceux-ci sont
        fournis.
      </p>
      <p className="text-gray-300">
        Les cartes proposées sur le site sont contrôlées avant leur mise en
        vente. PokeDel62 ne vend pas de contrefaçon.
      </p>

      <h2 className="mt-6 text-xl font-semibold text-white">3. Prix</h2>
      <p className="text-gray-300">
        Les prix sont indiqués en euros. TVA non applicable, article 293 B du
        Code général des impôts. Les frais de livraison sont ajoutés au moment de
        la commande avant le paiement.
      </p>
      <p className="text-gray-300">
        PokeDel62 se réserve le droit de modifier ses prix à tout moment. Le prix
        appliqué est celui affiché au moment de la validation de la commande.
      </p>

      <h2 className="mt-6 text-xl font-semibold text-white">
        4. Commande
      </h2>
      <p className="text-gray-300">
        Le client sélectionne les produits souhaités, les ajoute au panier, puis
        vérifie le contenu de sa commande avant le paiement. La commande est
        considérée comme validée uniquement après confirmation du paiement.
      </p>
      <p className="text-gray-300">
        En validant sa commande, le client accepte les présentes conditions
        générales de vente.
      </p>

      <h2 className="mt-6 text-xl font-semibold text-white">
        5. Paiement
      </h2>
      <p className="text-gray-300">
        Le paiement est réalisé en ligne par carte bancaire via Stripe. PokeDel62
        ne stocke pas les numéros de carte bancaire. La commande est préparée
        après validation effective du paiement.
      </p>

      <h2 className="mt-6 text-xl font-semibold text-white">
        6. Disponibilité des produits
      </h2>
      <p className="text-gray-300">
        Les stocks sont mis à jour automatiquement. En cas d’erreur exceptionnelle
        de stock après paiement, PokeDel62 contactera le client afin de proposer un
        remplacement, un avoir ou un remboursement du produit indisponible.
      </p>

      <h2 className="mt-6 text-xl font-semibold text-white">
        7. Livraison
      </h2>
      <p className="text-gray-300">
        Les commandes sont préparées avec soin et expédiées à l’adresse ou au
        point relais choisi lors de la commande. Les délais de préparation sont
        généralement de 48 heures ouvrées après validation du paiement, sauf
        période de forte activité ou information contraire indiquée sur le site.
      </p>
      <p className="text-gray-300">
        Un numéro de suivi est communiqué au client lorsque le colis est
        expédié. Les délais de transport dépendent du transporteur sélectionné.
      </p>

      <h2 className="mt-6 text-xl font-semibold text-white">
        8. Réception de la commande
      </h2>
      <p className="text-gray-300">
        Le client doit vérifier l’état du colis à la réception. En cas de colis
        endommagé, ouvert ou anormal, il est conseillé de refuser le colis ou de
        faire constater le problème auprès du transporteur, puis de contacter
        PokeDel62 rapidement.
      </p>

      <h2 className="mt-6 text-xl font-semibold text-white">
        9. Droit de rétractation
      </h2>
      <p className="text-gray-300">
        Conformément à l’article L221-18 du Code de la consommation, le client
        consommateur dispose d’un délai de 14 jours à compter de la réception de
        sa commande pour exercer son droit de rétractation, sans avoir à motiver
        sa décision.
      </p>
      <p className="text-gray-300">
        Pour exercer ce droit, le client doit contacter PokeDel62 par email à
        l’adresse contact@pokedel62.fr avant la fin du délai de 14 jours.
      </p>
      <p className="text-gray-300">
        Les produits doivent être retournés complets, non détériorés et dans un
        état permettant leur remise en vente. Les produits scellés ouverts,
        descellés ou endommagés par le client peuvent ne pas être repris.
      </p>
      <p className="text-gray-300">
        Les frais de retour sont à la charge du client, sauf erreur de PokeDel62 ou
        produit non conforme.
      </p>

      <h2 className="mt-6 text-xl font-semibold text-white">
        10. Remboursement
      </h2>
      <p className="text-gray-300">
        En cas de rétractation valable, le remboursement est effectué après
        réception et vérification des produits retournés, via le moyen de paiement
        utilisé lors de la commande.
      </p>
      <p className="text-gray-300">
        Le remboursement peut être diminué si le produit retourné a subi une
        dépréciation résultant d’une manipulation excessive ou d’un dommage causé
        par le client.
      </p>

      <h2 className="mt-6 text-xl font-semibold text-white">
        11. Garanties légales
      </h2>
      <p className="text-gray-300">
        Les produits bénéficient des garanties légales applicables, notamment la
        garantie légale de conformité et la garantie contre les vices cachés,
        dans les conditions prévues par la loi.
      </p>
      <p className="text-gray-300">
        En cas de produit non conforme à la commande, le client doit contacter
        PokeDel62 avec les informations de commande et, si possible, des photos du
        problème constaté.
      </p>

      <h2 className="mt-6 text-xl font-semibold text-white">
        12. Responsabilité
      </h2>
      <p className="text-gray-300">
        PokeDel62 ne saurait être tenu responsable des retards ou incidents liés au
        transporteur, sauf disposition légale contraire. La responsabilité de
        PokeDel62 est limitée au montant de la commande concernée.
      </p>

      <h2 className="mt-6 text-xl font-semibold text-white">
        13. Données personnelles
      </h2>
      <p className="text-gray-300">
        Les données personnelles collectées lors de la commande sont utilisées
        pour le traitement de la commande, le paiement, la livraison et le service
        client. Plus d’informations sont disponibles dans la{" "}
        <Link href="/politique-confidentialite">
          politique de confidentialité
        </Link>
        .
      </p>

      <h2 className="mt-6 text-xl font-semibold text-white">
        14. Service client
      </h2>
      <p className="text-gray-300">
        Pour toute question concernant une commande, un produit, une livraison ou
        un retour, le client peut contacter PokeDel62 :
      </p>
      <ul className="mt-2 space-y-1 text-gray-300">
        <li>Email : contact@pokedel62.fr</li>
        <li>
          Page contact :{" "}
          <Link href="/contact">
            https://pokedel62.fr/contact
          </Link>
        </li>
      </ul>

      <h2 className="mt-6 text-xl font-semibold text-white">
        15. Droit applicable
      </h2>
      <p className="text-gray-300">
        Les présentes conditions générales de vente sont soumises au droit
        français.
      </p>
    </article>
  );
}
