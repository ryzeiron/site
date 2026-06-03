import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Préparation des commandes",
  description:
    "Comment PokeDel62 prépare les commandes : vérification des cartes, protection, sleeve, toploader et expédition suivie.",
  alternates: { canonical: "/preparation-commandes" },
};

const STEPS = [
  {
    title: "Vérification",
    text: "La carte, la langue, l'état et la rareté sont contrôlés avant l'emballage.",
  },
  {
    title: "Protection",
    text: "Les cartes sont protégées avec sleeve, protection rigide si besoin et emballage adapté.",
  },
  {
    title: "Expédition",
    text: "La commande est préparée pour un envoi suivi, notamment via Mondial Relay.",
  },
];

export default function PreparationCommandesPage() {
  return (
    <div className="space-y-8">
      <section className="rounded-2xl border border-violet-300/20 bg-zinc-950/80 p-6 text-gray-100 shadow-lg shadow-black/20 backdrop-blur-sm md:p-10">
        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-violet-300">
          Confiance
        </p>
        <h1 className="mt-2 text-3xl font-extrabold tracking-tight text-white md:text-4xl">
          Préparation des commandes
        </h1>
        <p className="mt-3 max-w-3xl text-sm leading-6 text-gray-300 md:text-base">
          Chaque commande PokeDel62 est préparée avec soin pour protéger les
          cartes pendant le transport et garder une expérience claire du panier
          jusqu'au retrait du colis.
        </p>
      </section>

      <section className="grid gap-4 md:grid-cols-3">
        {STEPS.map((step) => (
          <article
            key={step.title}
            className="rounded-lg border border-white/10 bg-zinc-950/75 p-5 text-gray-100 backdrop-blur-sm"
          >
            <div className="text-xs font-semibold uppercase tracking-[0.18em] text-violet-300">
              Étape
            </div>
            <h2 className="mt-2 text-xl font-bold text-white">{step.title}</h2>
            <p className="mt-2 text-sm leading-6 text-gray-300">{step.text}</p>
          </article>
        ))}
      </section>

      <section className="rounded-2xl border border-white/10 bg-zinc-950/75 p-6 text-gray-100 backdrop-blur-sm md:p-8">
        <h2 className="text-2xl font-bold text-white">Avant l'envoi</h2>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-gray-300">
          Les cartes de valeur peuvent recevoir une protection plus rigide, et
          les commandes plus importantes sont emballées avec une attention
          supplémentaire. Le paiement reste sécurisé via Stripe.
        </p>
        <div className="mt-5 flex flex-wrap gap-3">
          <Link
            href="/avis"
            className="rounded-full bg-violet-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-violet-700"
          >
            Voir les avis
          </Link>
          <Link
            href="/contact"
            className="rounded-full border border-violet-300/40 px-5 py-2.5 text-sm font-semibold text-violet-100 transition hover:bg-violet-500/15"
          >
            Poser une question
          </Link>
        </div>
      </section>
    </div>
  );
}
