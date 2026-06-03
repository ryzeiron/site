"use client";

import Link from "next/link";
import type { ReactNode } from "react";
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
  const displayName =
    session?.user?.name || session?.user?.email || "Mon compte";
  const userEmail = session?.user?.email || "";
  const userInitial = displayName.trim().charAt(0).toUpperCase() || "C";

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label="Mon compte"
        aria-expanded={open}
        title="Mon compte"
        className="inline-flex h-10 w-10 items-center justify-center gap-2 rounded-full bg-violet-600/90 text-white shadow-sm shadow-violet-950/30 ring-1 ring-violet-300/20 backdrop-blur-sm transition hover:bg-violet-700 hover:ring-violet-200/40 sm:w-auto sm:px-4 sm:text-sm sm:font-medium"
      >
        <AccountIcon />
        <span className="hidden sm:inline">{isConnected ? "Compte" : "Connexion"}</span>
        <ChevronIcon />
      </button>

      {open && (
        <div className="absolute right-0 z-[210] mt-3 w-72 overflow-hidden rounded-2xl border border-violet-300/20 bg-zinc-950/95 text-sm text-white shadow-2xl shadow-black/40 backdrop-blur-md">
          {isConnected ? (
            <>
              <div className="border-b border-white/10 bg-violet-600/10 p-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-violet-600 text-sm font-bold text-white ring-2 ring-violet-300/30">
                    {userInitial}
                  </div>
                  <div className="min-w-0">
                    <div className="truncate font-semibold text-white">
                      {displayName}
                    </div>
                    {userEmail && (
                      <div className="truncate text-xs text-gray-400">
                        {userEmail}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div className="p-2">
                <MenuLink href="/compte?section=infos" onClick={() => setOpen(false)} icon={<AccountIcon menu />}>
                  Mon compte
                </MenuLink>
                <MenuLink href="/compte?section=commandes" onClick={() => setOpen(false)} icon={<OrdersIcon />}>
                  Mes commandes
                </MenuLink>
                <MenuLink href="/compte?section=favoris" onClick={() => setOpen(false)} icon={<HeartIcon />}>
                  Mes favoris
                </MenuLink>
                <MenuLink href="/compte?section=avis" onClick={() => setOpen(false)} icon={<StarIcon />}>
                  Laisser un avis
                </MenuLink>
              </div>

              <button
                type="button"
                disabled={signingOut}
                onClick={async () => {
                  setSigningOut(true);
                  await signOut({ callbackUrl: "/" });
                }}
                className="flex w-full items-center gap-3 border-t border-white/10 px-4 py-3 text-left text-sm font-medium text-red-200 transition hover:bg-red-500/15 disabled:opacity-60"
              >
                <LogoutIcon />
                {signingOut ? "Déconnexion..." : "Se déconnecter"}
              </button>
            </>
          ) : (
            <>
              <div className="border-b border-white/10 bg-violet-600/10 p-4">
                <div className="text-base font-semibold text-white">
                  Bienvenue
                </div>
                <p className="mt-1 text-xs leading-5 text-gray-400">
                  Connecte-toi pour retrouver tes commandes et tes favoris.
                </p>
              </div>

              <div className="p-2">
                <MenuLink
                  href="/connexion?callbackUrl=/compte"
                  onClick={() => setOpen(false)}
                  icon={<LoginIcon />}
                >
                  Se connecter
                </MenuLink>
                <MenuLink
                  href="/inscription"
                  onClick={() => setOpen(false)}
                  icon={<AccountIcon menu />}
                >
                  Créer un compte
                </MenuLink>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}

function MenuLink({
  href,
  onClick,
  icon,
  children,
}: {
  href: string;
  onClick: () => void;
  icon: ReactNode;
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
      <span className="font-medium">{children}</span>
    </Link>
  );
}

function AccountIcon({ menu = false }: { menu?: boolean }) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      className={menu ? "h-4 w-4" : "h-5 w-5 sm:hidden"}
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

function OrdersIcon() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      className="h-4 w-4"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.1"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M6 2h12l1 20-7-3-7 3 1-20Z" />
      <path d="M9 7h6" />
      <path d="M9 11h6" />
    </svg>
  );
}

function HeartIcon() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      className="h-4 w-4"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.1"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1-1.1a5.5 5.5 0 0 0-7.8 7.8l1 1L12 21l7.8-7.6 1-1a5.5 5.5 0 0 0 0-7.8Z" />
    </svg>
  );
}

function StarIcon() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      className="h-4 w-4"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.1"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="m12 3 2.8 5.7 6.2.9-4.5 4.4 1.1 6.2L12 17.3l-5.6 2.9 1.1-6.2L3 9.6l6.2-.9L12 3Z" />
    </svg>
  );
}

function LoginIcon() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      className="h-4 w-4"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.1"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4" />
      <path d="m10 17 5-5-5-5" />
      <path d="M15 12H3" />
    </svg>
  );
}

function LogoutIcon() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      className="h-4 w-4"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.1"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
      <path d="m16 17 5-5-5-5" />
      <path d="M21 12H9" />
    </svg>
  );
}
