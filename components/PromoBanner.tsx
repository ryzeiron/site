import Link from "next/link";

export default function PromoBanner() {
  return (
    <div className="relative z-[150] border-b border-violet-300/20 bg-gradient-to-r from-violet-950 via-violet-700 to-fuchsia-700 text-white shadow-lg shadow-violet-950/20">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-center gap-x-3 gap-y-1 px-4 py-2 text-center text-xs sm:text-sm">
        <span className="rounded-full bg-white/15 px-3 py-1 font-black tracking-wide ring-1 ring-white/20">
          Code BIENVENUE
        </span>
        <span className="font-semibold">
          -10% de réduction sur ta première commande*
        </span>
        <span className="text-[11px] text-violet-100/80 sm:text-xs">
          *Sauf Amphinobi alt ME04 122/086
        </span>
        <Link
          href="/panier"
          className="font-bold text-white underline decoration-white/60 underline-offset-4 transition hover:decoration-white"
        >
          À saisir dans le panier
        </Link>
      </div>
    </div>
  );
}
