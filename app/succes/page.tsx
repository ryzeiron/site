import Link from "next/link";
import SuccessClearCart from "@/components/SuccessClearCart";
import { getStripe } from "@/lib/stripe";

export const dynamic = "force-dynamic";

type Search = { session_id?: string };

type RelayInfo = {
  code: string;
  name?: string;
  address?: string;
  postcode?: string;
  city?: string;
};

async function getRelayFromSession(sessionId: string): Promise<RelayInfo | null> {
  try {
    const stripe = getStripe();
    const session = await stripe.checkout.sessions.retrieve(sessionId);
    const m = session.metadata ?? {};
    if (!m.relay_code) return null;
    return {
      code: m.relay_code,
      name: m.relay_name,
      address: m.relay_address,
      postcode: m.relay_postcode,
      city: m.relay_city,
    };
  } catch {
    return null;
  }
}

export default async function SuccessPage({
  searchParams,
}: {
  searchParams: Promise<Search>;
}) {
  const { session_id: sessionId } = await searchParams;
  const relay = sessionId ? await getRelayFromSession(sessionId) : null;

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
      {relay && (
        <div className="mt-6 max-w-md mx-auto rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-4 text-left">
          <div className="text-xs uppercase tracking-wider text-emerald-300 font-semibold">
            Point relais selectionne
          </div>
          <div className="mt-2 text-white font-semibold">{relay.name}</div>
          <div className="text-sm text-emerald-100/80">
            {relay.address}
            {relay.postcode || relay.city ? (
              <>
                <br />
                {relay.postcode} {relay.city}
              </>
            ) : null}
          </div>
          <div className="text-xs text-emerald-200/60 mt-2">
            Code Mondial Relay : {relay.code}
          </div>
        </div>
      )}
      <Link
        href="/blocs"
        className="mt-8 inline-block rounded-full bg-brand-500 hover:bg-brand-600 text-white px-6 py-3 font-medium"
      >
        Continuer mes achats
      </Link>
    </div>
  );
}
