import type { Condition } from "@/lib/catalog";

const CONDITION_CLASSES: Record<Condition, string> = {
  Mint: "bg-emerald-500/20 text-emerald-300",
  "Near Mint": "bg-green-500/20 text-green-300",
  Excellent: "bg-sky-500/20 text-sky-300",
  Good: "bg-amber-500/20 text-amber-300",
  Played: "bg-red-500/20 text-red-300",
};

export default function ConditionBadge({
  condition,
  className = "",
}: {
  condition: Condition;
  className?: string;
}) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2 py-1 text-xs font-medium ${CONDITION_CLASSES[condition]} ${className}`}
    >
      {condition}
    </span>
  );
}
