// Paliers de fidelite. Pour changer une recompense, edite uniquement ce tableau :
// "points" = cout en points, "rewardCents" = remise obtenue au panier.
export type LoyaltyTier = {
  points: number;
  rewardCents: number;
  label: string;
};

export const LOYALTY_TIERS: LoyaltyTier[] = [
  { points: 50, rewardCents: 100, label: "1 € de remise" },
  { points: 100, rewardCents: 200, label: "2 € de remise" },
  { points: 150, rewardCents: 350, label: "3,50 € de remise" },
  { points: 250, rewardCents: 600, label: "6 € de remise" },
  { points: 350, rewardCents: 900, label: "9 € de remise" },
  { points: 450, rewardCents: 1200, label: "12 € de remise" },
  { points: 600, rewardCents: 1700, label: "17 € de remise" },
  { points: 750, rewardCents: 2200, label: "22 € de remise" },
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
