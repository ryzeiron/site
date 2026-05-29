"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { signIn } from "next-auth/react";
import MondialRelayPicker, {
  type SelectedRelay,
} from "@/components/MondialRelayPicker";
import {
  DELIVERY_COUNTRIES,
  type DeliveryCountry,
} from "@/lib/delivery-profile";

export default function SignupPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [postcode, setPostcode] = useState("");
  const [city, setCity] = useState("");
  const [country, setCountry] = useState<DeliveryCountry>("FR");
  const [showRelayPicker, setShowRelayPicker] = useState(false);
  const [relayPostcode, setRelayPostcode] = useState("");
  const [selectedRelay, setSelectedRelay] = useState<SelectedRelay | null>(
    null,
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email,
          password,
          name,
          deliveryProfile: {
            firstName,
            lastName,
            phone,
            address,
            postcode,
            city,
            country,
            relayCode: selectedRelay?.code,
            relayName: selectedRelay?.name,
            relayAddress: selectedRelay?.address,
            relayPostcode: selectedRelay?.postcode,
            relayCity: selectedRelay?.city,
          },
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Inscription impossible.");

      const signInRes = await signIn("credentials", {
        email,
        password,
        redirect: false,
      });
      if (signInRes?.error) {
        throw new Error("Compte créé mais connexion échouée. Réessaie.");
      }
      router.push("/compte");
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erreur inconnue.");
      setLoading(false);
    }
  }

  return (
    <div className="max-w-md mx-auto py-12">
      <h1 className="text-3xl font-bold text-white">Créer un compte</h1>
      <p className="mt-2 text-sm text-gray-400">
        Déjà inscrit ?{" "}
        <Link href="/connexion" className="text-violet-300 hover:underline">
          Se connecter
        </Link>
      </p>

      <form onSubmit={handleSubmit} className="mt-6 space-y-4">
        <div>
          <label className="block text-sm text-gray-300 mb-1">
            Nom (facultatif)
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full rounded bg-zinc-900 border border-white/10 text-white px-3 py-2"
            autoComplete="name"
          />
        </div>

        <div>
          <label className="block text-sm text-gray-300 mb-1">Email</label>
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full rounded bg-zinc-900 border border-white/10 text-white px-3 py-2"
            autoComplete="email"
          />
        </div>

        <div>
          <label className="block text-sm text-gray-300 mb-1">
            Mot de passe (8 caractères min.)
          </label>
          <input
            type="password"
            required
            minLength={8}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full rounded bg-zinc-900 border border-white/10 text-white px-3 py-2"
            autoComplete="new-password"
          />
        </div>

        <div className="rounded-2xl border border-violet-300/15 bg-zinc-950/70 p-4">
          <div className="text-sm font-semibold text-white">
            Livraison rapide
          </div>
          <p className="mt-1 text-xs text-gray-400">
            Ces informations sont facultatives et prérempliront ton panier.
          </p>

          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <div>
              <label className="block text-sm text-gray-300 mb-1">
                Prénom
              </label>
              <input
                type="text"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                className="w-full rounded bg-zinc-900 border border-white/10 text-white px-3 py-2"
                autoComplete="given-name"
              />
            </div>

            <div>
              <label className="block text-sm text-gray-300 mb-1">Nom</label>
              <input
                type="text"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                className="w-full rounded bg-zinc-900 border border-white/10 text-white px-3 py-2"
                autoComplete="family-name"
              />
            </div>

            <div>
              <label className="block text-sm text-gray-300 mb-1">
                Téléphone
              </label>
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full rounded bg-zinc-900 border border-white/10 text-white px-3 py-2"
                autoComplete="tel"
              />
            </div>

            <div>
              <label className="block text-sm text-gray-300 mb-1">Pays</label>
              <select
                value={country}
                onChange={(e) => setCountry(e.target.value as DeliveryCountry)}
                className="w-full rounded bg-zinc-900 border border-white/10 text-white px-3 py-2"
              >
                {DELIVERY_COUNTRIES.map((item) => (
                  <option key={item.code} value={item.code}>
                    {item.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="sm:col-span-2">
              <label className="block text-sm text-gray-300 mb-1">
                Adresse
              </label>
              <input
                type="text"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                className="w-full rounded bg-zinc-900 border border-white/10 text-white px-3 py-2"
                autoComplete="street-address"
              />
            </div>

            <div>
              <label className="block text-sm text-gray-300 mb-1">
                Code postal
              </label>
              <input
                type="text"
                value={postcode}
                onChange={(e) => {
                  const value = e.target.value.replace(/[^0-9]/g, "").slice(0, 5);
                  setPostcode(value);
                  if (!relayPostcode) setRelayPostcode(value);
                }}
                className="w-full rounded bg-zinc-900 border border-white/10 text-white px-3 py-2"
                autoComplete="postal-code"
              />
            </div>

            <div>
              <label className="block text-sm text-gray-300 mb-1">Ville</label>
              <input
                type="text"
                value={city}
                onChange={(e) => setCity(e.target.value)}
                className="w-full rounded bg-zinc-900 border border-white/10 text-white px-3 py-2"
                autoComplete="address-level2"
              />
            </div>
          </div>

          <div className="mt-4 rounded-xl border border-white/10 bg-white/[0.03] p-3">
            <div className="text-sm font-semibold text-white">
              Point relais favori
            </div>

            {selectedRelay ? (
              <div className="mt-2 text-sm text-emerald-200">
                <div className="font-semibold">{selectedRelay.name}</div>
                <div className="text-xs text-emerald-200/80">
                  {selectedRelay.address} - {selectedRelay.postcode}{" "}
                  {selectedRelay.city}
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedRelay(null)}
                  className="mt-2 text-xs text-gray-400 hover:text-red-300"
                >
                  Retirer
                </button>
              </div>
            ) : (
              <p className="mt-1 text-xs text-gray-400">
                Tu pourras aussi le choisir plus tard dans ton compte.
              </p>
            )}

            {showRelayPicker ? (
              <div className="mt-3 space-y-2">
                <div className="flex flex-wrap items-center gap-2">
                  <input
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    value={relayPostcode}
                    onChange={(e) =>
                      setRelayPostcode(
                        e.target.value.replace(/[^0-9]/g, "").slice(0, 5),
                      )
                    }
                    placeholder="Code postal"
                    className="w-32 rounded bg-zinc-900 border border-white/10 text-white px-3 py-2 text-sm"
                  />
                  <button
                    type="button"
                    onClick={() => setShowRelayPicker(false)}
                    className="text-xs text-gray-400 hover:text-white"
                  >
                    Fermer
                  </button>
                </div>

                {relayPostcode.length === 5 && (
                  <MondialRelayPicker
                    postcode={relayPostcode}
                    country={country}
                    onSelect={(relay) => {
                      if (relay) setSelectedRelay(relay);
                    }}
                  />
                )}
              </div>
            ) : (
              <button
                type="button"
                onClick={() => {
                  setRelayPostcode(relayPostcode || postcode);
                  setShowRelayPicker(true);
                }}
                className="mt-3 rounded-full border border-dashed border-violet-300/30 px-4 py-2 text-sm text-violet-100 hover:border-violet-300/60"
              >
                Choisir un point relais favori
              </button>
            )}
          </div>
        </div>

        {error && (
          <p className="text-sm text-red-300 bg-red-500/10 border border-red-500/30 rounded p-2">
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-full bg-brand-500 hover:bg-brand-600 disabled:opacity-60 text-white px-6 py-3 font-medium"
        >
          {loading ? "Création..." : "Créer mon compte"}
        </button>
      </form>
    </div>
  );
}
