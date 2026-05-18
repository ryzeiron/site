"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { signIn } from "next-auth/react";

export default function SignupPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
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
        body: JSON.stringify({ email, password, name }),
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
