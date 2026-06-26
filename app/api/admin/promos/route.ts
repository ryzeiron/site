import { NextResponse } from "next/server";
import type Stripe from "stripe";
import { isAdmin } from "@/lib/admin/auth";
import { getStripe } from "@/lib/stripe";

export const runtime = "nodejs";

type Body = {
  code?: string;
  discountType?: "percent" | "amount";
  percentOff?: number;
  amountOffEuros?: number;
  expiresAt?: string;
  maxRedemptions?: number;
  customerEmail?: string;
  minimumAmountEuros?: number;
};

const CODE_RE = /^[a-z0-9-]{3,40}$/i;

export async function POST(request: Request) {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: "Non autorise." }, { status: 401 });
  }

  let body: Body;
  try {
    body = (await request.json()) as Body;
  } catch {
    return NextResponse.json({ error: "Requete invalide." }, { status: 400 });
  }

  try {
    const input = parsePromoInput(body);
    const stripe = getStripe();
    const existing = await stripe.promotionCodes.list({
      active: true,
      code: input.code,
      limit: 1,
    });

    if (existing.data.length > 0) {
      return NextResponse.json(
        { error: "Ce code promo existe deja dans Stripe." },
        { status: 409 },
      );
    }

    const customerId = input.customerEmail
      ? await getOrCreateStripeCustomer(stripe, input.customerEmail)
      : null;
    const coupon = await stripe.coupons.create({
      duration: "once",
      name: `PokeDel62 ${input.code}`,
      ...(input.discountType === "percent"
        ? { percent_off: input.percentOff }
        : { amount_off: input.amountOffCents, currency: "eur" }),
      ...(input.expiresAtTimestamp ? { redeem_by: input.expiresAtTimestamp } : {}),
      metadata: {
        source: "pokedel-admin",
        excludes_shipping: "true",
      },
    });
    const promotionCode = await stripe.promotionCodes.create({
      promotion: { type: "coupon", coupon: coupon.id },
      code: input.code,
      active: true,
      ...(customerId ? { customer: customerId } : {}),
      ...(input.expiresAtTimestamp ? { expires_at: input.expiresAtTimestamp } : {}),
      ...(input.maxRedemptions ? { max_redemptions: input.maxRedemptions } : {}),
      ...(input.minimumAmountCents
        ? {
            restrictions: {
              minimum_amount: input.minimumAmountCents,
              minimum_amount_currency: "eur",
            },
          }
        : {}),
      metadata: {
        source: "pokedel-admin",
        customer_email: input.customerEmail ?? "",
        excludes_shipping: "true",
      },
    });

    return NextResponse.json({
      promo: {
        code: promotionCode.code,
        couponId: coupon.id,
        promotionCodeId: promotionCode.id,
      },
    });
  } catch (e) {
    const message =
      e instanceof PromoInputError
        ? e.message
        : e instanceof Error
          ? e.message
          : "Erreur Stripe.";
    const status = e instanceof PromoInputError ? e.status : 500;

    return NextResponse.json({ error: message }, { status });
  }
}

class PromoInputError extends Error {
  status: number;

  constructor(message: string, status = 400) {
    super(message);
    this.status = status;
  }
}

function parsePromoInput(body: Body) {
  const code = body.code?.trim().toUpperCase() ?? "";
  if (!CODE_RE.test(code)) {
    throw new PromoInputError(
      "Code invalide. Utilise lettres, chiffres ou tirets, 3 caracteres minimum.",
    );
  }

  const discountType = body.discountType === "percent" ? "percent" : "amount";
  const percentOff = Number(body.percentOff);
  const amountOffCents = Math.round(Number(body.amountOffEuros) * 100);
  const maxRedemptions = Math.trunc(Number(body.maxRedemptions));
  const minimumAmountCents = Math.round(Number(body.minimumAmountEuros) * 100);
  const customerEmail = cleanEmail(body.customerEmail);
  const expiresAtTimestamp = parseExpirationDate(body.expiresAt);

  if (discountType === "percent") {
    if (!Number.isFinite(percentOff) || percentOff <= 0 || percentOff > 100) {
      throw new PromoInputError("Pourcentage invalide.");
    }
  } else if (!Number.isFinite(amountOffCents) || amountOffCents < 50) {
    throw new PromoInputError("Montant invalide. Minimum 0,50 euro.");
  }

  if (body.maxRedemptions && (!Number.isInteger(maxRedemptions) || maxRedemptions <= 0)) {
    throw new PromoInputError("Nombre d'utilisations invalide.");
  }

  if (
    body.minimumAmountEuros &&
    (!Number.isFinite(minimumAmountCents) || minimumAmountCents < 0)
  ) {
    throw new PromoInputError("Minimum de commande invalide.");
  }

  if (body.customerEmail && !customerEmail) {
    throw new PromoInputError("Email client invalide.");
  }

  return {
    code,
    discountType,
    percentOff,
    amountOffCents,
    maxRedemptions: maxRedemptions > 0 ? maxRedemptions : null,
    minimumAmountCents: minimumAmountCents > 0 ? minimumAmountCents : null,
    customerEmail,
    expiresAtTimestamp,
  };
}

function cleanEmail(value: string | undefined | null) {
  const cleaned = value?.trim().toLowerCase() ?? "";
  if (!cleaned) return null;
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleaned)) return null;
  return cleaned;
}

function parseExpirationDate(value: string | undefined | null) {
  const cleaned = value?.trim();
  if (!cleaned) return null;

  const match = cleaned.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) throw new PromoInputError("Date limite invalide.");

  const [, year, month, day] = match.map(Number);
  const timestamp = getParisTimestamp(year, month, day, 23, 59, 59);

  if (timestamp <= Math.floor(Date.now() / 1000)) {
    throw new PromoInputError("La date limite doit etre dans le futur.");
  }

  return timestamp;
}

function getParisTimestamp(
  year: number,
  month: number,
  day: number,
  hour: number,
  minute: number,
  second: number,
) {
  const utcGuess = Date.UTC(year, month - 1, day, hour, minute, second);
  const parts = new Intl.DateTimeFormat("fr-FR", {
    timeZone: "Europe/Paris",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  }).formatToParts(new Date(utcGuess));
  const values = Object.fromEntries(
    parts
      .filter((part) => part.type !== "literal")
      .map((part) => [part.type, part.value]),
  );
  const displayedAsUtc = Date.UTC(
    Number(values.year),
    Number(values.month) - 1,
    Number(values.day),
    Number(values.hour),
    Number(values.minute),
    Number(values.second),
  );
  const offset = displayedAsUtc - utcGuess;

  return Math.floor((utcGuess - offset) / 1000);
}

async function getOrCreateStripeCustomer(stripe: Stripe, email: string) {
  const existing = await stripe.customers.list({ email, limit: 1 });
  const customer = existing.data.find((row) => !row.deleted);

  if (customer) return customer.id;

  const created = await stripe.customers.create({
    email,
    metadata: { source: "pokedel-admin-promo" },
  });

  return created.id;
}
