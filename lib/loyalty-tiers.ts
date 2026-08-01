// Paliers de fidelite. Pour changer une recompense, edite uniquement ce tableau.
//
// Trois types de recompense :
//   { type: "amount", rewardCents }  -> remise fixe en euros
//   { type: "percent", percent }     -> % de remise (hors cartes exclues des promos)
//   { type: "free_shipping" }        -> frais de port + assurance offerts
export type LoyaltyTier = {
  points: number;
  label: string;
} & (
  | { type: "amount"; rewardCents: number }
  | { type: "percent"; percent: number }
  | { type: "free_shipping" }
);

export const LOYALTY_TIERS: LoyaltyTier[] = [
  { points: 50, type: "amount", rewardCents: 100, label: "1 € de remise" },
  { points: 100, type: "percent", percent: 5, label: "5 % de remise" },
  {
    points: 150,
    type: "free_shipping",
    label: "Frais de port + assurance offerts",
  },
  { points: 250, type: "amount", rewardCents: 600, label: "5 € de remise" },
  { points: 350, type: "percent", percent: 8, label: "10 % de remise" },
  { points: 450, type: "amount", rewardCents: 1200, label: "10 € de remise" },
  { points: 600, type: "amount", percent: 10, label: "15 € de remise" },
  { points: 750, type: "percent", rewardCents: 2200, label: "15 % de remise" },
];

export function getTierByPoints(points: number): LoyaltyTier | null {
  return LOYALTY_TIERS.find((tier) => tier.points === points) ?? null;
}

export function getAffordableTiers(balance: number): LoyaltyTier[] {
  return LOYALTY_TIERS.filter((tier) => tier.points <= balance);
}

export function getNextTier(balance: number): LoyaltyTier | null {
  return LOYALTY_TIERS.find((tier) => tier.points > balance) ?? null;
}
