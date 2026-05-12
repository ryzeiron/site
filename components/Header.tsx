import Image from "next/image";
import Link from "next/link";
import CartButton from "./CartButton";
import NavMenu from "./NavMenu";

export default function Header() {
  return (
    <header className="relative z-50 border-b border-white/10 bg-black/60 backdrop-blur-md text-gray-100">
      <div className="mx-auto max-w-6xl px-3 py-3 sm:px-4 sm:py-4">
        <div className="grid grid-cols-[auto_1fr_auto] items-center gap-2">
          <NavMenu />

          <Link
            href="/"
            className="relative block h-14 w-[clamp(8rem,38vw,11.5rem)] justify-self-center overflow-hidden sm:h-[4.5rem] sm:w-72 md:h-20 md:w-96"
            aria-label="Accueil PokeDel"
          >
            <Image
              src="/logo.png"
              alt="PokeDel"
              fill
              priority
              sizes="(min-width: 768px) 384px, (min-width: 640px) 288px, 38vw"
              className="scale-[1.28] object-contain object-center"
            />
          </Link>

          <div className="flex items-center gap-2 justify-self-end">
            <Link
              href="/compte"
              aria-label="Mon compte"
              title="Mon compte"
              className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-violet-600/80 text-white backdrop-blur-sm transition hover:bg-violet-700 sm:w-auto sm:px-4 sm:text-sm sm:font-medium"
            >
              <AccountIcon />
              <span className="hidden sm:inline">Mon compte</span>
            </Link>

            <CartButton />
          </div>
        </div>
      </div>
    </header>
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
