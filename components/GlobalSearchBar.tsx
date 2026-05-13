"use client";

export default function GlobalSearchBar() {
  return (
    <div className="border-b border-white/10 bg-black/35 backdrop-blur-sm">
      <div className="mx-auto max-w-6xl px-4 py-3">
        <form action="/recherche" className="relative">
          <input
            type="search"
            name="q"
            placeholder="Rechercher une carte dans tout le site..."
            className="h-11 w-full rounded-full border border-white/10 bg-zinc-950/80 pl-11 pr-28 text-sm text-white outline-none placeholder:text-gray-500 transition focus:border-violet-400 focus:ring-2 focus:ring-violet-500/30"
          />
          <SearchIcon />
          <button
            type="submit"
            className="absolute right-1.5 top-1/2 h-8 -translate-y-1/2 rounded-full bg-violet-600 px-4 text-xs font-bold text-white transition hover:bg-violet-700"
          >
            Rechercher
          </button>
        </form>
      </div>
    </div>
  );
}

function SearchIcon() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx="11" cy="11" r="8" />
      <path d="m21 21-4.35-4.35" />
    </svg>
  );
}
