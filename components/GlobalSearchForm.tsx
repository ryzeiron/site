"use client";

import { useRef } from "react";

type GlobalSearchFormProps = {
  query: string;
  onlyInStock: boolean;
};

export default function GlobalSearchForm({
  query,
  onlyInStock,
}: GlobalSearchFormProps) {
  const formRef = useRef<HTMLFormElement>(null);

  return (
    <form ref={formRef} action="/recherche" className="mt-5 flex flex-col gap-3">
      <div className="flex flex-col gap-3 sm:flex-row">
        <input
          name="q"
          type="search"
          defaultValue={query}
          placeholder="Exemple : Pikachu, Dracaufeu, Reverse, sleeves..."
          className="min-h-11 flex-1 rounded-full border border-white/10 bg-black/45 px-5 text-sm text-white outline-none placeholder:text-gray-500 focus:border-violet-400 focus:ring-2 focus:ring-violet-500/30"
        />
        <button
          type="submit"
          className="min-h-11 rounded-full bg-violet-600 px-6 text-sm font-bold text-white transition hover:bg-violet-700"
        >
          Rechercher
        </button>
      </div>
      <label className="inline-flex w-fit items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm font-semibold text-gray-200">
        <input
          type="checkbox"
          name="inStock"
          value="1"
          defaultChecked={onlyInStock}
          onChange={() => formRef.current?.requestSubmit()}
          className="h-4 w-4 accent-violet-500"
        />
        En stock uniquement
      </label>
    </form>
  );
}
