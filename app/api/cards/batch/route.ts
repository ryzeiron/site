import { NextResponse } from "next/server";
import { getCardsByIds } from "@/lib/custom-cards";
import { applyStockOverrides } from "@/lib/stock";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { ids?: string[] };
    const ids = Array.isArray(body.ids) ? body.ids.filter(Boolean) : [];
    if (ids.length === 0) {
      return NextResponse.json({ cards: [] });
    }
    // Le panier resout ses cartes ici : sans les cartes creees depuis l'admin,
    // elles disparaitraient du panier apres rechargement de la page.
    const resolved = await getCardsByIds(ids, { cache: true });
    const cards = ids
      .map((id) => resolved.get(id))
      .filter((c): c is NonNullable<typeof c> => Boolean(c));
    const withStock = await applyStockOverrides(cards, { cache: true });
    return NextResponse.json({ cards: withStock });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Erreur inconnue.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
