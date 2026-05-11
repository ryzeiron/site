import Image from "next/image";
import Link from "next/link";
import CartButton from "./CartButton";
import NavMenu from "./NavMenu";

export default function Header() {
  return (
    <header className="relative z-50 border-b border-white/10 bg-black/60 text-gray-100 backdrop-blur-md">
      <div className="mx-auto grid max-w-6xl grid-cols-[auto_1fr_auto] items-center gap-2 px-3 py-3 sm:px-4 sm:py-4">
        <NavMenu />

        <Link
          href="/"
          className="relative block h-10 w-28 justify-self-center sm:h-14 sm:w-48 md:h-16 md:w-56"
          aria-label="Accueil PokeDel62"
        >
          <Image
            src="/logo.png"
            alt="PokeDel"
            fill
            priority
            sizes="(min-width: 768px) 224px, (min-width: 640px) 192px, 112px"
            className="relative block h-12 w-36 justify-self-center sm:h-16 sm:w-56 md:h-20 md:w-72"
          />
        </Link>

        <div className="flex items-center gap-2 justify-self-end">
          <Link
            href="/compte"
            className="inline-flex items-center rounded-full bg-violet-600/80 px-3 py-2 text-xs font-medium text-white backdrop-blur-sm transition hover:bg-violet-700 sm:px-4 sm:text-sm"
          >
            Mon compte
          </Link>
          <CartButton />
        </div>
      </div>
    </header>
  );
}
