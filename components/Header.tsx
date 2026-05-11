import Image from "next/image";
import Link from "next/link";
import CartButton from "./CartButton";
import NavMenu from "./NavMenu";

export default function Header() {
  return (
    <header className="relative z-50 border-b border-white/10 bg-black/60 backdrop-blur-md text-gray-100">
      <div className="max-w-6xl mx-auto px-4 py-4 relative flex items-center justify-between">
        <NavMenu />

        <Link
          href="/"
          className="absolute left-1/2 -translate-x-1/2 block h-14 w-14 md:h-16 md:w-16 overflow-hidden rounded-full ring-2 ring-white/20 shadow-lg shadow-violet-500/20"
          aria-label="Accueil PokeDel"
        >
          <Image
            src="/logo.png"
            alt="PokeDel"
            fill
            priority
            sizes="64px"
            className="object-cover object-center"
          />
        </Link>

        <CartButton />
      </div>
    </header>
  );
}
