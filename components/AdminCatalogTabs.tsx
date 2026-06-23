import Link from "next/link";

type AdminCatalogTabsProps = {
  active: "dashboard" | "cards" | "sleeves" | "carts" | "analytics";
  cardsCount?: number;
  sleevesCount?: number;
  cartsCount?: number;
};

function tabClass(active: boolean) {
  return [
    "flex min-w-[9rem] items-center justify-between gap-3 rounded-xl px-4 py-3 text-sm font-semibold transition",
    active
      ? "bg-violet-600 text-white shadow-lg shadow-violet-950/25"
      : "bg-white/[0.04] text-gray-300 hover:bg-violet-600/25 hover:text-white",
  ].join(" ");
}

export default function AdminCatalogTabs({
  active,
  cardsCount,
  sleevesCount,
  cartsCount,
}: AdminCatalogTabsProps) {
  return (
    <nav className="mb-6 rounded-2xl border border-violet-300/15 bg-zinc-950/75 p-2">
      <div className="px-2 pb-2 pt-1 text-xs font-semibold uppercase tracking-[0.2em] text-violet-300">
        Admin
      </div>

      <div className="flex flex-wrap gap-2">
        <Link
          href="/admin/dashboard"
          className={tabClass(active === "dashboard")}
          aria-current={active === "dashboard" ? "page" : undefined}
        >
          <span>Accueil</span>
        </Link>

        <Link
          href="/admin"
          className={tabClass(active === "cards")}
          aria-current={active === "cards" ? "page" : undefined}
        >
          <span>Cartes</span>
          {typeof cardsCount === "number" ? (
            <span className="rounded-full bg-white/10 px-2 py-0.5 text-xs">
              {cardsCount}
            </span>
          ) : null}
        </Link>

        <Link
          href="/admin/sleeves"
          className={tabClass(active === "sleeves")}
          aria-current={active === "sleeves" ? "page" : undefined}
        >
          <span>Sleeves</span>
          {typeof sleevesCount === "number" ? (
            <span className="rounded-full bg-white/10 px-2 py-0.5 text-xs">
              {sleevesCount}
            </span>
          ) : null}
        </Link>

        <Link
          href="/admin/paniers"
          className={tabClass(active === "carts")}
          aria-current={active === "carts" ? "page" : undefined}
        >
          <span>Paniers</span>
          {typeof cartsCount === "number" ? (
            <span className="rounded-full bg-white/10 px-2 py-0.5 text-xs">
              {cartsCount}
            </span>
          ) : null}
        </Link>

        <Link
          href="/admin/analyse"
          className={tabClass(active === "analytics")}
          aria-current={active === "analytics" ? "page" : undefined}
        >
          <span>Analyse</span>
        </Link>
      </div>
    </nav>
  );
}
