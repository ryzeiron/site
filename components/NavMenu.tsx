"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useSession } from "next-auth/react";

const LINKS = [
  { href: "/", label: "Accueil" },
  { href: "/blocs", label: "Blocs" },
  { href: "/contact", label: "Contact" },
];

export default function NavMenu() {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const { data: session } = useSession();

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

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        aria-label="Ouvrir le menu"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        className="inline-flex items-center justify-center w-10 h-10 rounded-full bg-violet-600/80 backdrop-blur-sm text-white hover:bg-violet-700 transition"
      >
        <span className="flex flex-col gap-1">
          <span className="block w-5 h-0.5 bg-white rounded" />
          <span className="block w-5 h-0.5 bg-white rounded" />
          <span className="block w-5 h-0.5 bg-white rounded" />
        </span>
      </button>

      {open && (
        <div className="absolute left-0 mt-2 w-48 rounded-xl border border-white/10 bg-zinc-900/95 backdrop-blur-md shadow-lg overflow-hidden z-50">
          {LINKS.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              onClick={() => setOpen(false)}
              className="block px-4 py-2 text-sm text-white hover:bg-violet-700 transition"
            >
              {l.label}
            </Link>
          ))}
          <div className="border-t border-white/10" />
          {session?.user ? (
            <Link
              href="/compte"
              onClick={() => setOpen(false)}
              className="block px-4 py-2 text-sm text-white hover:bg-violet-700 transition"
            >
              Mon compte
            </Link>
          ) : (
            <>
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
            </>
          )}
        </div>
      )}
    </div>
  );
}
