import Link from "next/link";

type AdminMenuItem = {
  href: string;
  label: string;
  key: "stocks" | "analyse" | "commandes" | "tickets";
};

const ITEMS: AdminMenuItem[] = [
  { href: "/admin", label: "Stocks", key: "stocks" },
  { href: "/admin/analyse", label: "Analyse", key: "analyse" },
  { href: "/admin/commandes", label: "Commandes", key: "commandes" },
  { href: "/admin/tickets", label: "Tickets", key: "tickets" },
];

export default function AdminMenu({
  active,
  className = "",
}: {
  active: AdminMenuItem["key"];
  className?: string;
}) {
  return (
    <nav
      aria-label="Menu admin"
      className={`flex flex-wrap gap-3 ${className}`.trim()}
    >
      {ITEMS.map((item) => {
        const isActive = item.key === active;
        return (
          <Link
            key={item.key}
            href={item.href}
            aria-current={isActive ? "page" : undefined}
            className={`rounded px-4 py-2 text-sm font-medium transition ${
              isActive
                ? "bg-violet-600/80 text-white"
                : "bg-white/10 text-white hover:bg-white/20"
            }`}
          >
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
