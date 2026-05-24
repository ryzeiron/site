type StockBadgeProps = {
  stock: number;
  hidden?: boolean;
  compact?: boolean;
  label?: string;
  className?: string;
};

export function getStockLabel(stock: number, hidden = false) {
  if (hidden) return "Masquée";
  if (stock <= 0) return "Rupture";
  if (stock <= 2) return "Stock faible";
  return "En stock";
}

export function getStockBadgeClass(stock: number, hidden = false) {
  if (hidden) return "border-amber-400/35 bg-amber-500/15 text-amber-200";
  if (stock <= 0) return "border-red-400/35 bg-red-500/15 text-red-200";
  if (stock <= 2) return "border-orange-400/35 bg-orange-500/15 text-orange-200";
  return "border-emerald-400/35 bg-emerald-500/15 text-emerald-200";
}

export default function StockBadge({
  stock,
  hidden = false,
  compact = false,
  label,
  className = "",
}: StockBadgeProps) {
  const text = label ?? getStockLabel(stock, hidden);

  return (
    <span
      className={`inline-flex items-center rounded-full border font-medium ${getStockBadgeClass(stock, hidden)} ${
        compact ? "px-2 py-0.5 text-[11px]" : "px-2.5 py-1 text-xs"
      } ${className}`}
    >
      {text}
    </span>
  );
}
