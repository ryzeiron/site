"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { useEffect, useRef, useState } from "react";

const LINKS = [
  { href: "/", label: "Accueil", description: "Retour à la boutique", icon: <HomeIcon /> },
  { href: "/nouveautes", label: "Nouveautés", description: "Dernières cartes ajoutées", icon: <SparklesIcon /> },
  { href: "/sleeve", label: "Sleeves", description: "Protections pour cartes", icon: <SleeveIcon /> },
  { href: "/recherche", label: "Recherche", description: "Trouver une carte", icon: <SearchIcon /> },
  { href: "/blocs", label: "Blocs", description: "Toutes les séries", icon: <BlocksIcon /> },
  { href: "/contact", label: "Contact", description: "Demande spéciale", icon: <ContactIcon /> },
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
        className="inline-flex h-10 items-center justify-center gap-2 rounded-full bg-violet-600/90 px-3 text-sm font-medium text-white shadow-sm shadow-violet-950/30 ring-1 ring-violet-300/20 backdrop-blur-sm transition hover:bg-violet-700 hover:ring-violet-200/40 sm:px-4"
      >
        <span className="flex flex-col gap-1">
          <span className="block w-5 h-0.5 bg-white rounded" />
          <span className="block w-5 h-0.5 bg-white rounded" />
          <span className="block w-5 h-0.5 bg-white rounded" />
        </span>
        <span>Menu</span>
        <ChevronIcon />
      </button>

      {open && (
        <div className="absolute left-0 z-[210] mt-3 w-72 overflow-hidden rounded-2xl border border-violet-300/20 bg-zinc-950/95 text-sm text-white shadow-2xl shadow-black/40 backdrop-blur-md">
          <div className="border-b border-white/10 bg-violet-600/10 p-4">
            <div className="text-base font-semibold text-white">Menu</div>
            <p className="mt-1 text-xs leading-5 text-gray-400">
              Accède rapidement aux pages principales du site.
            </p>
          </div>

          <div className="p-2">
            {LINKS.map((link) => (
              <MenuLink
                key={link.href}
                href={link.href}
                onClick={() => setOpen(false)}
                icon={link.icon}
                description={link.description}
              >
                {link.label}
              </MenuLink>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function MenuLink({
  href,
  onClick,
  icon,
  description,
  children,
}: {
  href: string;
  onClick: () => void;
  icon: ReactNode;
  description: string;
  children: ReactNode;
}) {
  return (
    <Link
      href={href}
      onClick={onClick}
      className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-white transition hover:bg-violet-600/35"
    >
      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white/10 text-violet-200">
        {icon}
      </span>
      <span className="min-w-0">
        <span className="block font-medium">{children}</span>
        <span className="block truncate text-xs text-gray-400">{description}</span>
      </span>
    </Link>
  );
}

function ChevronIcon() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      className="hidden h-4 w-4 opacity-80 sm:block"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.4"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="m6 9 6 6 6-6" />
    </svg>
  );
}

function HomeIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2.1" strokeLinecap="round" strokeLinejoin="round">
      <path d="m3 10 9-7 9 7" />
      <path d="M5 10v10h14V10" />
      <path d="M9 20v-6h6v6" />
    </svg>
  );
}

function SparklesIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2.1" strokeLinecap="round" strokeLinejoin="round">
      <path d="m12 3 1.7 5.1L19 10l-5.3 1.9L12 17l-1.7-5.1L5 10l5.3-1.9L12 3Z" />
      <path d="M19 15v4" />
      <path d="M21 17h-4" />
    </svg>
  );
}

function SearchIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2.1" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="11" cy="11" r="7" />
      <path d="m20 20-3.5-3.5" />
    </svg>
  );
}

function BlocksIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2.1" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="7" height="7" rx="1.5" />
      <rect x="14" y="3" width="7" height="7" rx="1.5" />
      <rect x="3" y="14" width="7" height="7" rx="1.5" />
      <rect x="14" y="14" width="7" height="7" rx="1.5" />
    </svg>
  );
}

function SleeveIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2.1" strokeLinecap="round" strokeLinejoin="round">
      <path d="M8 3h8a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2Z" />
      <path d="M9 7h6" />
      <path d="M9 17h6" />
    </svg>
  );
}

function ContactIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2.1" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 5h16v12H7l-3 3V5Z" />
      <path d="M8 9h8" />
      <path d="M8 13h5" />
    </svg>
  );
}
