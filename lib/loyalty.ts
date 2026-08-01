import { randomUUID } from "crypto";
import { and, desc, eq, gte, sql } from "drizzle-orm";
import { getDb } from "@/lib/db/client";
import { loyaltyLedger, users } from "@/lib/db/schema";

export type LoyaltyReason = "order" | "manual" | "redeem" | "refund";

export type LoyaltyEntry = {
  id: string;
  userId: string;
  orderId: string | null;
  delta: number;
  reason: LoyaltyReason;
  balanceAfter: number;
  createdAt: Date;
};

// 1 euro depense = 1 point (arrondi a l'inferieur sur le total paye).
export function pointsFromCents(totalCents: number | null | undefined): number {
  if (typeof totalCents !== "number" || totalCents <= 0) return 0;
  return Math.floor(totalCents / 100);
}

export async function awardOrderPoints({
  userId,
  orderId,
  amountTotalCents,
}: {
  userId: string;
  orderId: string;
  amountTotalCents: number | null | undefined;
}): Promise<{ awarded: number; balance: number } | null> {
  const delta = pointsFromCents(amountTotalCents);
  if (delta <= 0) return null;

  const db = getDb();

  const [existing] = await db
    .select({ id: loyaltyLedger.id })
    .from(loyaltyLedger)
    .where(
      and(
        eq(loyaltyLedger.userId, userId),
        eq(loyaltyLedger.orderId, orderId),
        eq(loyaltyLedger.reason, "order"),
      ),
    )
    .limit(1);

  if (existing) return null;

  const [updated] = await db
    .update(users)
    .set({ pointsBalance: sql`${users.pointsBalance} + ${delta}` })
    .where(eq(users.id, userId))
    .returning({ balance: users.pointsBalance });

  if (!updated) return null;

  await db.insert(loyaltyLedger).values({
    id: randomUUID(),
    userId,
    orderId,
    delta,
    reason: "order",
    balanceAfter: updated.balance,
  });

  return { awarded: delta, balance: updated.balance };
}

// Debite les points seulement si le solde est suffisant (verifie en SQL pour
// eviter qu'un double checkout depense deux fois les memes points).
export async function redeemPoints({
  userId,
  orderId,
  points,
}: {
  userId: string;
  orderId: string;
  points: number;
}): Promise<{ spent: number; balance: number } | null> {
  if (points <= 0) return null;

  const db = getDb();

  const [existing] = await db
    .select({ id: loyaltyLedger.id })
    .from(loyaltyLedger)
    .where(
      and(
        eq(loyaltyLedger.userId, userId),
        eq(loyaltyLedger.orderId, orderId),
        eq(loyaltyLedger.reason, "redeem"),
      ),
    )
    .limit(1);

  if (existing) return null;

  const [updated] = await db
    .update(users)
    .set({ pointsBalance: sql`${users.pointsBalance} - ${points}` })
    .where(and(eq(users.id, userId), gte(users.pointsBalance, points)))
    .returning({ balance: users.pointsBalance });

  if (!updated) return null;

  await db.insert(loyaltyLedger).values({
    id: randomUUID(),
    userId,
    orderId,
    delta: -points,
    reason: "redeem",
    balanceAfter: updated.balance,
  });

  return { spent: points, balance: updated.balance };
}

export async function getPointsBalance(userId: string): Promise<number> {
  const [row] = await getDb()
    .select({ balance: users.pointsBalance })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);

  return row?.balance ?? 0;
}

// Recapitulatif fidelite d'une commande, pour l'animation post-paiement.
export async function getOrderLoyaltySummary(orderId: string): Promise<{
  earned: number;
  spent: number;
  balance: number;
} | null> {
  const rows = await getDb()
    .select({
      userId: loyaltyLedger.userId,
      delta: loyaltyLedger.delta,
      reason: loyaltyLedger.reason,
      balanceAfter: loyaltyLedger.balanceAfter,
      createdAt: loyaltyLedger.createdAt,
    })
    .from(loyaltyLedger)
    .where(eq(loyaltyLedger.orderId, orderId));

  if (rows.length === 0) return null;

  const earned = rows
    .filter((row) => row.delta > 0)
    .reduce((total, row) => total + row.delta, 0);
  const spent = rows
    .filter((row) => row.delta < 0)
    .reduce((total, row) => total - row.delta, 0);

  // Le solde vient du compte, pas du ledger : d'autres commandes ont pu passer
  // entre-temps et le solde fige dans balanceAfter serait perime.
  const balance = await getPointsBalance(rows[0].userId);

  return { earned, spent, balance };
}

export async function getLoyaltyHistory(
  userId: string,
  limit = 50,
): Promise<LoyaltyEntry[]> {
  const rows = await getDb()
    .select()
    .from(loyaltyLedger)
    .where(eq(loyaltyLedger.userId, userId))
    .orderBy(desc(loyaltyLedger.createdAt))
    .limit(limit);

  return rows.map((row) => ({
    id: row.id,
    userId: row.userId,
    orderId: row.orderId,
    delta: row.delta,
    reason: row.reason as LoyaltyReason,
    balanceAfter: row.balanceAfter,
    createdAt: row.createdAt,
  }));
}
