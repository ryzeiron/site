import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { isAdmin } from "@/lib/admin/auth";
import { getCard, getSerie, isRarity } from "@/lib/catalog";
import { revalidateCustomCardsCache } from "@/lib/custom-cards";
import { getDb } from "@/lib/db/client";
import { customCards } from "@/lib/db/schema";
import { deleteManagedPhoto } from "@/lib/media";
import { revalidatePublicStockCache } from "@/lib/stock";

export const runtime = "nodejs";

type Body = {
  serieId?: string;
  name?: string;
  number?: string;
  rarity?: string;
  price?: number;
  stock?: number;
  image?: string | null;
};

function slugify(value: string): string {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40);
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

  const serieId = body.serieId?.trim() ?? "";
  const name = body.name?.trim().slice(0, 120) ?? "";
  const number = body.number?.trim().slice(0, 40) ?? "";
  const rarity = body.rarity?.trim() ?? "";
  const priceCents = Math.round(Number(body.price ?? 0) * 100);
  const stock = Math.trunc(Number(body.stock ?? 0));
  const image = body.image?.trim() || null;

  if (!getSerie(serieId)) {
    return NextResponse.json({ error: "Serie introuvable." }, { status: 400 });
  }
  if (!name) {
    return NextResponse.json({ error: "Le nom est obligatoire." }, { status: 400 });
  }
  if (!number) {
    return NextResponse.json(
      { error: "Le numero est obligatoire." },
      { status: 400 },
    );
  }
  if (!isRarity(rarity)) {
    return NextResponse.json({ error: "Rarete invalide." }, { status: 400 });
  }
  if (!Number.isFinite(priceCents) || priceCents < 0) {
    return NextResponse.json({ error: "Prix invalide." }, { status: 400 });
  }
  if (!Number.isInteger(stock) || stock < 0) {
    return NextResponse.json({ error: "Stock invalide." }, { status: 400 });
  }

  // L'identifiant derive du numero, qui est unique au sein d'une serie.
  const baseId = `${serieId}-${slugify(number) || slugify(name)}`;

  if (!baseId || baseId.endsWith("-")) {
    return NextResponse.json(
      { error: "Impossible de generer un identifiant depuis ce numero." },
      { status: 400 },
    );
  }

  // Une collision avec le catalogue statique ferait que la carte creee serait
  // masquee par celle du fichier, sans aucun signe visible.
  if (getCard(baseId)) {
    return NextResponse.json(
      { error: `L'identifiant ${baseId} existe deja dans le catalogue.` },
      { status: 409 },
    );
  }

  try {
    const db = getDb();
    const [existing] = await db
      .select({ cardId: customCards.cardId })
      .from(customCards)
      .where(eq(customCards.cardId, baseId))
      .limit(1);

    if (existing) {
      return NextResponse.json(
        { error: `L'identifiant ${baseId} est deja utilise.` },
        { status: 409 },
      );
    }

    await db.insert(customCards).values({
      cardId: baseId,
      serieId,
      name,
      number,
      rarity,
      priceCents,
      stock,
      image,
    });

    revalidateCustomCardsCache();
    revalidatePublicStockCache();

    return NextResponse.json({ ok: true, cardId: baseId });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Erreur base de donnees.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
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

  const cardId = body.cardId?.trim();
  if (!cardId) {
    return NextResponse.json({ error: "Carte manquante." }, { status: 400 });
  }

  try {
    const db = getDb();
    const [existing] = await db
      .select({ image: customCards.image })
      .from(customCards)
      .where(eq(customCards.cardId, cardId))
      .limit(1);

    if (!existing) {
      return NextResponse.json(
        { error: "Cette carte n'a pas ete creee depuis l'admin." },
        { status: 404 },
      );
    }

    await db.delete(customCards).where(eq(customCards.cardId, cardId));

    revalidateCustomCardsCache();
    revalidatePublicStockCache();

    await deleteManagedPhoto(existing.image);

    return NextResponse.json({ ok: true });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Erreur base de donnees.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
