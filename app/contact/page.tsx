import type { Metadata } from "next";

export const metadata: Metadata = { title: "Contact" };

export default function ContactPage() {
  return (
    <div className="max-w-2xl">
      <h1 className="text-3xl font-bold text-white">Contact</h1>
      <p className="mt-2 text-gray-300">
        Une question sur une carte, une commande, une demande specifique ?
        Ecrivez-nous, on vous repond sous 48h.
      </p>

      <div className="mt-8 rounded-lg border border-white/10 bg-zinc-900/70 backdrop-blur-sm p-6 space-y-3 text-gray-200">
        <div>
          <div className="text-xs uppercase text-gray-400">Email</div>
          <a href="mailto:contact@exemple.fr" className="text-brand-500 hover:underline">
            contact@exemple.fr
          </a>
        </div>
        <div>
          <div className="text-xs uppercase text-gray-400">Adresse</div>
          <div>[Adresse postale de la micro-entreprise]</div>
        </div>
        <div>
          <div className="text-xs uppercase text-gray-400">Horaires</div>
          <div>Lundi - Vendredi, 9h - 18h</div>
        </div>
      </div>
    </div>
  );
}
