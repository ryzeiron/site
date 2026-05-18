import { NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { isAdmin } from "@/lib/admin/auth";
import {
  getCard,
  isValidVariantKey,
  listVariants,
  type VariantKey,
} from "@/lib/catalog";
import { getDb } from "@/lib/db/client";
import { hiddenVariants } from "@/lib/db/schema";
import { applyStockOverrides } from "@/lib/stock";

type Body = {
  cardId?: string;
  variant?: string;
};

function validateVariantKey(variant: string | undefined): VariantKey | null {
  if (!variant || typeof variant !== "string") return null;
  if (variant === "base" || variant === "alt") return variant;
  if (!isValidVariantKey(variant)) return null;
  return variant;
}

async function readBody(request: Request): Promise<Body | null> {
  try {
    return (await request.json()) as Body;
  } catch {
    return null;
  }
}

export async function POST(request: Request) {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: "Non autorise." }, { status: 401 });
  }

  const body = await readBody(request);
  if (!body) {
    return NextResponse.json({ error: "Requête invalide." }, { status: 400 });
  }

  const { cardId } = body;
  const variant = validateVariantKey(body.variant);
  if (!cardId || !variant) {
    return NextResponse.json({ error: "Champs invalides." }, { status: 400 });
  }

  const card = getCard(cardId);
  if (!card) {
    return NextResponse.json({ error: "Carte introuvable." }, { status: 404 });
  }

  const [liveCard] = await applyStockOverrides([card]);
  const variantExists = listVariants(liveCard ?? card, {
    includeHidden: true,
  }).some(({ key }) => key === variant);

  if (!variantExists) {
    return NextResponse.json(
      { error: "Variante introuvable." },
      { status: 404 },
    );
  }

  try {
    await getDb()
      .insert(hiddenVariants)
      .values({ cardId, variant })
      .onConflictDoUpdate({
        target: [hiddenVariants.cardId, hiddenVariants.variant],
        set: { updatedAt: new Date() },
      });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Erreur base de données.";
    return NextResponse.json({ error: message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, hidden: true });
}

export async function DELETE(request: Request) {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: "Non autorise." }, { status: 401 });
  }

  const body = await readBody(request);
  if (!body) {
    return NextResponse.json({ error: "Requête invalide." }, { status: 400 });
  }

  const { cardId } = body;
  const variant = validateVariantKey(body.variant);
  if (!cardId || !variant) {
    return NextResponse.json({ error: "Champs invalides." }, { status: 400 });
  }

  try {
    await getDb()
      .delete(hiddenVariants)
      .where(
        and(
          eq(hiddenVariants.cardId, cardId),
          eq(hiddenVariants.variant, variant),
        ),
      );
  } catch (e) {
    const message = e instanceof Error ? e.message : "Erreur base de données.";
    return NextResponse.json({ error: message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, hidden: false });
}
