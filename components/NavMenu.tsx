"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";

const LINKS = [
  { href: "/", label: "Accueil" },
  { href: "/blocs", label: "Blocs" },
  { href: "/favoris", label: "Mes favoris" },
  { href: "/compte", label: "Mon compte" },
  { href: "/contact", label: "Contact" },
];

export default function NavMenu() {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;

    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
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
        className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-violet-600/80 text-white backdrop-blur-sm transition hover:bg-violet-700"
      >
        <span className="flex flex-col gap-1">
          <span className="block h-0.5 w-5 rounded bg-white" />
          <span className="block h-0.5 w-5 rounded bg-white" />
          <span className="block h-0.5 w-5 rounded bg-white" />
        </span>
      </button>

      {open && (
        <div className="absolute left-0 z-50 mt-2 w-44 overflow-hidden rounded-xl border border-white/10 bg-zinc-900/95 shadow-lg backdrop-blur-md">
          {LINKS.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              onClick={() => setOpen(false)}
              className="block px-4 py-2 text-sm text-white transition hover:bg-violet-700"
            >
              {l.label}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
