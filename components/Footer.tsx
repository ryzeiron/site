import Link from "next/link";

export default function Footer() {
  return (
    <footer className="border-t border-white/10 bg-black/60 backdrop-blur-md text-gray-300 mt-12">
      <div className="max-w-6xl mx-auto px-4 py-8 grid grid-cols-1 md:grid-cols-3 gap-6 text-sm">
        <div>
          <h3 className="font-semibold mb-2 text-white">La boutique</h3>
          <p className="text-gray-400">
            Micro-entreprise spécialisée dans la vente de cartes Pokémon singles
            et scellées.
          </p>
        </div>

        <div>
          <h3 className="font-semibold mb-2 text-white">Informations</h3>
          <ul className="space-y-1 text-gray-300">
            <li>
              <Link href="/mentions-legales" className="hover:text-brand-500">
                Mentions légales
              </Link>
            </li>
            <li>
              <Link
                href="/politique-confidentialite"
                className="hover:text-brand-500"
              >
                Politique de confidentialité
              </Link>
            </li>
            <li>
              <Link href="/cgv" className="hover:text-brand-500">
                CGV
              </Link>
            </li>
            <li>
              <Link href="/contact" className="hover:text-brand-500">
                Contact
              </Link>
            </li>
          </ul>
        </div>

        <div>
          <h3 className="font-semibold mb-2 text-white">Paiement sécurisé</h3>
          <p className="text-gray-400">
            Paiement par carte bancaire via Stripe. Livraison suivie partout en
            France.
          </p>
        </div>
      </div>

      <div className="border-t border-white/10 py-4 text-center text-xs text-gray-500">
        © {new Date().getFullYear()} - Tous droits réservés.
      </div>
    </footer>
  );
}
