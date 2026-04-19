"use client";

import Link from "next/link";
import { useEffect } from "react";
import { useCart } from "@/lib/cart";

export default function SuccessPage() {
  const clear = useCart((s) => s.clear);
  useEffect(() => {
    clear();
  }, [clear]);

  return (
    <div className="py-16 text-center">
      <h1 className="text-3xl font-bold">Merci pour votre commande !</h1>
      <p className="mt-3 text-gray-600 max-w-xl mx-auto">
        Le paiement a bien ete recu. Vous allez recevoir un email de confirmation.
        Votre commande sera expediee sous 48h.
      </p>
      <Link
        href="/blocs"
        className="mt-8 inline-block rounded-full bg-brand-500 hover:bg-brand-600 text-white px-6 py-3 font-medium"
      >
        Continuer mes achats
      </Link>
    </div>
  );
}
