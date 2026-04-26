import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { isAdmin } from "@/lib/admin/auth";
import { getCard } from "@/lib/catalog";
import { getDb } from "@/lib/db/client";
import { cardOverrides } from "@/lib/db/schema";

type Body = {
  cardId?: string;
  name?: string | null;
  image?: string | null;
  description?: string | null;
};

function clean(v: unknown): string | null | undefined {
  if (v === undefined) return undefined;
  if (v === null) return null;
  if (typeof v !== "string") return undefined;
  const trimmed = v.trim();
  return trimmed === "" ? null : trimmed;
}

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

  const { cardId } = body;
  if (!cardId || !getCard(cardId)) {
    return NextResponse.json(
      { error: "Carte introuvable." },
      { status: 404 },
    );
  }

  const name = clean(body.name);
  const image = clean(body.image);
  const description = clean(body.description);

  if (name === undefined && image === undefined && description === undefined) {
    return NextResponse.json(
      { error: "Aucune modification a enregistrer." },
      { status: 400 },
    );
  }

  try {
    const db = getDb();
    await db
      .insert(cardOverrides)
      .values({
        cardId,
        name: name ?? null,
        image: image ?? null,
        description: description ?? null,
      })
      .onConflictDoUpdate({
        target: cardOverrides.cardId,
        set: {
          ...(name !== undefined ? { name } : {}),
          ...(image !== undefined ? { image } : {}),
          ...(description !== undefined ? { description } : {}),
          updatedAt: new Date(),
        },
      });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Erreur base de donnees.";
    return NextResponse.json({ error: message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, name, image, description });
}

export async function DELETE(request: Request) {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: "Non autorise." }, { status: 401 });
  }

  let body: { cardId?: string };
  try {
    body = (await request.json()) as { cardId?: string };
  } catch {
    return NextResponse.json({ error: "Requete invalide." }, { status: 400 });
  }

  if (!body.cardId) {
    return NextResponse.json({ error: "cardId requis." }, { status: 400 });
  }

  try {
    const db = getDb();
    await db.delete(cardOverrides).where(eq(cardOverrides.cardId, body.cardId));
  } catch (e) {
    const message = e instanceof Error ? e.message : "Erreur base de donnees.";
    return NextResponse.json({ error: message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
