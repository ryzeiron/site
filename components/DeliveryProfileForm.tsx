"use client";

import { useState } from "react";
import MondialRelayPicker, {
  type SelectedRelay,
} from "@/components/MondialRelayPicker";
import {
  DELIVERY_COUNTRIES,
  type DeliveryCountry,
  type DeliveryProfileData,
} from "@/lib/delivery-profile";

type FormState = DeliveryProfileData;

const EMPTY_PROFILE: FormState = {
  firstName: "",
  lastName: "",
  phone: "",
  address: "",
  postcode: "",
  city: "",
  country: "FR",
  relayCode: "",
  relayName: "",
  relayAddress: "",
  relayPostcode: "",
  relayCity: "",
};

function profileToState(profile: DeliveryProfileData | null): FormState {
  if (!profile) return EMPTY_PROFILE;

  return {
    firstName: profile.firstName ?? "",
    lastName: profile.lastName ?? "",
    phone: profile.phone ?? "",
    address: profile.address ?? "",
    postcode: profile.postcode ?? "",
    city: profile.city ?? "",
    country: profile.country ?? "FR",
    relayCode: profile.relayCode ?? "",
    relayName: profile.relayName ?? "",
    relayAddress: profile.relayAddress ?? "",
    relayPostcode: profile.relayPostcode ?? "",
    relayCity: profile.relayCity ?? "",
  };
}

