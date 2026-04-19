import Link from "next/link";
import CartButton from "./CartButton";
import NavMenu from "./NavMenu";

export default function Header() {
  const shopName = process.env.NEXT_PUBLIC_SHOP_NAME ?? "PokeDel";
  return (
    <header className="border-b border-white/10 bg-black/60 backdrop-blur-md text-gray-100">
      <div className="max-w-6xl mx-auto px-4 py-6 relative flex items-center justify-between">
        <NavMenu />
        <Link
          href="/"
          className="absolute left-1/2 -translate-x-1/2 font-extrabold tracking-tight text-4xl md:text-6xl text-white text-center"
        >
          {shopName}
        </Link>
        <CartButton />
      </div>
    </header>
  );
}
