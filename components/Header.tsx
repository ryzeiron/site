import Image from "next/image";
import Link from "next/link";
import CartButton from "./CartButton";
import NavMenu from "./NavMenu";

export default function Header() {
  return (
    <header className="relative z-50 border-b border-white/10 bg-black/60 text-gray-100 backdrop-blur-md">
      <div className="relative mx-auto flex max-w-6xl items-center justify-between px-3 py-5 sm:px-4 sm:py-6">
        <div className="relative z-10">
          <NavMenu />
        </div>

        <Link
          href="/"
          className="absolute left-1/2 top-1/2 block h-16 w-56 -translate-x-1/2 -translate-y-1/2 overflow-hidden sm:h-20 sm:w-72 md:h-24 md:w-96"
          aria-label="Accueil PokeDel"
        >
          <Image
            src="/logo.png"
            alt="PokeDel"
            fill
            priority
            sizes="(min-width: 768px) 384px, (min-width: 640px) 288px, 224px"
            className="scale-[1.35] object-contain object-center"
          />
        </Link>

        <div className="relative z-10 flex items-center gap-2">
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
