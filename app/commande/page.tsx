import type { Metadata } from "next";
import OrderTracker from "@/components/OrderTracker";

export const metadata: Metadata = { title: "Suivi de commande" };

export default function OrderLookupPage() {
  return (
    <div className="max-w-2xl">
      <h1 className="text-3xl font-bold text-white">Suivi de commande</h1>
      <p className="mt-2 text-gray-300">
        Entre ton numero de commande (recu par email apres paiement) et ton
        adresse email pour voir ou en est ta commande.
      </p>
      <div className="mt-6">
        <OrderTracker />
      </div>
    </div>
  );
}
