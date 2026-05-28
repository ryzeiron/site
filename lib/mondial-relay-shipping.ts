export type MondialRelayInsurance = {
  coverageCents: number;
  feeCents: number;
};

export const MONDIAL_RELAY_INSURANCE_START_CENTS = 5000;
export const MONDIAL_RELAY_MAX_INSURANCE_CENTS = 50000;

const MONDIAL_RELAY_INSURANCE_TIERS: MondialRelayInsurance[] = [
  { coverageCents: 5000, feeCents: 200 },
  { coverageCents: 12500, feeCents: 350 },
  { coverageCents: 25000, feeCents: 500 },
  { coverageCents: 37500, feeCents: 650 },
  { coverageCents: 50000, feeCents: 800 },
];

export function getMondialRelayInsurance(
  itemsTotalCents: number,
): MondialRelayInsurance | null {
  if (itemsTotalCents < MONDIAL_RELAY_INSURANCE_START_CENTS) {
    return null;
  }

  return (
    MONDIAL_RELAY_INSURANCE_TIERS.find(
      (tier) => itemsTotalCents <= tier.coverageCents,
    ) ?? MONDIAL_RELAY_INSURANCE_TIERS[MONDIAL_RELAY_INSURANCE_TIERS.length - 1]
  );
}
