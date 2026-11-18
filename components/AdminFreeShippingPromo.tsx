"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  formatPromoDate,
  getFreeShippingPromoStatus,
  type FreeShippingPromo,
} from "@/lib/free-shipping-promo-shared";

const DURATION_PRESETS: { label: string; hours: number | null }[] = [
  { label: "24 h", hours: 24 },
  { label: "48 h", hours: 48 },
  { label: "3 jours", hours: 72 },
  { label: "7 jours", hours: 168 },
  { label: "14 jours", hours: 336 },
  { label: "1 mois", hours: 720 },
  { label: "Sans fin", hours: null },
];

const STATUS_STYLES = {
  live: { label: "EN COURS", className: "bg-emerald-500/15 text-emerald-200 ring-emerald-400/40" },
  scheduled: { label: "PROGRAMMÉE", className: "bg-sky-500/15 text-sky-200 ring-sky-400/40" },
  ended: { label: "TERMINÉE", className: "bg-amber-500/15 text-amber-200 ring-amber-400/40" },
  inactive: { label: "INACTIVE", className: "bg-white/10 text-gray-300 ring-white/15" },
} as const;

// <input type="datetime-local"> travaille en heure locale du navigateur, sans fuseau.
function isoToLocalInput(iso: string | null) {
  if (!iso) return "";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(
    date.getHours(),
  )}:${pad(date.getMinutes())}`;
}

function localInputToIso(value: string) {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

export default function AdminFreeShippingPromo({
  initialPromo,
}: {
  initialPromo: FreeShippingPromo;
}) {
  const router = useRouter();
  const [promo, setPromo] = useState(initialPromo);
  // Rempli apres le montage : le serveur ne connait pas le fuseau du navigateur.
  const [mounted, setMounted] = useState(false);
  const [startInput, setStartInput] = useState("");
  const [endInput, setEndInput] = useState("");
  const [insuranceIncluded, setInsuranceIncluded] = useState(initialPromo.insuranceIncluded);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    setStartInput(isoToLocalInput(initialPromo.startsAt));
    setEndInput(isoToLocalInput(initialPromo.endsAt));
    setMounted(true);
  }, [initialPromo.startsAt, initialPromo.endsAt]);

  // Le badge passe tout seul de "programmée" a "en cours" puis "terminée".
  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 30_000);
    return () => window.clearInterval(timer);
  }, []);

  const status = getFreeShippingPromoStatus(promo, now);
  const statusStyle = STATUS_STYLES[status];
  const dirty =
    mounted &&
    (localInputToIso(startInput) !== promo.startsAt ||
    localInputToIso(endInput) !== promo.endsAt ||
    insuranceIncluded !== promo.insuranceIncluded);

  function applyPreset(hours: number | null) {
    if (hours === null) {
      setEndInput("");
      return;
    }
    const startIso = localInputToIso(startInput);
    const startTime = startIso ? Math.max(Date.parse(startIso), Date.now()) : Date.now();
    setEndInput(isoToLocalInput(new Date(startTime + hours * 3_600_000).toISOString()));
  }

  async function save(active: boolean) {
    setLoading(true);
    setError("");
    setMessage("");

    try {
      const response = await fetch("/api/admin/free-shipping", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          active,
          startsAt: localInputToIso(startInput),
          endsAt: localInputToIso(endInput),
          insuranceIncluded,
        }),
      });
      const data = (await response.json().catch(() => ({}))) as {
        promo?: FreeShippingPromo;
        error?: string;
      };

      if (!response.ok || !data.promo) {
        throw new Error(data.error || "Impossible d'enregistrer la promo.");
      }

      setPromo(data.promo);
      setStartInput(isoToLocalInput(data.promo.startsAt));
      setEndInput(isoToLocalInput(data.promo.endsAt));
      setInsuranceIncluded(data.promo.insuranceIncluded);
      setNow(Date.now());
      setMessage(active ? "Promo livraison offerte activée." : "Promo livraison offerte désactivée.");
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erreur inconnue.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="mb-6 rounded-2xl border border-emerald-400/20 bg-zinc-950/70 p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold text-white">Livraison offerte sur tout le site</h2>
          <p className="mt-1 text-sm text-gray-400">
            Frais de port Mondial Relay à 0 € pour toutes les commandes pendant la durée choisie.
          </p>
        </div>
        <span
          className={`rounded-full px-3 py-1 text-xs font-black tracking-wide ring-1 ${statusStyle.className}`}
        >
          {statusStyle.label}
        </span>
      </div>

      <div className="mt-4 inline-flex rounded-xl border border-white/10 bg-zinc-900 p-1">
        <button
          type="button"
          disabled={loading}
          onClick={() => save(true)}
          className={`rounded-lg px-5 py-2 text-sm font-black transition disabled:opacity-60 ${
            promo.active
              ? "bg-emerald-500 text-zinc-950"
              : "text-gray-300 hover:bg-emerald-500/15 hover:text-emerald-100"
          }`}
        >
          ACTIF
        </button>
        <button
          type="button"
          disabled={loading}
          onClick={() => save(false)}
          className={`rounded-lg px-5 py-2 text-sm font-black transition disabled:opacity-60 ${
            !promo.active
              ? "bg-red-500/80 text-white"
              : "text-gray-300 hover:bg-red-500/15 hover:text-red-100"
          }`}
        >
          INACTIF
        </button>
      </div>

      <p className="mt-2 text-sm text-gray-300">
        {status === "live"
          ? promo.endsAt
            ? `En cours jusqu'au ${formatPromoDate(promo.endsAt)}.`
            : "En cours, sans date de fin."
          : status === "scheduled" && promo.startsAt
            ? `Démarre le ${formatPromoDate(promo.startsAt)}${
                promo.endsAt ? `, jusqu'au ${formatPromoDate(promo.endsAt)}` : ""
              }.`
            : status === "ended"
              ? "La durée est terminée : la livraison est de nouveau payante."
              : "La livraison est payante normalement."}
      </p>

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <div className="space-y-2">
          <div className="text-sm font-semibold text-gray-200">Durée</div>
          <div className="flex flex-wrap gap-2">
            {DURATION_PRESETS.map((preset) => (
              <button
                key={preset.label}
                type="button"
                onClick={() => applyPreset(preset.hours)}
                className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-semibold text-gray-200 transition hover:border-emerald-400/60 hover:text-white"
              >
                {preset.label}
              </button>
            ))}
          </div>
          <div className="grid gap-2 sm:grid-cols-2">
            <label className="space-y-1 text-xs text-gray-400">
              <span>Début (vide = tout de suite)</span>
              <input
                type="datetime-local"
                value={startInput}
                onChange={(e) => setStartInput(e.target.value)}
                className="w-full rounded-lg border border-white/10 bg-zinc-900 px-3 py-2 text-sm text-white"
              />
            </label>
            <label className="space-y-1 text-xs text-gray-400">
              <span>Fin (vide = sans fin)</span>
              <input
                type="datetime-local"
                value={endInput}
                onChange={(e) => setEndInput(e.target.value)}
                className="w-full rounded-lg border border-white/10 bg-zinc-900 px-3 py-2 text-sm text-white"
              />
            </label>
          </div>
        </div>

        <div className="space-y-2">
          <div className="text-sm font-semibold text-gray-200">
            Assurance Mondial Relay (paniers dès 50 €)
          </div>
          <div className="grid gap-2">
            <label className="flex cursor-pointer items-center gap-3 rounded-lg border border-white/10 bg-zinc-900 px-3 py-2 text-sm text-gray-200">
              <input
                type="radio"
                name="free-shipping-insurance"
                checked={!insuranceIncluded}
                onChange={() => setInsuranceIncluded(false)}
                className="accent-emerald-500"
              />
              Le client paie l'assurance
            </label>
            <label className="flex cursor-pointer items-center gap-3 rounded-lg border border-white/10 bg-zinc-900 px-3 py-2 text-sm text-gray-200">
              <input
                type="radio"
                name="free-shipping-insurance"
                checked={insuranceIncluded}
                onChange={() => setInsuranceIncluded(true)}
                className="accent-emerald-500"
              />
              Assurance offerte aussi
            </label>
          </div>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-3">
        <button
          type="button"
          disabled={loading || !dirty}
          onClick={() => save(promo.active)}
          className="rounded-lg bg-emerald-500 px-4 py-2 text-sm font-bold text-zinc-950 transition hover:bg-emerald-400 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {loading ? "Enregistrement..." : "Enregistrer la durée et l'assurance"}
        </button>
        {dirty && !loading ? (
          <span className="text-xs text-amber-200">Modifications non enregistrées.</span>
        ) : null}
        {message ? <span className="text-sm text-emerald-200">{message}</span> : null}
        {error ? <span className="text-sm text-red-300">{error}</span> : null}
      </div>
    </section>
  );
}
