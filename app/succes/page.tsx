import Link from "next/link";
import { redirect } from "next/navigation";
import SuccessClearCart from "@/components/SuccessClearCart";

export const dynamic = "force-dynamic";

type Search = { session_id?: string };

export default async function SuccessPage({
  searchParams,
}: {
  searchParams: Promise<Search>;
}) {
  const { session_id: sessionId } = await searchParams;

  if (sessionId) {
    redirect(`/suivi-commande/${sessionId}`);
  }

  return (
    <div className="py-16 text-center">
      <SuccessClearCart />

      <h1 className="text-3xl font-bold text-white">
        Merci pour votre commande !
      </h1>

      <p className="mt-3 text-gray-300 max-w-xl mx-auto">
        Le paiement a bien ete recu. Vous allez recevoir un email de
        confirmation. Votre commande sera expediee sous 48h.
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
