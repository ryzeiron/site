import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getPointsBalance } from "@/lib/loyalty";
import { LOYALTY_TIERS } from "@/lib/loyalty-tiers";

export async function GET() {
  const session = await auth().catch(() => null);

  if (!session?.user?.id) {
    return NextResponse.json({ balance: 0, tiers: LOYALTY_TIERS, connected: false });
  }

  const balance = await getPointsBalance(session.user.id);

  return NextResponse.json({ balance, tiers: LOYALTY_TIERS, connected: true });
}
