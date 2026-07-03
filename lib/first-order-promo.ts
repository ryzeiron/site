import "server-only";

import { eq, or, sql } from "drizzle-orm";
import { getDb } from "@/lib/db/client";
import { orders } from "@/lib/db/schema";

const FIRST_ORDER_PROMO_CODES = new Set(["BIENVENUE"]);

function cleanPromoCode(code: string | undefined | null) {
  return code?.trim().toUpperCase() ?? "";
}

function cleanEmail(email: string | undefined | null) {
  return email?.trim().toLowerCase() ?? "";
}

export function isFirstOrderPromoCode(code: string | undefined | null) {
  const cleaned = cleanPromoCode(code);
  return !!cleaned && FIRST_ORDER_PROMO_CODES.has(cleaned);
}

export async function hasCustomerAlreadyOrdered(input: {
  userId?: string | null;
  email?: string | null;
}) {
  const userId = input.userId?.trim();
  const email = cleanEmail(input.email);

  if (!userId && !email) return false;

  const db = getDb();
  const emailCondition = email
    ? sql`lower(${orders.customerEmail}) = ${email}`
    : undefined;

  const rows = await db
    .select({ id: orders.id })
    .from(orders)
    .where(
      userId && emailCondition
        ? or(eq(orders.userId, userId), emailCondition)
        : userId
          ? eq(orders.userId, userId)
          : emailCondition,
    )
    .limit(1);

  return rows.length > 0;
}

export async function getFirstOrderPromoError(
  code: string | undefined | null,
  customer: { userId?: string | null; email?: string | null },
) {
  if (!isFirstOrderPromoCode(code)) return null;

  if (!customer.userId && !customer.email) {
    return "Connecte-toi pour utiliser le code BIENVENUE. Il est reserve a la premiere commande.";
  }

  const alreadyOrdered = await hasCustomerAlreadyOrdered(customer);
  if (alreadyOrdered) {
    return "Le code BIENVENUE est reserve a la premiere commande.";
  }

  return null;
}
