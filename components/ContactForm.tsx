"use client";

import { useState } from "react";

export default function ContactForm() {
  const [subject, setSubject] = useState("");
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [message, setMessage] = useState("");
  const [website, setWebsite] = useState(""); // honeypot anti-spam
  const [sending, setSending] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const valid =
    subject.trim().length > 0 &&
    email.trim().length > 0 &&
    message.trim().length > 0;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!valid) return;
    setSending(true);
    setError(null);
    try {
      const res = await fetch("/api/tickets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ subject, email, name, phone, message, website }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error ?? "Erreur");
      setDone(true);
      setSubject("");
      setEmail("");
      setName("");
      setPhone("");
      setMessage("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erreur");
    } finally {
      setSending(false);
    }
  }

  if (done) {
    return (
      <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-4 text-emerald-100">
        <div className="font-semibold">Merci, ton message est bien envoyé.</div>
        <p className="text-sm text-emerald-200/80 mt-1">
          On te répond par email sous 48h. Tu peux fermer cette page.
        </p>
        <button
          type="button"
          onClick={() => setDone(false)}
          className="mt-3 text-xs text-emerald-200 hover:text-white underline"
        >
          Envoyer un autre message
        </button>
      </div>
    );
  }

  return (
    <form
      onSubmit={submit}
      className="rounded-lg border border-white/10 bg-zinc-900/70 backdrop-blur-sm p-6 space-y-3 text-gray-200"
    >
      <h2 className="text-lg font-semibold text-white">Envoyer un message</h2>
      {/* Honeypot : champ caché anti-bots, ne pas remplir */}
      <div aria-hidden style={{ position: "absolute", left: "-9999px", height: 0, width: 0, overflow: "hidden" }}>
        <label htmlFor="website-hp">Site web (laisser vide)</label>
        <input
          id="website-hp"
          type="text"
          autoComplete="off"
          tabIndex={-1}
          value={website}
          onChange={(e) => setWebsite(e.target.value)}
        />
      </div>
      <div>
        <label className="text-xs uppercase text-gray-400">Sujet *</label>
        <input
          type="text"
          required
          value={subject}
          onChange={(e) => setSubject(e.target.value)}
          placeholder="Recherche d'une carte commune, demande spéciale, etc."
          className="mt-1 w-full rounded bg-zinc-900 border border-white/10 text-white px-3 py-2 text-sm"
        />
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label className="text-xs uppercase text-gray-400">Email *</label>
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="mt-1 w-full rounded bg-zinc-900 border border-white/10 text-white px-3 py-2 text-sm"
          />
        </div>
        <div>
          <label className="text-xs uppercase text-gray-400">Nom (optionnel)</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="mt-1 w-full rounded bg-zinc-900 border border-white/10 text-white px-3 py-2 text-sm"
          />
        </div>
      </div>
      <div>
        <label className="text-xs uppercase text-gray-400">Téléphone (optionnel)</label>
        <input
          type="tel"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          className="mt-1 w-full rounded bg-zinc-900 border border-white/10 text-white px-3 py-2 text-sm"
        />
      </div>
      <div>
        <label className="text-xs uppercase text-gray-400">Message *</label>
        <textarea
          required
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          rows={6}
          placeholder="Décris ta demande : nom de la carte, série, langue, état, etc."
          className="mt-1 w-full rounded bg-zinc-900 border border-white/10 text-white px-3 py-2 text-sm"
        />
      </div>
      {error && (
        <p className="text-sm text-red-300 bg-red-500/10 border border-red-500/30 rounded p-2">
          {error}
        </p>
      )}
      <div>
        <button
          type="submit"
          disabled={!valid || sending}
          className="rounded-full bg-brand-500 hover:bg-brand-600 disabled:opacity-60 text-white px-6 py-3 font-medium"
        >
          {sending ? "Envoi..." : "Envoyer"}
        </button>
      </div>
    </form>
  );
}
