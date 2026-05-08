import Link from "next/link";

export default function ContactBanner() {
  return (
    <div className="border-b border-white/10 bg-violet-500/10 backdrop-blur-sm text-violet-100">
      <div className="max-w-6xl mx-auto px-4 py-2 flex flex-wrap items-center justify-center gap-x-2 gap-y-1 text-xs sm:text-sm text-center">
        <span aria-hidden className="text-violet-300">✦</span>
        <span className="text-gray-100">
          Tu cherches une carte commune ou tu as une demande speciale ?
        </span>
        <Link
          href="/contact"
          className="font-semibold text-violet-200 hover:text-white underline underline-offset-2"
        >
          Contacte-nous directement
        </Link>
      </div>
    </div>
  );
}
