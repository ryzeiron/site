import Link from "next/link";

export default function NotFound() {
  return (
    <div className="py-16 text-center">
      <h1 className="text-3xl font-bold">Page introuvable</h1>
      <p className="mt-2 text-gray-600">
        Cette page n&apos;existe pas ou a ete deplacee.
      </p>
      <Link
        href="/"
        className="mt-6 inline-block rounded-full bg-brand-500 hover:bg-brand-600 text-white px-6 py-3 font-medium"
      >
        Retour a l&apos;accueil
      </Link>
    </div>
  );
}
