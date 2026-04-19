import Link from "next/link";

export default function Footer() {
  return (
    <footer className="border-t border-amber-200 bg-amber-50 mt-12">
      <div className="max-w-6xl mx-auto px-4 py-8 grid grid-cols-1 md:grid-cols-3 gap-6 text-sm">
        <div>
          <h3 className="font-semibold mb-2">La boutique</h3>
          <p className="text-gray-600">
            Micro-entreprise specialisee dans la vente de cartes Pokemon singles et scellees.
          </p>
        </div>
        <div>
          <h3 className="font-semibold mb-2">Informations</h3>
          <ul className="space-y-1 text-gray-700">
            <li><Link href="/mentions-legales" className="hover:text-brand-600">Mentions legales</Link></li>
            <li><Link href="/cgv" className="hover:text-brand-600">CGV</Link></li>
            <li><Link href="/contact" className="hover:text-brand-600">Contact</Link></li>
          </ul>
        </div>
        <div>
          <h3 className="font-semibold mb-2">Paiement securise</h3>
          <p className="text-gray-600">
            Paiement par carte bancaire via Stripe. Livraison suivie partout en France.
          </p>
        </div>
      </div>
      <div className="border-t border-amber-200 py-4 text-center text-xs text-gray-500">
        (c) {new Date().getFullYear()} - Tous droits reserves.
      </div>
    </footer>
  );
}
