import { NextResponse } from "next/server";
import { cleanupExpiredCartReservations } from "@/lib/stock-reservations";

export const runtime = "nodejs";

/**
 * Cron Vercel : libere les reservations 'cart' anciennes (>30 min).
 * Configure dans vercel.json. Securite : verifie le header CRON_SECRET.
 */
export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (secret) {
    const auth = request.headers.get("authorization");
    if (auth !== `Bearer ${secret}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }
  try {
    const released = await cleanupExpiredCartReservations(30);
    return NextResponse.json({ ok: true, released });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Erreur";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
