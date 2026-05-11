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
          className="absolute left-1/2 -translate-x-1/2 block h-12 w-40 sm:h-14 sm:w-48 md:h-16 md:w-56"
          aria-label="Accueil PokeDel"
        >
          <Image
            src="/logo.png"
            alt="PokeDel"
            fill
            priority
            sizes="(min-width: 768px) 224px, (min-width: 640px) 192px, 160px"
            className="object-cover object-center scale-110"
          />
        </Link>

        <CartButton />
      </div>
    </header>
  );
}
