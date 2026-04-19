import type { Metadata } from "next";

export const metadata: Metadata = { title: "Conditions generales de vente" };

export default function CgvPage() {
  return (
    <article className="prose max-w-none">
      <h1 className="text-3xl font-bold">Conditions generales de vente</h1>
      <p className="text-sm text-gray-500">
        Document type a adapter a votre activite. En cas de doute consultez un
        juriste ou utilisez un generateur de CGV officiel.
      </p>

      <h2 className="mt-6 text-xl font-semibold">1. Objet</h2>
      <p className="text-gray-700">
        Les presentes CGV regissent la vente de cartes a collectionner Pokemon
        par [Votre nom / raison sociale], micro-entrepreneur, a destination de
        particuliers majeurs residant en France metropolitaine et dans les pays
        indiques lors de la commande.
      </p>

      <h2 className="mt-6 text-xl font-semibold">2. Prix</h2>
      <p className="text-gray-700">
        Les prix sont indiques en euros toutes taxes comprises (TVA non
        applicable, art. 293 B du CGI). Les frais de livraison sont ajoutes au
        moment du paiement.
      </p>

      <h2 className="mt-6 text-xl font-semibold">3. Commande et paiement</h2>
      <p className="text-gray-700">
        Les paiements sont realises par carte bancaire via Stripe. La commande
        n&apos;est validee qu&apos;apres encaissement.
      </p>

      <h2 className="mt-6 text-xl font-semibold">4. Livraison</h2>
      <p className="text-gray-700">
        Les commandes sont expediees sous 48h ouvrees apres reception du
        paiement. Le mode de livraison est choisi par l&apos;acheteur lors du
        paiement (lettre suivie ou Colissimo).
      </p>

      <h2 className="mt-6 text-xl font-semibold">5. Droit de retractation</h2>
      <p className="text-gray-700">
        Conformement a l&apos;article L221-18 du Code de la consommation,
        l&apos;acheteur dispose d&apos;un delai de 14 jours pour exercer son
        droit de retractation a compter de la reception du colis.
      </p>

      <h2 className="mt-6 text-xl font-semibold">6. Donnees personnelles</h2>
      <p className="text-gray-700">
        Les donnees collectees sont utilisees exclusivement pour le traitement
        des commandes. Vous pouvez exercer vos droits RGPD en nous contactant
        via la page contact.
      </p>
    </article>
  );
}
