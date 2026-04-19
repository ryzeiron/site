import Link from "next/link";
import CartButton from "./CartButton";

export default function Header() {
  const shopName = process.env.NEXT_PUBLIC_SHOP_NAME ?? "Boutique Pokemon";
  return (
    <header className="border-b border-amber-200 bg-gradient-to-r from-amber-50 to-orange-50">
      <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2 font-bold text-xl">
          <span className="text-2xl">[*]</span>
          <span>{shopName}</span>
        </Link>
        <nav className="flex items-center gap-6 text-sm">
          <Link href="/blocs" className="hover:text-brand-600">
            Blocs
          </Link>
          <Link href="/contact" className="hover:text-brand-600">
            Contact
          </Link>
          <CartButton />
        </nav>
      </div>
    </header>
  );
}
