"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { signOut, useSession } from "next-auth/react";

export default function AuthButton() {
  const { data: session, status } = useSession();
  const [open, setOpen] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
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
      <span className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-sm text-gray-400 sm:w-auto sm:px-4">
        ...
      </span>
    );
  }

  const isConnected = !!session?.user;

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label="Mon compte"
        aria-expanded={open}
        title="Mon compte"
        className="inline-flex h-10 w-10 items-center justify-center gap-1 rounded-full bg-violet-600/80 text-white backdrop-blur-sm transition hover:bg-violet-700 sm:w-auto sm:px-4 sm:text-sm sm:font-medium"
      >
        <AccountIcon />
        <span className="hidden sm:inline">Mon compte</span>
      </button>

      {open && (
        <div className="absolute right-0 z-50 mt-2 w-48 overflow-hidden rounded-xl border border-white/10 bg-zinc-900/95 shadow-lg backdrop-blur-md">
          {isConnected ? (
            <>
              <Link
                href="/compte"
                onClick={() => setOpen(false)}
                className="block px-4 py-2 text-sm text-white transition hover:bg-violet-700"
              >
                Mon compte
              </Link>
              <Link
                href="/favoris"
                onClick={() => setOpen(false)}
                className="block px-4 py-2 text-sm text-white transition hover:bg-violet-700"
              >
                Mes favoris
              </Link>
              <button
                type="button"
                disabled={signingOut}
                onClick={async () => {
                  setSigningOut(true);
                  await signOut({ callbackUrl: "/" });
                }}
                className="block w-full px-4 py-2 text-left text-sm text-white transition hover:bg-violet-700 disabled:opacity-60"
              >
                {signingOut ? "..." : "Se deconnecter"}
              </button>
            </>
          ) : (
            <>
              <Link
                href="/connexion?callbackUrl=/compte"
                onClick={() => setOpen(false)}
                className="block px-4 py-2 text-sm text-white transition hover:bg-violet-700"
              >
                Se connecter
              </Link>
              <Link
                href="/inscription"
                onClick={() => setOpen(false)}
                className="block px-4 py-2 text-sm text-white transition hover:bg-violet-700"
              >
                Creer un compte
              </Link>
            </>
          )}
        </div>
      )}
    </div>
  );
}

function AccountIcon() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      className="h-5 w-5 sm:hidden"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M20 21a8 8 0 0 0-16 0" />
      <circle cx="12" cy="8" r="4" />
    </svg>
  );
}
