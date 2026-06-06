import { NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { auth } from "@/lib/auth";
import {
  getCard,
  isValidVariantKey,
  resolveVariant,
  type Card,
} from "@/lib/catalog";
import { getDb } from "@/lib/db/client";
import { favoriteCards } from "@/lib/db/schema";
import { discordAdminUrl, sendDiscordNotification } from "@/lib/discord";
import { applyStockOverrides } from "@/lib/stock";

type Body = {
  cardId?: string;
  variant?: string;
};

function variantExists(card: Card, variant: string) {
  if (variant === "base") return true;
  if (variant === "alt") return !!card.altVariant;
  return (
    isValidVariantKey(variant) &&
    !!card.extraVariants?.some((extra) => extra.key === variant)
  );
}

async function getSessionUser() {
  const session = await auth();
  return session?.user ?? null;
}

export async function GET(request: Request) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ favorite: false, authenticated: false });
  }

  const url = new URL(request.url);
  const cardId = url.searchParams.get("cardId");
  const variant = url.searchParams.get("variant") ?? "base";

  if (!cardId) {
    const rows = await getDb()
      .select({
        cardId: favoriteCards.cardId,
        variant: favoriteCards.variant,
      })
      .from(favoriteCards)
      .where(eq(favoriteCards.userId, user.id));

    return NextResponse.json({ authenticated: true, favorites: rows });
  }

  const rows = await getDb()
    .select({ cardId: favoriteCards.cardId })
    .from(favoriteCards)
    .where(
      and(
        eq(favoriteCards.userId, user.id),
        eq(favoriteCards.cardId, cardId),
        eq(favoriteCards.variant, variant),
      ),
    )
    .limit(1);

  return NextResponse.json({
    authenticated: true,
    favorite: rows.length > 0,
  });
}

export async function POST(request: Request) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json(
      { error: "Connecte-toi pour ajouter cette carte à tes favoris." },
      { status: 401 },
    );
  }

  let body: Body;
  try {
    body = (await request.json()) as Body;
  } catch {
    return NextResponse.json({ error: "Requête invalide." }, { status: 400 });
  }

  const cardId = body.cardId?.trim();
  const variant = body.variant?.trim() || "base";

  if (!cardId) {
    return NextResponse.json({ error: "Carte introuvable." }, { status: 400 });
  }

  const rawCard = getCard(cardId);
  if (!rawCard) {
    return NextResponse.json({ error: "Carte introuvable." }, { status: 404 });
  }

  let card = rawCard;
  try {
    const [liveCard] = await applyStockOverrides([rawCard]);
    if (liveCard) card = liveCard;
  } catch {
    return NextResponse.json(
      { error: "Impossible de vérifier cette carte pour le moment." },
      { status: 500 },
    );
  }

  if (!variantExists(card, variant)) {
    return NextResponse.json(
      { error: "Variante introuvable." },
      { status: 404 },
    );
  }

  const db = getDb();
  const inserted = await db
    .insert(favoriteCards)
    .values({
      userId: user.id,
      cardId,
      variant,
    })
    .onConflictDoNothing()
    .returning({ userId: favoriteCards.userId });

  if (inserted.length > 0) {
    const favoriteRows = await db
      .select({ userId: favoriteCards.userId })
      .from(favoriteCards)
      .where(
        and(
          eq(favoriteCards.cardId, cardId),
          eq(favoriteCards.variant, variant),
        ),
      );
    const resolvedVariant = resolveVariant(card, variant);

    await sendDiscordNotification("favorites", {
      title: "Carte ajoutee aux favoris",
      description: `[Ouvrir les favoris admin](${discordAdminUrl("/admin/favoris?type=cartes")})`,
      fields: [
        { name: "Carte", value: `${card.name} ${card.number}`, inline: true },
        { name: "Variante", value: resolvedVariant.rarity, inline: true },
        { name: "Client", value: user.email ?? user.id, inline: false },
        {
          name: "Total favoris",
          value: String(favoriteRows.length),
          inline: true,
        },
        {
          name: "Fiche",
          value: `${discordAdminUrl(`/carte/${card.id}`)}`,
          inline: false,
        },
      ],
    }).catch(() => false);
  }

  return NextResponse.json({ ok: true, favorite: true });
}

export async function DELETE(request: Request) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json(
      { error: "Connecte-toi pour modifier tes favoris." },
      { status: 401 },
    );
  }

  let body: Body;
  try {
    body = (await request.json()) as Body;
  } catch {
    return NextResponse.json({ error: "Requête invalide." }, { status: 400 });
  }

  const cardId = body.cardId?.trim();
  const variant = body.variant?.trim() || "base";

  if (!cardId) {
    return NextResponse.json({ error: "Carte introuvable." }, { status: 400 });
  }

  await getDb()
    .delete(favoriteCards)
    .where(
      and(
        eq(favoriteCards.userId, user.id),
        eq(favoriteCards.cardId, cardId),
        eq(favoriteCards.variant, variant),
      ),
    );

  return NextResponse.json({ ok: true, favorite: false });
}
