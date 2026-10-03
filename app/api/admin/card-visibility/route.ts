import { NextResponse } from "next/server";
import { eq, inArray } from "drizzle-orm";
import { isAdmin } from "@/lib/admin/auth";
import { listVariants } from "@/lib/catalog";
import { getCardById, revalidateCustomCardsCache } from "@/lib/custom-cards";
import { getDb } from "@/lib/db/client";
import { hiddenVariants } from "@/lib/db/schema";
import { revalidatePublicStockCache } from "@/lib/stock";

export const runtime = "nodejs";

// Masquer une carte entiere revient a masquer toutes ses variantes : la grille
// boutique ecarte deja une carte dont aucune variante n'est visible. Ca evite
// d'introduire un second mecanisme de visibilite a cote de hidden_variants.

type Body = { cardId?: string; hidden?: boolean };

export async function POST(request: Request) {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: "Non autorise." }, { status: 401 });
  }

  let body: Body;
  try {
    body = (await request.json()) as Body;
  } catch {
    return NextResponse.json({ error: "Requete invalide." }, { status: 400 });
  }

  const cardId = body.cardId?.trim();
  if (!cardId) {
    return NextResponse.json({ error: "Carte manquante." }, { status: 400 });
  }

  const card = await getCardById(cardId);
  if (!card) {
    return NextResponse.json({ error: "Carte introuvable." }, { status: 404 });
  }

  const keys = listVariants(card, { includeHidden: true }).map(({ key }) => key);
  const db = getDb();

  try {
    if (body.hidden === false) {
      await db.delete(hiddenVariants).where(eq(hiddenVariants.cardId, cardId));
    } else {
      if (keys.length === 0) {
        return NextResponse.json(
          { error: "Cette carte n'a aucune variante a masquer." },
          { status: 400 },
        );
      }

      await db
        .insert(hiddenVariants)
        .values(keys.map((key) => ({ cardId, variant: key })))
        .onConflictDoNothing();
    }

    revalidatePublicStockCache();
    revalidateCustomCardsCache();

    return NextResponse.json({ ok: true, variants: keys.length });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Erreur base de donnees.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// Liste les cartes entierement masquees, pour l'onglet de restauration.
export async function GET() {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: "Non autorise." }, { status: 401 });
  }

  try {
    const rows = await getDb()
      .select({
        cardId: hiddenVariants.cardId,
        variant: hiddenVariants.variant,
      })
      .from(hiddenVariants);

    const byCard = new Map<string, string[]>();
    for (const row of rows) {
      byCard.set(row.cardId, [...(byCard.get(row.cardId) ?? []), row.variant]);
    }

    const cards = [];
    for (const [cardId, hiddenKeys] of byCard) {
      const card = await getCardById(cardId);
      if (!card) continue;

      const all = listVariants(card, { includeHidden: true }).map((v) => v.key);
      // Une carte n'est "masquee" que si aucune de ses variantes n'est visible.
      if (all.length === 0 || all.some((key) => !hiddenKeys.includes(key))) {
        continue;
      }

      cards.push({
        id: card.id,
        name: card.name,
        number: card.number,
        serieId: card.serieId,
        image: card.image ?? null,
      });
    }

    cards.sort((a, b) => a.number.localeCompare(b.number, "fr", { numeric: true }));

    return NextResponse.json({ cards });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Erreur base de donnees.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: "Non autorise." }, { status: 401 });
  }

  let body: { cardIds?: string[] };
  try {
    body = (await request.json()) as { cardIds?: string[] };
  } catch {
    return NextResponse.json({ error: "Requete invalide." }, { status: 400 });
  }

  const cardIds = (body.cardIds ?? []).map((id) => id.trim()).filter(Boolean);
  if (cardIds.length === 0) {
    return NextResponse.json({ error: "Aucune carte." }, { status: 400 });
  }

  try {
    await getDb()
      .delete(hiddenVariants)
      .where(inArray(hiddenVariants.cardId, cardIds));

    revalidatePublicStockCache();
    revalidateCustomCardsCache();

    return NextResponse.json({ ok: true, restored: cardIds.length });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Erreur base de donnees.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
