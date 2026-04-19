import Link from "next/link";
import CartButton from "./CartButton";

export default function Header() {
  const shopName = process.env.NEXT_PUBLIC_SHOP_NAME ?? "PokeDel";
  return (
    <header className="border-b border-white/10 bg-black/60 backdrop-blur-md text-gray-100">
      <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
        <Link href="/" className="font-bold text-xl text-white">
          {shopName}
        </Link>
        <nav className="flex items-center gap-1 rounded-full bg-violet-600/80 backdrop-blur-sm p-1 text-sm">
          <Link
            href="/blocs"
            className="px-4 py-2 rounded-full text-white hover:bg-violet-700 transition"
          >
            Blocs
          </Link>
          <Link
            href="/contact"
            className="px-4 py-2 rounded-full text-white hover:bg-violet-700 transition"
          >
            Contact
          </Link>
          <CartButton />
        </nav>
      </div>
    </header>
  );
}
