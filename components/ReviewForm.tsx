"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export default function ReviewForm({
  initialRating = 5,
  initialComment = "",
}: {
  initialRating?: number;
  initialComment?: string;
}) {
  const router = useRouter();
  const [rating, setRating] = useState(initialRating);
  const [comment, setComment] = useState(initialComment);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const isEditing = initialComment.trim().length > 0;

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setMessage(null);
    setError(null);

    try {
      const response = await fetch("/api/reviews", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rating, comment }),
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(data.error ?? "Impossible d'envoyer l'avis.");
      }

      setMessage(
        isEditing
          ? "Ton avis a bien été mis à jour."
          : "Merci, ton avis est publié.",
      );

      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur inconnue.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form
      onSubmit={submit}
      className="rounded-2xl border border-white/10 bg-zinc-950/75 p-5 text-gray-100"
    >
      <div>
        <h2 className="text-2xl font-bold text-white">
          {isEditing ? "Modifier mon avis" : "Laisser un avis"}
        </h2>
        <p className="mt-1 text-sm text-gray-400">
          Ton retour aide les autres collectionneurs à commander en confiance.
        </p>
      </div>

      <div className="mt-5">
        <div className="mb-2 text-sm font-medium text-gray-200">Note</div>
        <div className="flex gap-2">
          {[1, 2, 3, 4, 5].map((value) => (
            <button
              key={value}
              type="button"
              onClick={() => setRating(value)}
              className={`flex h-11 w-11 items-center justify-center rounded-full border text-xl transition ${
                value <= rating
                  ? "border-yellow-300/70 bg-yellow-400/20 text-yellow-200"
                  : "border-white/10 bg-white/5 text-gray-500 hover:border-violet-300/70"
              }`}
              aria-label={`${value} étoile${value > 1 ? "s" : ""}`}
            >
              ★
            </button>
          ))}
        </div>
      </div>

      <label className="mt-5 block">
        <span className="text-sm font-medium text-gray-200">Commentaire</span>
        <textarea
          value={comment}
          onChange={(event) => setComment(event.target.value)}
          rows={5}
          maxLength={1200}
          placeholder="Qualité des cartes, emballage, livraison, expérience sur le site..."
          className="mt-2 w-full rounded-xl border border-white/10 bg-zinc-900 px-3 py-3 text-sm text-white outline-none placeholder:text-gray-500 focus:border-violet-400/70"
        />
      </label>

      <div className="mt-4 flex flex-wrap items-center gap-3">
        <button
          type="submit"
          disabled={loading}
          className="rounded-full bg-brand-500 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-brand-600 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {loading
            ? "Envoi..."
            : isEditing
              ? "Mettre à jour mon avis"
              : "Publier mon avis"}
        </button>

        <span className="text-xs text-gray-500">{comment.length}/1200</span>
      </div>

      {message && <p className="mt-3 text-sm text-emerald-300">{message}</p>}
      {error && <p className="mt-3 text-sm text-red-300">{error}</p>}
    </form>
  );
}
