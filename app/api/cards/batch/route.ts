import { NextResponse } from "next/server";
import { CARDS } from "@/lib/catalog";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { ids?: string[] };
    const ids = Array.isArray(body.ids) ? body.ids.filter(Boolean) : [];
    if (ids.length === 0) {
      return NextResponse.json({ cards: [] });
    }
    const set = new Set(ids);
    const cards = CARDS.filter((c) => set.has(c.id));
    return NextResponse.json({ cards });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Erreur inconnue.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
