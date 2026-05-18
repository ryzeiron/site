"use client";

import Link from "next/link";
import { useState } from "react";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    await fetch("/api/auth/forgot-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
    }).catch(() => {});
    setSubmitted(true);
    setLoading(false);
  }

  return (
    <div className="max-w-md mx-auto py-12">
      <h1 className="text-3xl font-bold text-white">Mot de passe oublié</h1>

      {submitted ? (
        <div className="mt-6 rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-4 text-emerald-100">
          <p>
            Si un compte existe avec cet email, tu vas recevoir un lien pour
            choisir un nouveau mot de passe (valide 1h).
          </p>
          <p className="mt-3 text-sm">
            <Link href="/connexion" className="text-emerald-300 hover:underline">
              Retour à la connexion
            </Link>
          </p>
        </div>
      ) : (
        <>
          <p className="mt-2 text-sm text-gray-400">
            Entre ton email, on t&apos;envoie un lien pour réinitialiser ton mot de
            passe.
          </p>

          <form onSubmit={handleSubmit} className="mt-6 space-y-4">
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

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-full bg-brand-500 hover:bg-brand-600 disabled:opacity-60 text-white px-6 py-3 font-medium"
            >
              {loading ? "Envoi..." : "Envoyer le lien"}
            </button>

            <p className="text-center text-sm text-gray-400">
              <Link href="/connexion" className="hover:text-violet-300">
                Retour à la connexion
              </Link>
            </p>
          </form>
        </>
      )}
    </div>
  );
}
