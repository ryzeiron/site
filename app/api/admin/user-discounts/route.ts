import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { isAdmin } from "@/lib/admin/auth";
import { getDb } from "@/lib/db/client";
import { users } from "@/lib/db/schema";
import {
  getActiveUserDiscounts,
  grantUserDiscount,
  revokeUserDiscount,
} from "@/lib/user-discounts";

export const runtime = "nodejs";

const MAX_PERCENT = 100;
const MAX_AMOUNT_CENTS = 100_000;

export async function GET(request: Request) {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: "Non autorise." }, { status: 401 });
  }

  const userId = new URL(request.url).searchParams.get("userId")?.trim();
  if (!userId) {
    return NextResponse.json({ error: "Client manquant." }, { status: 400 });
  }

  return NextResponse.json({ discounts: await getActiveUserDiscounts(userId) });
}

export async function POST(request: Request) {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: "Non autorise." }, { status: 401 });
  }

  let body: {
    userId?: string;
    type?: string;
    percent?: number;
    amount?: number;
    note?: string;
  };

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Requete invalide." }, { status: 400 });
  }

  const userId = body.userId?.trim();
  if (!userId) {
    return NextResponse.json({ error: "Client manquant." }, { status: 400 });
  }

  const [client] = await getDb()
    .select({ id: users.id })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1)
    .catch(() => []);

  if (!client) {
    return NextResponse.json({ error: "Client introuvable." }, { status: 404 });
  }

  const type = body.type === "percent" ? "percent" : "amount";

  if (type === "percent") {
    const percent = Math.round(Number(body.percent));
    if (!Number.isInteger(percent) || percent <= 0 || percent > MAX_PERCENT) {
      return NextResponse.json(
        { error: "Pourcentage invalide (1 a 100)." },
        { status: 400 },
      );
    }

    const discount = await grantUserDiscount({
      userId,
      type,
      percent,
      note: body.note,
    });
    return NextResponse.json({ ok: true, discount });
  }

  const amountOffCents = Math.round(Number(body.amount) * 100);
  if (
    !Number.isFinite(amountOffCents) ||
    amountOffCents < 50 ||
    amountOffCents > MAX_AMOUNT_CENTS
  ) {
    return NextResponse.json(
      { error: "Montant invalide (minimum 0,50 EUR)." },
      { status: 400 },
    );
  }

  const discount = await grantUserDiscount({
    userId,
    type,
    amountOffCents,
    note: body.note,
  });

  return NextResponse.json({ ok: true, discount });
}

export async function DELETE(request: Request) {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: "Non autorise." }, { status: 401 });
  }

  let body: { userId?: string; discountId?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Requete invalide." }, { status: 400 });
  }

  const userId = body.userId?.trim();
  const discountId = body.discountId?.trim();

  if (!userId || !discountId) {
    return NextResponse.json({ error: "Remise manquante." }, { status: 400 });
  }

  await revokeUserDiscount(userId, discountId);

  return NextResponse.json({ ok: true });
}
