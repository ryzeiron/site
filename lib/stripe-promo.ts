import "server-only";
import type Stripe from "stripe";
import { getStripe } from "@/lib/stripe";

export type StripePromoEffect =
  | {
      code: string;
      source: "stripe";
      type: "percent_off";
      percent: number;
      label: string;
    }
  | {
      code: string;
      source: "stripe";
      type: "amount_off";
      amountOffCents: number;
      currency: "eur";
      label: string;
    };

export type StripePromotionCodeMatch = {
  promotionCode: Stripe.PromotionCode;
  restrictedCustomerId: string | null;
};

function cleanPromoCode(code: string | undefined | null) {
  return code?.trim().toUpperCase() ?? "";
}

function cleanEmail(email: string | undefined | null) {
  return email?.trim().toLowerCase() ?? "";
}

function getCoupon(promotionCode: Stripe.PromotionCode): Stripe.Coupon | null {
  const coupon = promotionCode.promotion.coupon;
  return typeof coupon === "string" ? null : coupon;
}

async function getRestrictedCustomer(
  stripe: Stripe,
  promotionCode: Stripe.PromotionCode,
): Promise<{ id: string; email: string | null } | null> {
  const customer = promotionCode.customer;
  if (!customer) return null;

  if (typeof customer === "string") {
    const row = await stripe.customers.retrieve(customer);
    if ("deleted" in row && row.deleted) {
      return { id: customer, email: null };
    }

    return { id: row.id, email: cleanEmail(row.email) || null };
  }

  if ("deleted" in customer && customer.deleted) {
    return { id: customer.id, email: null };
  }

  return { id: customer.id, email: cleanEmail(customer.email) || null };
}

function formatEuroCents(cents: number) {
  return new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency: "EUR",
  }).format(cents / 100);
}

export async function getStripePromotionCode(
  code: string | undefined | null,
): Promise<Stripe.PromotionCode | null> {
  const match = await getStripePromotionCodeMatch(code);
  return match?.promotionCode ?? null;
}

export async function getStripePromotionCodeMatch(
  code: string | undefined | null,
  customerEmail?: string | null,
): Promise<StripePromotionCodeMatch | null> {
  const cleaned = cleanPromoCode(code);
  if (!cleaned) return null;

  const stripe = getStripe();
  const cleanedCustomerEmail = cleanEmail(customerEmail);
  const promotionCodes = await stripe.promotionCodes.list({
    active: true,
    code: cleaned,
    expand: ["data.promotion.coupon", "data.customer"],
    limit: 10,
  });

  for (const promo of promotionCodes.data) {
    const coupon = getCoupon(promo);

    if (
      !promo.active ||
      promo.code.toUpperCase() !== cleaned ||
      !coupon?.valid
    ) {
      continue;
    }

    const restrictedCustomer = await getRestrictedCustomer(stripe, promo);

    if (restrictedCustomer) {
      if (
        !cleanedCustomerEmail ||
        restrictedCustomer.email !== cleanedCustomerEmail
      ) {
        continue;
      }

      return {
        promotionCode: promo,
        restrictedCustomerId: restrictedCustomer.id,
      };
    }

    return { promotionCode: promo, restrictedCustomerId: null };
  }

  return null;
}

export async function getStripePromoEffect(
  code: string | undefined | null,
  customerEmail?: string | null,
): Promise<StripePromoEffect | null> {
  const match = await getStripePromotionCodeMatch(code, customerEmail);
  if (!match) return null;

  const coupon = getCoupon(match.promotionCode);
  if (!coupon) return null;

  const percent = coupon.percent_off;

  if (percent) {
    return {
      code: match.promotionCode.code,
      source: "stripe",
      type: "percent_off",
      percent,
      label: `-${percent}% sur le panier`,
    };
  }

  if (coupon.amount_off && coupon.currency?.toLowerCase() === "eur") {
    return {
      code: match.promotionCode.code,
      source: "stripe",
      type: "amount_off",
      amountOffCents: coupon.amount_off,
      currency: "eur",
      label: `-${formatEuroCents(coupon.amount_off)} sur le panier`,
    };
  }

  return null;
}
