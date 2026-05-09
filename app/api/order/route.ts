import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { getDb } from "@/lib/db/client";
import { orders } from "@/lib/db/schema";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function POST(request: Request) {
  let body: { id?: string; email?: string };
  try {
    body = (await request.json()) as { id?: string; email?: string };
  } catch {
    return NextResponse.json({ error: "Requete invalide." }, { status: 400 });
  }

  const id = (body.id ?? "").trim();
  const email = (body.email ?? "").trim().toLowerCase();
  if (!id) {
    return NextResponse.json(
      { error: "Numero de commande requis." },
      { status: 400 },
    );
  }
  if (!EMAIL_RE.test(email)) {
    return NextResponse.json({ error: "Email invalide." }, { status: 400 });
  }

  try {
    const db = getDb();
    const rows = await db.select().from(orders).where(eq(orders.id, id));
    const order = rows[0];
    if (!order) {
      return NextResponse.json(
        { error: "Aucune commande trouvee avec ce numero." },
        { status: 404 },
      );
    }
    const normalizedEmail = (order.customerEmail ?? "").trim().toLowerCase();
    if (normalizedEmail !== email) {
      return NextResponse.json(
        { error: "Email ne correspond pas a cette commande." },
        { status: 403 },
      );
    }
    // Ne renvoyer que les infos publiques (pas de label URL etc.)
    return NextResponse.json({
      id: order.id,
      status: order.status,
      country: order.country,
      relayName: order.relayName,
      relayAddress: order.relayAddress,
      relayPostcode: order.relayPostcode,
      relayCity: order.relayCity,
      relayCode: order.relayCode,
      tracking: order.mondialRelayExpeditionNumber,
      createdAt: order.createdAt,
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Erreur base de donnees.";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
