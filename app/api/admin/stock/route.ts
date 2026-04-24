import { NextResponse } from "next/server";
import { isAdmin } from "@/lib/admin/auth";
import { getCard } from "@/lib/catalog";
import { getDb } from "@/lib/db/client";
import { stockOverrides } from "@/lib/db/schema";
import { and, eq } from "drizzle-orm";

type Body = {
  cardId?: string;
  variant?: "base" | "alt";
  stock?: number;
};

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

  const { cardId, variant, stock } = body;
  if (
    !cardId ||
    (variant !== "base" && variant !== "alt") ||
    typeof stock !== "number" ||
    !Number.isInteger(stock) ||
    stock < 0
  ) {
    return NextResponse.json(
      { error: "Champs invalides." },
      { status: 400 },
    );
  }

  const card = getCard(cardId);
  if (!card) {
    return NextResponse.json({ error: "Carte introuvable." }, { status: 404 });
  }
  if (variant === "alt" && !card.altVariant) {
    return NextResponse.json(
      { error: "Cette carte n'a pas de variante alt." },
      { status: 400 },
    );
  }

  const db = getDb();
  await db
    .insert(stockOverrides)
    .values({ cardId, variant, stock })
    .onConflictDoUpdate({
      target: [stockOverrides.cardId, stockOverrides.variant],
      set: { stock, updatedAt: new Date() },
    });

  return NextResponse.json({ ok: true, stock });
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

  const { cardId, variant } = body;
  if (!cardId || (variant !== "base" && variant !== "alt")) {
    return NextResponse.json(
      { error: "Champs invalides." },
      { status: 400 },
    );
  }

  const db = getDb();
  await db
    .delete(stockOverrides)
    .where(
      and(
        eq(stockOverrides.cardId, cardId),
        eq(stockOverrides.variant, variant),
      ),
    );

  return NextResponse.json({ ok: true });
}
