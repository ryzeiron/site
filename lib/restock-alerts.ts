import "server-only";

import { and, eq } from "drizzle-orm";
import { getCard, resolveVariant, type VariantKey } from "@/lib/catalog";
import { getDb } from "@/lib/db/client";
import { favoriteCards, users } from "@/lib/db/schema";
import { sendRestockEmail } from "@/lib/email";
import { normalizeSiteUrl } from "@/lib/site-url";
import { applyStockOverrides } from "@/lib/stock";

type NotifyRestockSubscribersInput = {
  cardId: string;
  variant: VariantKey;
};

export async function notifyRestockSubscribers({
  cardId,
  variant,
}: NotifyRestockSubscribersInput) {
  const rawCard = getCard(cardId);
  if (!rawCard) return { sent: 0, failed: 0 };

  const db = getDb();
  const subscribers = await db
    .select({
      email: users.email,
      name: users.name,
    })
    .from(favoriteCards)
    .innerJoin(users, eq(favoriteCards.userId, users.id))
    .where(
      and(
        eq(favoriteCards.cardId, cardId),
        eq(favoriteCards.variant, variant),
      ),
    );

  if (subscribers.length === 0) {
    return { sent: 0, failed: 0 };
  }

  const [liveCard] = await applyStockOverrides([rawCard]);
  const card = liveCard ?? rawCard;
  const cardVariant = resolveVariant(card, variant);
  const siteUrl = normalizeSiteUrl(
    process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000",
  );
  const cardUrl = `${siteUrl}/carte/${card.id}`;
  const variantLabel =
    variant === "base" ? cardVariant.rarity : `${cardVariant.rarity} (${variant})`;

  let sent = 0;
  let failed = 0;

  for (const subscriber of subscribers) {
    try {
      await sendRestockEmail({
        to: subscriber.email,
        cardName: card.name,
        cardNumber: card.number,
        variantLabel,
        cardUrl,
      });
      sent += 1;
    } catch {
      failed += 1;
    }
  }

  return { sent, failed };
}
