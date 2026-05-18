import Link from "next/link";

export default function CancelPage() {
  return (
    <div className="py-16 text-center">
      <h1 className="text-3xl font-bold text-white">Paiement annulé</h1>
      <p className="mt-3 text-gray-300 max-w-xl mx-auto">
        Aucun montant n&apos;a été prélevé. Votre panier est toujours disponible
        si vous souhaitez reprendre votre commande.
      </p>
      <div className="mt-8 flex justify-center gap-3">
        <Link
          href="/panier"
          className="rounded-full bg-brand-500 hover:bg-brand-600 text-white px-6 py-3 font-medium"
        >
          Retour au panier
        </Link>
        <Link
          href="/"
          className="rounded-full bg-white/10 border border-white/20 hover:bg-white/20 text-white px-6 py-3"
        >
          Accueil
        </Link>
      </div>
    </div>
  );
}
