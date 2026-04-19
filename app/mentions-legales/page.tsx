import type { Metadata } from "next";

export const metadata: Metadata = { title: "Mentions legales" };

export default function MentionsLegalesPage() {
  return (
    <article className="prose prose-invert max-w-none">
      <h1 className="text-3xl font-bold text-white">Mentions legales</h1>
      <p className="text-sm text-gray-400">
        A completer avec les informations de votre micro-entreprise.
      </p>

      <h2 className="mt-8 text-xl font-semibold text-white">Editeur du site</h2>
      <ul className="mt-2 text-gray-300 space-y-1">
        <li>Nom / Raison sociale : [Votre nom / Raison sociale]</li>
        <li>Statut : Micro-entrepreneur</li>
        <li>SIREN / SIRET : [Numero SIREN / SIRET]</li>
        <li>Adresse : [Adresse postale]</li>
        <li>Email : [adresse@email.fr]</li>
        <li>Telephone : [Telephone]</li>
      </ul>

      <h2 className="mt-6 text-xl font-semibold text-white">Hebergement</h2>
      <p className="text-gray-300">
        Site heberge par Vercel Inc., 440 N Barranca Ave #4133, Covina, CA 91723, USA.
      </p>

      <h2 className="mt-6 text-xl font-semibold text-white">Paiement</h2>
      <p className="text-gray-300">
        Les paiements en ligne sont traites par Stripe Payments Europe, Ltd.
      </p>

      <h2 className="mt-6 text-xl font-semibold text-white">TVA</h2>
      <p className="text-gray-300">
        TVA non applicable, article 293 B du CGI (franchise en base de TVA).
      </p>
    </article>
  );
}
