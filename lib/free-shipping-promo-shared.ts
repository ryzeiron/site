// Promo "livraison offerte" sur tout le site, reglee depuis l'admin.
// Fichier sans dependance serveur : utilisable dans le panier (client) et au paiement.

export type FreeShippingPromo = {
  active: boolean;
  // Dates ISO. startsAt null = des l'activation, endsAt null = sans fin.
  startsAt: string | null;
  endsAt: string | null;
  // true = l'assurance Mondial Relay est offerte aussi ; false = le client la paie.
  insuranceIncluded: boolean;
  // Minimum d'achat en centimes : valeur des articles au prix normal,
  // avant code promo, points ou remise. 0 = pas de minimum.
  minItemsCents: number;
};

export const DEFAULT_FREE_SHIPPING_MIN_CENTS = 2000;
export const MAX_FREE_SHIPPING_MIN_CENTS = 100_000;

export const DEFAULT_FREE_SHIPPING_PROMO: FreeShippingPromo = {
  active: false,
  startsAt: null,
  endsAt: null,
  insuranceIncluded: false,
  minItemsCents: DEFAULT_FREE_SHIPPING_MIN_CENTS,
};

function toTime(value: string | null) {
  if (!value) return null;
  const time = Date.parse(value);
  return Number.isFinite(time) ? time : null;
}

export function isFreeShippingPromoLive(
  promo: FreeShippingPromo | null | undefined,
  now: number = Date.now(),
) {
  if (!promo?.active) return false;
  const start = toTime(promo.startsAt);
  const end = toTime(promo.endsAt);
  if (start !== null && now < start) return false;
  if (end !== null && now >= end) return false;
  return true;
}

export type FreeShippingPromoStatus = "inactive" | "scheduled" | "live" | "ended";

export function getFreeShippingPromoStatus(
  promo: FreeShippingPromo,
  now: number = Date.now(),
): FreeShippingPromoStatus {
  if (!promo.active) return "inactive";
  const start = toTime(promo.startsAt);
  const end = toTime(promo.endsAt);
  if (end !== null && now >= end) return "ended";
  if (start !== null && now < start) return "scheduled";
  return "live";
}

export function sanitizeFreeShippingPromo(value: unknown): FreeShippingPromo {
  if (!value || typeof value !== "object") return { ...DEFAULT_FREE_SHIPPING_PROMO };
  const raw = value as Record<string, unknown>;
  const date = (v: unknown) =>
    typeof v === "string" && Number.isFinite(Date.parse(v))
      ? new Date(v).toISOString()
      : null;

  return {
    active: raw.active === true,
    startsAt: date(raw.startsAt),
    endsAt: date(raw.endsAt),
    insuranceIncluded: raw.insuranceIncluded === true,
    minItemsCents:
      typeof raw.minItemsCents === "number" && Number.isFinite(raw.minItemsCents)
        ? Math.min(
            MAX_FREE_SHIPPING_MIN_CENTS,
            Math.max(0, Math.round(raw.minItemsCents)),
          )
        : DEFAULT_FREE_SHIPPING_MIN_CENTS,
  };
}

// Le panier atteint-il le minimum ? (valeur brute des articles, en centimes)
export function meetsFreeShippingMinimum(
  promo: Pick<FreeShippingPromo, "minItemsCents">,
  grossItemsCents: number,
) {
  return grossItemsCents >= promo.minItemsCents;
}

export function formatPromoDate(value: string) {
  return new Date(value).toLocaleString("fr-FR", {
    timeZone: "Europe/Paris",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}
