import "server-only";

export type PromoEffect =
  | { code: string; type: "percent_off"; percent: number; label: string }
  | { code: string; type: "free_shipping"; label: string };

function buildPromos(): Record<string, PromoEffect> {
  const map: Record<string, PromoEffect> = {};

  const percentCode = (process.env.PROMO_PERCENT_CODE ?? "BIENVENUE10").trim();
  const percentValue = Number.parseFloat(
    process.env.PROMO_PERCENT_VALUE ?? "10",
  );
  if (percentCode && Number.isFinite(percentValue) && percentValue > 0 && percentValue < 100) {
    map[percentCode.toUpperCase()] = {
      code: percentCode,
      type: "percent_off",
      percent: percentValue,
      label: `-${percentValue}% sur le panier`,
    };
  }

  const shipCode = (process.env.PROMO_FREESHIP_CODE ?? "LIVRAISONOFFERTE").trim();
  if (shipCode) {
    map[shipCode.toUpperCase()] = {
      code: shipCode,
      type: "free_shipping",
      label: "Livraison offerte",
    };
  }

  return map;
}

export function getPromo(code: string | undefined | null): PromoEffect | null {
  if (!code) return null;
  const cleaned = code.trim().toUpperCase();
  if (!cleaned) return null;
  const promos = buildPromos();
  return promos[cleaned] ?? null;
}
