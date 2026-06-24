"use client";

import { useState } from "react";

type Order = {
  id: string;
  status: string;
  country: string | null;
  relayName: string | null;
  relayAddress: string | null;
  relayPostcode: string | null;
  relayCity: string | null;
  relayCode: string | null;
  tracking: string | null;
  createdAt: string;
};

const STATUS_LABEL: Record<string, { label: string; color: string }> = {
  paid: { label: "Paiement validé", color: "bg-emerald-500/20 text-emerald-200" },
  label_to_create: {
    label: "À préparer",
    color: "bg-amber-500/20 text-amber-200",
  },
  label_created: {
    label: "Prête à déposer",
    color: "bg-violet-500/20 text-violet-200",
  },
  shipped: {
    label: "Expédiée",
    color: "bg-blue-500/20 text-blue-200",
  },
  ready_for_pickup: {
    label: "Colis à retirer",
    color: "bg-violet-500/20 text-violet-200",
  },
  picked_up: { label: "Retirée", color: "bg-fuchsia-500/20 text-fuchsia-200" },
  delivered: { label: "Livrée", color: "bg-emerald-500/20 text-emerald-200" },
  cancelled: { label: "Annulée", color: "bg-red-500/20 text-red-200" },
};

function formatDate(iso: string) {
  return new Date(iso).toLocaleString("fr-FR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function OrderTracker() {
  const [id, setId] = useState("");
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [order, setOrder] = useState<Order | null>(null);

  async function lookup(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setOrder(null);
    try {
      const res = await fetch("/api/order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: id.trim(), email: email.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Erreur");
      setOrder(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erreur");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      <form
        onSubmit={lookup}
        className="rounded-lg border border-white/10 bg-zinc-900/70 backdrop-blur-sm p-6 space-y-3 text-gray-200"
      >
        <div>
          <label className="text-xs uppercase text-gray-400">
            Numéro de commande
          </label>
          <input
            type="text"
            required
            value={id}
            onChange={(e) => setId(e.target.value)}
            placeholder="cs_test_a..."
            className="mt-1 w-full rounded bg-zinc-900 border border-white/10 text-white px-3 py-2 text-sm font-mono"
          />
        </div>
        <div>
          <label className="text-xs uppercase text-gray-400">Email</label>
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="email@exemple.com"
            className="mt-1 w-full rounded bg-zinc-900 border border-white/10 text-white px-3 py-2 text-sm"
          />
        </div>
        {error && (
          <p className="text-sm text-red-300 bg-red-500/10 border border-red-500/30 rounded p-2">
            {error}
          </p>
        )}
        <button
          type="submit"
          disabled={loading}
          className="rounded-full bg-brand-500 hover:bg-brand-600 disabled:opacity-60 text-white px-6 py-3 font-medium"
        >
          {loading ? "Recherche..." : "Voir ma commande"}
        </button>
      </form>

      {order && (
        <div className="rounded-lg border border-white/10 bg-zinc-900/70 backdrop-blur-sm p-6 text-gray-200 space-y-3">
          <div className="flex flex-wrap items-center gap-3">
            <h2 className="text-xl font-semibold text-white">
              Commande {order.id.slice(0, 14)}...
            </h2>
            <span
              className={`text-xs uppercase tracking-wider font-semibold rounded px-2 py-1 ${
                STATUS_LABEL[order.status]?.color ??
                "bg-gray-500/20 text-gray-300"
              }`}
            >
              {STATUS_LABEL[order.status]?.label ?? order.status}
            </span>
          </div>
          <div className="text-xs text-gray-400">
            Passée le {formatDate(order.createdAt)}
            {order.country ? ` - ${order.country}` : ""}
          </div>

          {order.relayName && (
            <div className="rounded bg-emerald-500/10 border border-emerald-500/30 p-3 text-sm">
              <div className="text-xs uppercase tracking-wider text-emerald-300 font-semibold mb-1">
                Point relais
              </div>
              <div className="text-white font-semibold">{order.relayName}</div>
              <div className="text-emerald-100/80 text-xs">
                {order.relayAddress}
                {order.relayPostcode || order.relayCity ? (
                  <>
                    <br />
                    {order.relayPostcode} {order.relayCity}
                  </>
                ) : null}
              </div>
              {order.relayCode && (
                <div className="text-emerald-200/60 text-xs mt-1">
                  Code Mondial Relay : {order.relayCode}
                </div>
              )}
            </div>
          )}

          {order.tracking ? (
            <div className="rounded bg-violet-500/10 border border-violet-500/30 p-3 text-sm">
              <div className="text-xs uppercase tracking-wider text-violet-300 font-semibold mb-1">
                Numéro de suivi Mondial Relay
              </div>
              <div className="text-white font-mono text-sm">
                {order.tracking}
              </div>
              <a
                href={`https://www.mondialrelay.fr/suivi-de-colis?numeroExpedition=${order.tracking}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-violet-200 hover:text-white text-xs underline mt-1 inline-block"
              >
                Suivre sur Mondial Relay -&gt;
              </a>
            </div>
          ) : (
            <p className="text-sm text-gray-400">
              Le numéro de suivi sera disponible dès l&apos;expédition (vous
              recevrez un email).
            </p>
          )}
        </div>
      )}
    </div>
  );
}
