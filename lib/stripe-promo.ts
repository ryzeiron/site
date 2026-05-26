import "server-only";
import type Stripe from "stripe";
import { getStripe } from "@/lib/stripe";

export type StripePromoEffect = {
  code: string;
  source: "stripe";
  type: "percent_off";
  percent: number;
  label: string;
};

function cleanPromoCode(code: string | undefined | null) {
  return code?.trim().toUpperCase() ?? "";
}

function getCoupon(promotionCode: Stripe.PromotionCode): Stripe.Coupon | null {
  const coupon = promotionCode.promotion.coupon;
  return typeof coupon === "string" ? null : coupon;
}

export async function getStripePromotionCode(
  code: string | undefined | null,
): Promise<Stripe.PromotionCode | null> {
  const cleaned = cleanPromoCode(code);
  if (!cleaned) return null;

  const stripe = getStripe();
  const promotionCodes = await stripe.promotionCodes.list({
    active: true,
    code: cleaned,
    expand: ["data.promotion.coupon"],
    limit: 10,
  });

  return (
    promotionCodes.data.find(
      (promo) => {
        const coupon = getCoupon(promo);

        return (
          promo.active &&
          promo.code.toUpperCase() === cleaned &&
          Boolean(coupon?.valid)
        );
      },
    ) ?? null
  );
}

export async function getStripePromoEffect(
  code: string | undefined | null,
): Promise<StripePromoEffect | null> {
  const promotionCode = await getStripePromotionCode(code);
  if (!promotionCode) return null;

  const coupon = getCoupon(promotionCode);
  if (!coupon) return null;

  const percent = coupon.percent_off;

  if (!percent) return null;

  return {
    code: promotionCode.code,
    source: "stripe",
    type: "percent_off",
    percent,
    label: `-${percent}% sur le panier`,
  };
}
