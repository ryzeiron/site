"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useSession } from "next-auth/react";

export default function AuthButton() {
  const { data: session, status } = useSession();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onClick);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  if (status === "loading") {
    return (
      <span className="inline-flex items-center rounded-full bg-white/10 px-4 py-2 text-sm text-gray-400">
        ...
      </span>
    );
  }

  if (session?.user) {
    return (
      <Link
        href="/compte"
        className="inline-flex items-center rounded-full bg-violet-600/80 backdrop-blur-sm px-4 py-2 text-sm font-medium text-white hover:bg-violet-700 transition"
      >
        Mon compte
      </Link>
    );
  }

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="inline-flex items-center rounded-full bg-violet-600/80 backdrop-blur-sm px-4 py-2 text-sm font-medium text-white hover:bg-violet-700 transition"
      >
        Connexion
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-44 rounded-xl border border-white/10 bg-zinc-900/95 backdrop-blur-md shadow-lg overflow-hidden z-50">
          <Link
            href="/connexion"
            onClick={() => setOpen(false)}
            className="block px-4 py-2 text-sm text-white hover:bg-violet-700 transition"
          >
            Se connecter
          </Link>
          <Link
            href="/inscription"
            onClick={() => setOpen(false)}
            className="block px-4 py-2 text-sm text-white hover:bg-violet-700 transition"
          >
            S inscrire
          </Link>
        </div>
      )}
    </div>
  );
}
