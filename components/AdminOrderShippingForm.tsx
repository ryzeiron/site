"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

type OrderStatus =
  | "paid"
  | "label_to_create"
  | "label_created"
  | "shipped"
  | "picked_up";

const STATUS_OPTIONS: { value: OrderStatus; label: string }[] = [
  { value: "paid", label: "Commande payée" },
  { value: "label_created", label: "Prête à déposer" },
  { value: "shipped", label: "Colis à retirer" },
  { value: "picked_up", label: "Colis retiré" },
];

export default function AdminOrderShippingForm({
  orderId,
  initialStatus,
  initialExpeditionNumber,
  initialLabelUrl,
}: {
  orderId: string;
  initialStatus: string;
  initialExpeditionNumber: string | null;
  initialLabelUrl: string | null;
}) {
  const router = useRouter();

  const [status, setStatus] = useState<OrderStatus>(
    isOrderStatus(initialStatus) ? initialStatus : "paid",
  );
  const [expeditionNumber, setExpeditionNumber] = useState(
    initialExpeditionNumber ?? "",
  );
  const [labelUrl, setLabelUrl] = useState(initialLabelUrl ?? "");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  async function save({
    nextStatus,
    sendShippingEmail = false,
    sendReviewEmail = false,
  }: {
    nextStatus?: OrderStatus;
    sendShippingEmail?: boolean;
    sendReviewEmail?: boolean;
  } = {}) {
    const statusToSave = nextStatus ?? status;

    setSaving(true);
    setSaved(false);
    setError(null);
    setNotice(null);

    try {
      const response = await fetch("/api/admin/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          orderId,
          status: statusToSave,
          expeditionNumber,
          labelUrl,
          sendShippingEmail,
          sendReviewEmail,
        }),
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(data.error ?? "Erreur lors de l'enregistrement.");
      }

      setSaved(true);
      setStatus(statusToSave);

      if (data.emailSent) {
        setNotice("Email colis à retirer envoyé au client.");
      } else if (data.reviewEmailSent) {
        setNotice("Email d'avis envoyé au client.");
      }

      setTimeout(() => setSaved(false), 1600);
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erreur inconnue.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="mt-4 rounded-lg border border-white/10 bg-zinc-950/60 p-3">
      <div className="text-xs uppercase tracking-wider text-violet-300 font-semibold">
        Suivi colis
      </div>

      <div className="mt-3 grid gap-3 md:grid-cols-[180px_1fr_1fr_auto]">
        <label className="text-sm">
          <span className="block text-gray-400 mb-1">Statut</span>

          <select
            value={status}
            onChange={(e) => setStatus(e.target.value as OrderStatus)}
            className="w-full rounded bg-zinc-900 border border-white/10 text-white px-3 py-2 text-sm"
          >
            {STATUS_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>

        <label className="text-sm">
          <span className="block text-gray-400 mb-1">Numéro de suivi</span>

          <input
            type="text"
            value={expeditionNumber}
            onChange={(e) => setExpeditionNumber(e.target.value)}
            placeholder="Ex: 123456789"
            className="w-full rounded bg-zinc-900 border border-white/10 text-white px-3 py-2 text-sm"
          />
        </label>

        <label className="text-sm">
          <span className="block text-gray-400 mb-1">Lien bordereau</span>

          <input
            type="url"
            value={labelUrl}
            onChange={(e) => setLabelUrl(e.target.value)}
            placeholder="https://..."
            className="w-full rounded bg-zinc-900 border border-white/10 text-white px-3 py-2 text-sm"
          />
        </label>

        <div className="flex items-end">
          <button
            type="button"
            onClick={() => save()}
            disabled={saving}
            className={`w-full rounded px-4 py-2 text-sm font-medium transition md:w-auto ${
              saved
                ? "bg-emerald-500 text-white"
                : "bg-brand-500 hover:bg-brand-600 text-white disabled:opacity-60"
            }`}
          >
            {saved ? "OK" : saving ? "..." : "Enregistrer"}
          </button>
        </div>
      </div>

      {status === "shipped" ? (
        <button
          type="button"
          onClick={() => save({ sendShippingEmail: true })}
          disabled={saving || !expeditionNumber.trim()}
          className="mt-3 rounded bg-white/10 border border-white/20 hover:bg-white/20 text-white px-4 py-2 text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Renvoyer le mail colis à retirer
        </button>
      ) : null}

      <div className="mt-3 flex flex-wrap gap-2">
        {status !== "picked_up" ? (
          <button
            type="button"
            onClick={() =>
              save({ nextStatus: "picked_up", sendReviewEmail: true })
            }
            disabled={saving}
            className="rounded bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Colis retiré + mail avis
          </button>
        ) : (
          <button
            type="button"
            onClick={() => save({ sendReviewEmail: true })}
            disabled={saving}
            className="rounded bg-white/10 border border-white/20 hover:bg-white/20 text-white px-4 py-2 text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Renvoyer le mail d'avis
          </button>
        )}
      </div>

      {error ? <p className="mt-2 text-xs text-red-300">{error}</p> : null}

      {notice ? (
        <p className="mt-2 text-xs text-emerald-300">{notice}</p>
      ) : null}
    </div>
  );
}

function isOrderStatus(value: string): value is OrderStatus {
  return STATUS_OPTIONS.some((option) => option.value === value);
}