export default function DeliveryProfileForm({
  initialProfile,
}: {
  initialProfile: DeliveryProfileData | null;
}) {
  const [form, setForm] = useState<FormState>(() =>
    profileToState(initialProfile),
  );
  const [relaySearchPostcode, setRelaySearchPostcode] = useState(
    initialProfile?.relayPostcode ?? initialProfile?.postcode ?? "",
  );
  const [showRelayPicker, setShowRelayPicker] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  function update<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  function selectRelay(relay: SelectedRelay | null) {
    if (!relay) return;

    setForm((current) => ({
      ...current,
      relayCode: relay.code,
      relayName: relay.name,
      relayAddress: relay.address,
      relayPostcode: relay.postcode,
      relayCity: relay.city,
      postcode: current.postcode || relay.postcode,
      city: current.city || relay.city,
    }));
  }

  async function saveProfile(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSaving(true);
    setMessage(null);
    setError(null);

    try {
      const res = await fetch("/api/account/delivery-profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error ?? "Enregistrement impossible.");
      }

      setMessage("Informations de livraison enregistrées.");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erreur inconnue.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <form
      onSubmit={saveProfile}
      className="rounded-2xl border border-violet-300/15 bg-zinc-950/70 p-4 text-gray-200"
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="text-lg font-bold text-white">
            Informations de livraison
          </h3>
          <p className="mt-1 text-sm text-gray-400">
            Ces informations préremplissent le panier quand tu es connecté.
          </p>
        </div>
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <Field
          label="Prénom"
          value={form.firstName ?? ""}
          onChange={(value) => update("firstName", value)}
          autoComplete="given-name"
        />
        <Field
          label="Nom"
          value={form.lastName ?? ""}
          onChange={(value) => update("lastName", value)}
          autoComplete="family-name"
        />
        <Field
          label="Téléphone"
          value={form.phone ?? ""}
          onChange={(value) => update("phone", value)}
          autoComplete="tel"
        />
        <label className="block text-sm">
          <span className="text-gray-300">Pays</span>
          <select
            value={form.country}
            onChange={(e) =>
              update("country", e.target.value as DeliveryCountry)
            }
            className="mt-1 w-full rounded bg-zinc-900 border border-white/10 px-3 py-2 text-white"
          >
            {DELIVERY_COUNTRIES.map((country) => (
              <option key={country.code} value={country.code}>
                {country.label}
              </option>
            ))}
          </select>
        </label>
        <label className="block text-sm sm:col-span-2">
          <span className="text-gray-300">Adresse</span>
          <input
            type="text"
            value={form.address ?? ""}
            onChange={(e) => update("address", e.target.value)}
            className="mt-1 w-full rounded bg-zinc-900 border border-white/10 px-3 py-2 text-white"
            autoComplete="street-address"
          />
        </label>
        <Field
          label="Code postal"
          value={form.postcode ?? ""}
          onChange={(value) => {
            update("postcode", value);
            if (!relaySearchPostcode) setRelaySearchPostcode(value);
          }}
          autoComplete="postal-code"
        />
        <Field
          label="Ville"
          value={form.city ?? ""}
          onChange={(value) => update("city", value)}
          autoComplete="address-level2"
        />
      </div>

      <div className="mt-4 rounded-xl border border-white/10 bg-white/[0.03] p-3">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <div className="font-semibold text-white">Point relais favori</div>
            {form.relayCode ? (
              <div className="mt-1 text-sm text-gray-300">
                <div>{form.relayName}</div>
                <div className="text-xs text-gray-500">
                  {form.relayAddress} - {form.relayPostcode} {form.relayCity}
                </div>
              </div>
            ) : (
              <p className="mt-1 text-sm text-gray-400">
                Aucun point relais favori enregistré.
              </p>
            )}
          </div>

          {form.relayCode && (
            <button
              type="button"
              onClick={() =>
                setForm((current) => ({
                  ...current,
                  relayCode: "",
                  relayName: "",
                  relayAddress: "",
                  relayPostcode: "",
                  relayCity: "",
                }))
              }
              className="rounded-full bg-white/10 px-3 py-1.5 text-xs text-gray-300 hover:bg-red-500/15 hover:text-red-300"
            >
              Retirer
            </button>
          )}
        </div>

        {showRelayPicker ? (
          <div className="mt-3 space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <input
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                value={relaySearchPostcode}
                onChange={(e) =>
                  setRelaySearchPostcode(
                    e.target.value.replace(/[^0-9]/g, "").slice(0, 5),
                  )
                }
                placeholder="Code postal"
                className="w-32 rounded bg-zinc-900 border border-white/10 px-3 py-2 text-sm text-white"
              />
              <button
                type="button"
                onClick={() => setShowRelayPicker(false)}
                className="text-xs text-gray-400 hover:text-white"
              >
                Fermer
              </button>
            </div>

            {relaySearchPostcode.length === 5 && (
              <MondialRelayPicker
                postcode={relaySearchPostcode}
                country={form.country}
                onSelect={selectRelay}
              />
            )}
          </div>
        ) : (
          <button
            type="button"
            onClick={() => {
              setRelaySearchPostcode(
                form.relayPostcode || form.postcode || relaySearchPostcode,
              );
              setShowRelayPicker(true);
            }}
            className="mt-3 rounded-full border border-dashed border-violet-300/30 px-4 py-2 text-sm text-violet-100 hover:border-violet-300/60"
          >
            Choisir un point relais favori
          </button>
        )}
      </div>

      {message && (
        <p className="mt-3 rounded border border-emerald-500/30 bg-emerald-500/10 p-2 text-sm text-emerald-200">
          {message}
        </p>
      )}
      {error && (
        <p className="mt-3 rounded border border-red-500/30 bg-red-500/10 p-2 text-sm text-red-200">
          {error}
        </p>
      )}

      <button
        type="submit"
        disabled={saving}
        className="mt-4 rounded-full bg-violet-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-violet-700 disabled:opacity-60"
      >
        {saving ? "Enregistrement..." : "Enregistrer"}
      </button>
    </form>
  );
}

function Field({
  label,
  value,
  onChange,
  autoComplete,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  autoComplete?: string;
}) {
  return (
    <label className="block text-sm">
      <span className="text-gray-300">{label}</span>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="mt-1 w-full rounded bg-zinc-900 border border-white/10 px-3 py-2 text-white"
        autoComplete={autoComplete}
      />
    </label>
  );
}
