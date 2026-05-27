import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { isAdmin } from "@/lib/admin/auth";
import { getCard, isCondition } from "@/lib/catalog";
import { getDb } from "@/lib/db/client";
import { cardOverrides } from "@/lib/db/schema";
import { revalidatePublicStockCache } from "@/lib/stock";

type Body = {
  cardId?: string;
  name?: string | null;
  condition?: string | null;
  image?: string | null;
  imageBack?: string | null;
  description?: string | null;
  weightGrams?: number | null;
};

function clean(v: unknown): string | null | undefined {
  if (v === undefined) return undefined;
  if (v === null) return null;
  if (typeof v !== "string") return undefined;
  const trimmed = v.trim();
  return trimmed === "" ? null : trimmed;
}

function cleanWeight(v: unknown): number | null | undefined {
  if (v === undefined) return undefined;
  if (v === null) return null;
  if (typeof v !== "number" || !Number.isFinite(v) || v < 0) return undefined;
  return Math.round(v);
}

function cleanCondition(v: unknown): string | null | undefined {
  if (v === undefined) return undefined;
  if (v === null) return null;
  if (typeof v !== "string") return undefined;

  const trimmed = v.trim();
  if (trimmed === "") return null;

  return isCondition(trimmed) ? trimmed : undefined;
}

export async function POST(request: Request) {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: "Non autorise." }, { status: 401 });
  }

  let body: Body;

  try {
    body = (await request.json()) as Body;
  } catch {
    return NextResponse.json({ error: "Requête invalide." }, { status: 400 });
  }

  const { cardId } = body;

  if (!cardId || !getCard(cardId)) {
    return NextResponse.json(
      { error: "Carte introuvable." },
      { status: 404 },
    );
  }

  const name = clean(body.name);
  const condition = cleanCondition(body.condition);
  const image = clean(body.image);
  const imageBack = clean(body.imageBack);
  const description = clean(body.description);
  const weightGrams = cleanWeight(body.weightGrams);

  if (
    name === undefined &&
    condition === undefined &&
    image === undefined &&
    imageBack === undefined &&
    description === undefined &&
    weightGrams === undefined
  ) {
    return NextResponse.json(
      { error: "Aucune modification à enregistrer." },
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
        condition: condition ?? null,
        image: image ?? null,
        imageBack: imageBack ?? null,
        description: description ?? null,
        weightGrams: weightGrams ?? null,
      })
      .onConflictDoUpdate({
        target: cardOverrides.cardId,
        set: {
          ...(name !== undefined ? { name } : {}),
          ...(condition !== undefined ? { condition } : {}),
          ...(image !== undefined ? { image } : {}),
          ...(imageBack !== undefined ? { imageBack } : {}),
          ...(description !== undefined ? { description } : {}),
          ...(weightGrams !== undefined ? { weightGrams } : {}),
          updatedAt: new Date(),
        },
      });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Erreur base de données.";
    return NextResponse.json({ error: message }, { status: 500 });
  }

  revalidatePublicStockCache();

  return NextResponse.json({
    ok: true,
    name,
    condition,
    image,
    imageBack,
    description,
    weightGrams,
  });
}

export async function DELETE(request: Request) {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: "Non autorise." }, { status: 401 });
  }

  let body: { cardId?: string };

  try {
    body = (await request.json()) as { cardId?: string };
  } catch {
    return NextResponse.json({ error: "Requête invalide." }, { status: 400 });
  }

  if (!body.cardId) {
    return NextResponse.json({ error: "cardId requis." }, { status: 400 });
  }

  try {
    const db = getDb();
    await db.delete(cardOverrides).where(eq(cardOverrides.cardId, body.cardId));
  } catch (e) {
    const message = e instanceof Error ? e.message : "Erreur base de données.";
    return NextResponse.json({ error: message }, { status: 500 });
  }

  revalidatePublicStockCache();

  return NextResponse.json({ ok: true });
}
