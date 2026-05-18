import Image from "next/image";
import Link from "next/link";
import AuthButton from "./AuthButton";
import CartButton from "./CartButton";
import NavMenu from "./NavMenu";

export default function Header() {
  return (
    <header className="relative z-50 border-b border-white/10 bg-[#02030b] text-gray-100">
      <div className="mx-auto max-w-6xl px-3 py-3 sm:px-4 sm:py-4">
        <div className="grid grid-cols-[auto_1fr_auto] items-center gap-2">
          <NavMenu />

          <Link
            href="/"
            className="relative block h-14 w-[clamp(8rem,38vw,11.5rem)] justify-self-center overflow-hidden sm:h-[4.5rem] sm:w-72 md:h-20 md:w-[30rem] lg:w-[34rem]"
            aria-label="Accueil PokeDel"
          >
            <Image
              src="/logo.png"
              alt="PokeDel"
              fill
              priority
              sizes="(min-width: 1024px) 544px, (min-width: 768px) 480px, (min-width: 640px) 288px, 38vw"
              className="scale-x-[1.7] scale-y-[1.48] object-contain object-center"
            />
          </Link>

          <div className="flex items-center gap-2 justify-self-end">
            <AuthButton />
            <CartButton />
          </div>
        </div>
      </div>
    </header>
  );
}
