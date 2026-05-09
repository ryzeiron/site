"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";

function ResetForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token") ?? "";

  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  if (!token) {
    return (
      <div className="rounded-lg border border-red-500/30 bg-red-500/10 p-4 text-red-200">
        Lien invalide. Demande un nouveau lien depuis{" "}
        <Link
          href="/mot-de-passe-oublie"
          className="text-red-100 underline"
        >
          la page mot de passe oublie
        </Link>
        .
      </div>
    );
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (password !== confirm) {
      setError("Les deux mots de passe ne correspondent pas.");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Erreur.");
      setSuccess(true);
      setTimeout(() => router.push("/connexion"), 2000);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erreur inconnue.");
      setLoading(false);
    }
  }

  if (success) {
    return (
      <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-4 text-emerald-100">
        Mot de passe mis a jour ! Redirection vers la connexion...
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-sm text-gray-300 mb-1">
          Nouveau mot de passe (8 caracteres min.)
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

      <div>
        <label className="block text-sm text-gray-300 mb-1">
          Confirmer le mot de passe
        </label>
        <input
          type="password"
          required
          minLength={8}
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
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
        {loading ? "Mise a jour..." : "Choisir ce mot de passe"}
      </button>
    </form>
  );
}

export default function ResetPasswordPage() {
  return (
    <div className="max-w-md mx-auto py-12">
      <h1 className="text-3xl font-bold text-white">
        Choisir un nouveau mot de passe
      </h1>
      <p className="mt-2 text-sm text-gray-400 mb-6">
        Choisis un nouveau mot de passe pour ton compte.
      </p>
      <Suspense
        fallback={<div className="text-gray-400">Chargement...</div>}
      >
        <ResetForm />
      </Suspense>
    </div>
  );
}
