"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

type Ticket = {
  id: string;
  subject: string;
  email: string;
  name: string | null;
  phone: string | null;
  message: string;
  status: string;
  adminResponse: string | null;
  createdAt: Date | string;
  updatedAt: Date | string;
};

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  open: { label: "Nouveau", color: "bg-violet-500/20 text-violet-200" },
  in_progress: {
    label: "En cours",
    color: "bg-amber-500/20 text-amber-200",
  },
  closed: { label: "Cloture", color: "bg-gray-500/20 text-gray-300" },
};

function formatDate(d: Date | string) {
  const date = new Date(d);
  return date.toLocaleString("fr-FR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function AdminTicketsList({ initial }: { initial: Ticket[] }) {
  const [filter, setFilter] = useState<"all" | "open" | "in_progress" | "closed">(
    "open",
  );
  const filtered = initial.filter((t) =>
    filter === "all" ? true : t.status === filter,
  );

  return (
    <div>
      <div className="flex flex-wrap gap-2 mb-4 text-xs">
        {(["all", "open", "in_progress", "closed"] as const).map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => setFilter(s)}
            className={`rounded-full border px-3 py-1.5 font-medium transition ${
              filter === s
                ? "border-violet-400 bg-violet-600 text-white"
                : "border-white/20 bg-white/5 text-gray-300 hover:bg-white/10"
            }`}
          >
            {s === "all"
              ? `Tous (${initial.length})`
              : `${STATUS_LABELS[s]?.label ?? s} (${initial.filter((t) => t.status === s).length})`}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <p className="text-gray-400">Aucun ticket dans cette categorie.</p>
      ) : (
        <div className="space-y-3">
          {filtered.map((t) => (
            <TicketCard key={t.id} ticket={t} />
          ))}
        </div>
      )}
    </div>
  );
}

function TicketCard({ ticket }: { ticket: Ticket }) {
  const router = useRouter();
  const [response, setResponse] = useState(ticket.adminResponse ?? "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const status = STATUS_LABELS[ticket.status] ?? {
    label: ticket.status,
    color: "bg-gray-500/20 text-gray-300",
  };

  async function patch(updates: Record<string, unknown>) {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/tickets", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: ticket.id, ...updates }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error ?? "Erreur");
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erreur");
    } finally {
      setBusy(false);
    }
  }

  async function del() {
    if (!window.confirm("Supprimer définitivement ce ticket ?")) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/tickets", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: ticket.id }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error ?? "Erreur");
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erreur");
    } finally {
      setBusy(false);
    }
  }

  const mailto = `mailto:${ticket.email}?subject=${encodeURIComponent("Re: " + ticket.subject)}&body=${encodeURIComponent(
    (ticket.adminResponse ?? "") +
      "\n\n---\nMessage initial :\n" +
      ticket.message,
  )}`;

  return (
    <div className="rounded-lg border border-white/10 bg-zinc-900/70 backdrop-blur-sm p-4 text-gray-200">
      <div className="flex flex-wrap items-start justify-between gap-2 mb-2">
        <div>
          <div className="font-semibold text-white">{ticket.subject}</div>
          <div className="text-xs text-gray-400 mt-0.5">
            De {ticket.name ? `${ticket.name} <${ticket.email}>` : ticket.email}
            {ticket.phone ? ` - tel ${ticket.phone}` : ""} - {formatDate(ticket.createdAt)}
          </div>
        </div>
        <span
          className={`text-xs uppercase tracking-wider font-semibold rounded px-2 py-1 ${status.color}`}
        >
          {status.label}
        </span>
      </div>

      <div className="mt-3 rounded bg-black/20 p-3 text-sm whitespace-pre-wrap">
        {ticket.message}
      </div>

      <div className="mt-3">
        <label className="text-xs uppercase text-gray-400">
          Note interne / reponse
        </label>
        <textarea
          value={response}
          onChange={(e) => setResponse(e.target.value)}
          rows={3}
          placeholder="Notes ou brouillon de reponse"
          className="mt-1 w-full rounded bg-zinc-900 border border-white/10 text-white px-3 py-2 text-sm"
        />
      </div>

      <div className="mt-3 flex items-center gap-2 flex-wrap text-xs">
        <button
          type="button"
          onClick={() => patch({ adminResponse: response, status: "in_progress" })}
          disabled={busy}
          className="rounded bg-brand-500 hover:bg-brand-600 text-white px-3 py-1 font-medium disabled:opacity-60"
        >
          Sauver la note
        </button>
        <a
          href={mailto}
          className="rounded bg-violet-600 hover:bg-violet-700 text-white px-3 py-1 font-medium"
        >
          Repondre par email
        </a>
        <button
          type="button"
          onClick={() =>
            patch({
              status: ticket.status === "closed" ? "open" : "closed",
            })
          }
          disabled={busy}
          className="rounded bg-white/10 hover:bg-white/20 text-white px-3 py-1"
        >
          {ticket.status === "closed" ? "Reouvrir" : "Cloturer"}
        </button>
        <button
          type="button"
          onClick={del}
          disabled={busy}
          className="rounded bg-red-600/80 hover:bg-red-600 text-white px-3 py-1 ml-auto"
        >
          Supprimer
        </button>
        {error && <span className="text-red-400">{error}</span>}
      </div>
    </div>
  );
}
