import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Politique de confidentialité",
};

export default function PolitiqueConfidentialitePage() {
  return (
    <article className="prose prose-invert max-w-none">
      <h1 className="text-3xl font-bold text-white">
        Politique de confidentialité
      </h1>

      <p className="text-sm text-gray-400">
        Dernière mise à jour : 29 mai 2026
      </p>

      <p className="text-gray-300">
        La présente politique explique quelles données personnelles sont
        collectées sur PokeDel62, pourquoi elles sont utilisées et quels sont vos
        droits.
      </p>

      <h2 className="mt-8 text-xl font-semibold text-white">
        1. Responsable du traitement
      </h2>
      <p className="text-gray-300">
        Le responsable du traitement est PokeDel62, micro-entreprise spécialisée
        dans la vente de cartes Pokémon à collectionner.
      </p>
      <ul className="mt-2 space-y-1 text-gray-300">
        <li>Nom / raison sociale : PokeDel62</li>
        <li>SIREN / SIRET : 75347133300025</li>
        <li>Email de contact : contact@pokedel62.fr</li>
      </ul>

      <h2 className="mt-6 text-xl font-semibold text-white">
        2. Données collectées
      </h2>
      <p className="text-gray-300">
        Selon votre utilisation du site, nous pouvons collecter les données
        suivantes :
      </p>
      <ul className="mt-2 space-y-1 text-gray-300">
        <li>
          informations de compte et de livraison : nom, prénom, adresse email,
          téléphone, adresse, point relais favori et mot de passe chiffré ;
        </li>
        <li>
          informations de commande : nom, email, téléphone, adresse de livraison,
          point relais, produits commandés et statut de commande ;
        </li>
        <li>
          informations de paiement : le paiement est traité par Stripe, PokeDel62
          ne stocke pas les numéros de carte bancaire ;
        </li>
        <li>
          informations liées aux favoris : cartes ajoutées en favori afin de
          recevoir une notification de retour en stock ;
        </li>
        <li>
          avis clients : note, commentaire et compte associé à l’avis publié ;
        </li>
        <li>
          messages envoyés via le formulaire de contact : nom, email, téléphone
          éventuel, sujet et message.
        </li>
      </ul>

      <h2 className="mt-6 text-xl font-semibold text-white">
        3. Finalités d’utilisation
      </h2>
      <p className="text-gray-300">
        Les données personnelles sont utilisées uniquement pour :
      </p>
      <ul className="mt-2 space-y-1 text-gray-300">
        <li>créer et gérer votre compte client ;</li>
        <li>traiter vos commandes et organiser la livraison ;</li>
        <li>envoyer les emails liés aux commandes, au suivi et aux favoris ;</li>
        <li>répondre aux demandes envoyées via le formulaire de contact ;</li>
        <li>afficher les avis clients publiés sur le site ;</li>
        <li>sécuriser le site et prévenir les abus.</li>
      </ul>

      <h2 className="mt-6 text-xl font-semibold text-white">
        4. Bases légales
      </h2>
      <p className="text-gray-300">
        Les traitements sont réalisés selon les bases légales suivantes :
      </p>
      <ul className="mt-2 space-y-1 text-gray-300">
        <li>
          exécution du contrat pour la création du compte, la commande, le
          paiement et la livraison ;
        </li>
        <li>
          obligation légale pour la conservation des informations nécessaires à
          la comptabilité et aux justificatifs de vente ;
        </li>
        <li>
          intérêt légitime pour la sécurité du site, la gestion du service client
          et la prévention des abus ;
        </li>
        <li>
          consentement ou action volontaire lorsque vous publiez un avis ou
          ajoutez une carte en favori.
        </li>
      </ul>

      <h2 className="mt-6 text-xl font-semibold text-white">
        5. Destinataires et prestataires
      </h2>
      <p className="text-gray-300">
        Les données peuvent être transmises uniquement aux prestataires
        nécessaires au fonctionnement du site :
      </p>
      <ul className="mt-2 space-y-1 text-gray-300">
        <li>Stripe pour le paiement sécurisé ;</li>
        <li>Mondial Relay ou le transporteur choisi pour la livraison ;</li>
        <li>Resend pour l’envoi des emails transactionnels ;</li>
        <li>Vercel pour l’hébergement du site ;</li>
        <li>Neon pour l’hébergement de la base de données.</li>
      </ul>

      <h2 className="mt-6 text-xl font-semibold text-white">
        6. Durée de conservation
      </h2>
      <p className="text-gray-300">
        Les données sont conservées uniquement le temps nécessaire aux finalités
        décrites ci-dessus :
      </p>
      <ul className="mt-2 space-y-1 text-gray-300">
        <li>compte client : jusqu’à la suppression du compte ;</li>
        <li>
          commandes : le temps nécessaire au traitement, au service après-vente et
          aux obligations légales ;
        </li>
        <li>messages de contact : le temps nécessaire au traitement de la demande ;</li>
        <li>favoris : jusqu’au retrait du favori ou à la suppression du compte ;</li>
        <li>avis clients : jusqu’à suppression de l’avis ou du compte associé.</li>
      </ul>

      <h2 className="mt-6 text-xl font-semibold text-white">
        7. Cookies et traceurs
      </h2>
      <p className="text-gray-300">
        Le site utilise uniquement des cookies ou stockages nécessaires au bon
        fonctionnement du service, notamment pour la connexion au compte, le
        panier, la sécurité et le suivi de commande.
      </p>
      <p className="text-gray-300">
        Aucun cookie publicitaire, pixel marketing ou outil de suivi publicitaire
        n’est utilisé à ce jour. Si ces outils sont ajoutés plus tard, un bandeau
        de consentement sera mis en place.
      </p>

      <h2 className="mt-6 text-xl font-semibold text-white">
        8. Vos droits
      </h2>
      <p className="text-gray-300">
        Conformément au RGPD, vous pouvez demander l’accès, la rectification, la
        suppression ou la limitation de vos données personnelles. Vous pouvez
        également vous opposer à certains traitements lorsque la loi le permet.
      </p>
      <p className="text-gray-300">
        Pour exercer vos droits, contactez-nous à l’adresse suivante :
        <br />
        <a href="mailto:contact@pokedel62.fr">contact@pokedel62.fr</a>
      </p>

      <h2 className="mt-6 text-xl font-semibold text-white">
        9. Réclamation
      </h2>
      <p className="text-gray-300">
        Si vous estimez que vos droits ne sont pas respectés, vous pouvez
        introduire une réclamation auprès de la CNIL :
        <br />
        <a href="https://www.cnil.fr" target="_blank" rel="noreferrer">
          www.cnil.fr
        </a>
      </p>

      <div className="mt-8 rounded-lg border border-violet-400/30 bg-violet-500/10 p-4 text-sm text-violet-100">
        Pour toute question concernant vos données personnelles, vous pouvez
        aussi utiliser la page{" "}
        <Link href="/contact" className="font-semibold underline">
          contact
        </Link>
        .
      </div>
    </article>
  );
}
