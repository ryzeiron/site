export const DELIVERY_COUNTRIES = [
  { code: "FR", label: "France" },
  { code: "BE", label: "Belgique" },
  { code: "LU", label: "Luxembourg" },
  { code: "NL", label: "Pays-Bas" },
  { code: "ES", label: "Espagne" },
  { code: "PT", label: "Portugal" },
  { code: "DE", label: "Allemagne" },
  { code: "IT", label: "Italie" },
  { code: "AT", label: "Autriche" },
] as const;

export type DeliveryCountry = (typeof DELIVERY_COUNTRIES)[number]["code"];

export type DeliveryProfileData = {
  firstName: string | null;
  lastName: string | null;
  phone: string | null;
  address: string | null;
  postcode: string | null;
  city: string | null;
  country: DeliveryCountry;
  relayCode: string | null;
  relayName: string | null;
  relayAddress: string | null;
  relayPostcode: string | null;
  relayCity: string | null;
};

export type DeliveryProfileInput = Partial<
  Record<keyof DeliveryProfileData, unknown>
>;

const COUNTRY_SET = new Set<string>(
  DELIVERY_COUNTRIES.map((country) => country.code),
);

function cleanText(value: unknown, maxLength: number) {
  const text = String(value ?? "").trim().replace(/\s+/g, " ");
  return text ? text.slice(0, maxLength) : null;
}

export function isDeliveryCountry(value: unknown): value is DeliveryCountry {
  return typeof value === "string" && COUNTRY_SET.has(value);
}

export function normalizeDeliveryProfileInput(
  input: DeliveryProfileInput,
): DeliveryProfileData {
  return {
    firstName: cleanText(input.firstName, 80),
    lastName: cleanText(input.lastName, 80),
    phone: cleanText(input.phone, 30),
    address: cleanText(input.address, 180),
    postcode: cleanText(input.postcode, 20),
    city: cleanText(input.city, 100),
    country: isDeliveryCountry(input.country) ? input.country : "FR",
    relayCode: cleanText(input.relayCode, 40),
    relayName: cleanText(input.relayName, 160),
    relayAddress: cleanText(input.relayAddress, 180),
    relayPostcode: cleanText(input.relayPostcode, 20),
    relayCity: cleanText(input.relayCity, 100),
  };
}

export function hasDeliveryProfileData(profile: DeliveryProfileData) {
  return Boolean(
    profile.firstName ||
      profile.lastName ||
      profile.phone ||
      profile.address ||
      profile.postcode ||
      profile.city ||
      profile.relayCode ||
      profile.relayName ||
      profile.relayAddress ||
      profile.relayPostcode ||
      profile.relayCity,
  );
}
