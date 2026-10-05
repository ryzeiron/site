import "server-only";

import { randomUUID } from "node:crypto";
import { and, desc, eq } from "drizzle-orm";
import { getDb } from "@/lib/db/client";
import { userDiscounts } from "@/lib/db/schema";

// Remise attribuee a un client depuis l'admin, liee a son compte. Aucun code a
// saisir, donc aucune des erreurs de correspondance qu'un code promo implique.

export type UserDiscount = {
  id: string;
  type: "percent" | "amount";
  percent: number | null;
  amountOffCents: number | null;
  note: string | null;
  label: string;
  createdAt: Date;
};

type Row = typeof userDiscounts.$inferSelect;

function formatEuros(cents: number) {
  return new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency: "EUR",
  }).format(cents / 100);
}

function toDiscount(row: Row): UserDiscount {
  const type = row.type === "percent" ? "percent" : "amount";
  const label =
    type === "percent"
      ? `-${row.percent ?? 0} % sur le panier`
      : `-${formatEuros(row.amountOffCents ?? 0)} sur le panier`;

  return {
    id: row.id,
    type,
    percent: row.percent,
    amountOffCents: row.amountOffCents,
    note: row.note,
    label,
    createdAt: row.createdAt,
  };
}

export async function getActiveUserDiscounts(
  userId: string,
): Promise<UserDiscount[]> {
  try {
    const rows = await getDb()
      .select()
      .from(userDiscounts)
      .where(
        and(eq(userDiscounts.userId, userId), eq(userDiscounts.status, "active")),
      )
      .orderBy(desc(userDiscounts.createdAt));

    return rows.map(toDiscount);
  } catch {
    // Table absente ou base indisponible : mieux vaut un panier sans remise
    // qu'un panier casse.
    return [];
  }
}

export async function getUserDiscount(
  userId: string,
  discountId: string,
): Promise<UserDiscount | null> {
  const [row] = await getDb()
    .select()
    .from(userDiscounts)
    .where(
      and(
        eq(userDiscounts.id, discountId),
        eq(userDiscounts.userId, userId),
        eq(userDiscounts.status, "active"),
      ),
    )
    .limit(1)
    .catch(() => []);

  return row ? toDiscount(row) : null;
}

export async function grantUserDiscount({
  userId,
  type,
  percent,
  amountOffCents,
  note,
}: {
  userId: string;
  type: "percent" | "amount";
  percent?: number;
  amountOffCents?: number;
  note?: string | null;
}): Promise<UserDiscount> {
  const id = randomUUID();

  await getDb().insert(userDiscounts).values({
    id,
    userId,
    type,
    percent: type === "percent" ? (percent ?? 0) : null,
    amountOffCents: type === "amount" ? (amountOffCents ?? 0) : null,
    note: note?.trim() || null,
  });

  return toDiscount({
    id,
    userId,
    type,
    percent: type === "percent" ? (percent ?? 0) : null,
    amountOffCents: type === "amount" ? (amountOffCents ?? 0) : null,
    note: note?.trim() || null,
    status: "active",
    orderId: null,
    createdAt: new Date(),
    usedAt: null,
  });
}

export async function revokeUserDiscount(userId: string, discountId: string) {
  await getDb()
    .delete(userDiscounts)
    .where(
      and(eq(userDiscounts.id, discountId), eq(userDiscounts.userId, userId)),
    );
}

// Consomme la remise une fois la commande payee. La condition sur status rend
// l'operation idempotente : un webhook rejoue ne la consomme pas deux fois.
export async function consumeUserDiscount({
  discountId,
  orderId,
}: {
  discountId: string;
  orderId: string;
}): Promise<boolean> {
  const updated = await getDb()
    .update(userDiscounts)
    .set({ status: "used", orderId, usedAt: new Date() })
    .where(
      and(eq(userDiscounts.id, discountId), eq(userDiscounts.status, "active")),
    )
    .returning({ id: userDiscounts.id })
    .catch(() => []);

  return updated.length > 0;
}
