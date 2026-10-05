import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getPointsBalance } from "@/lib/loyalty";
import { LOYALTY_TIERS } from "@/lib/loyalty-tiers";
import { getActiveUserDiscounts } from "@/lib/user-discounts";

export async function GET() {
  const session = await auth().catch(() => null);

  if (!session?.user?.id) {
    return NextResponse.json({
      balance: 0,
      tiers: LOYALTY_TIERS,
      connected: false,
      discounts: [],
    });
  }

  // Les remises attribuees voyagent avec le solde : le panier fait deja cet
  // appel, inutile d'en ajouter un second.
  const [balance, discounts] = await Promise.all([
    getPointsBalance(session.user.id),
    getActiveUserDiscounts(session.user.id),
  ]);

  return NextResponse.json({
    balance,
    tiers: LOYALTY_TIERS,
    connected: true,
    discounts,
  });
}
