import { and, eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { isAdmin } from "@/lib/admin/auth";
import { getDb } from "@/lib/db/client";
import { favoriteCards, favoriteSleeves } from "@/lib/db/schema";

type Body = {
  type?: "card" | "sleeve";
  userId?: string;
  cardId?: string;
  variant?: string;
  sleeveId?: string;
};

function clean(value?: string) {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

export async function DELETE(request: Request) {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: "Non autorise." }, { status: 401 });
  }

  let body: Body;

  try {
    body = (await request.json()) as Body;
  } catch {
    return NextResponse.json({ error: "Requete invalide." }, { status: 400 });
  }

  const db = getDb();
  const userId = clean(body.userId);

  try {
    if (body.type === "card") {
      const cardId = clean(body.cardId);
      const variant = clean(body.variant);

      if (!cardId || !variant) {
        return NextResponse.json({ error: "Favori carte invalide." }, { status: 400 });
      }

      await db.delete(favoriteCards).where(
        userId
          ? and(
              eq(favoriteCards.userId, userId),
              eq(favoriteCards.cardId, cardId),
              eq(favoriteCards.variant, variant),
            )
          : and(eq(favoriteCards.cardId, cardId), eq(favoriteCards.variant, variant)),
      );

      return NextResponse.json({ ok: true });
    }

    if (body.type === "sleeve") {
      const sleeveId = clean(body.sleeveId);

      if (!sleeveId) {
        return NextResponse.json({ error: "Favori sleeve invalide." }, { status: 400 });
      }

      await db.delete(favoriteSleeves).where(
        userId
          ? and(eq(favoriteSleeves.userId, userId), eq(favoriteSleeves.sleeveId, sleeveId))
          : eq(favoriteSleeves.sleeveId, sleeveId),
      );

      return NextResponse.json({ ok: true });
    }

    return NextResponse.json({ error: "Type de favori invalide." }, { status: 400 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Erreur inconnue.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
