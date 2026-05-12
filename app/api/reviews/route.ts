import { randomUUID } from "crypto";
import { NextResponse } from "next/server";
import { eq, or } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { getDb } from "@/lib/db/client";
import { orders, reviews } from "@/lib/db/schema";

function cleanComment(value: unknown) {
  return String(value ?? "").trim().slice(0, 1200);
}

export async function POST(request: Request) {
  const session = await auth();

  if (!session?.user?.id || !session.user.email) {
    return NextResponse.json(
      { error: "Connecte-toi pour laisser un avis." },
      { status: 401 },
    );
  }

  const body = await request.json().catch(() => null);
  const rating = Number(body?.rating);
  const comment = cleanComment(body?.comment);

  if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
    return NextResponse.json(
      { error: "Choisis une note entre 1 et 5." },
      { status: 400 },
    );
  }

  if (comment.length < 10) {
    return NextResponse.json(
      { error: "Ton avis doit contenir au moins 10 caractères." },
      { status: 400 },
    );
  }

  const db = getDb();

  const purchased = await db
    .select({ id: orders.id })
    .from(orders)
    .where(
      or(
        eq(orders.userId, session.user.id),
        eq(orders.customerEmail, session.user.email),
      ),
    )
    .limit(1);

  if (purchased.length === 0) {
    return NextResponse.json(
      { error: "Seuls les clients ayant déjà commandé peuvent laisser un avis." },
      { status: 403 },
    );
  }

  const existing = await db
    .select({ id: reviews.id })
    .from(reviews)
    .where(eq(reviews.userId, session.user.id))
    .limit(1);

  if (existing[0]) {
    await db
      .update(reviews)
      .set({
        rating,
        comment,
        status: "approved",
        updatedAt: new Date(),
      })
      .where(eq(reviews.id, existing[0].id));

    return NextResponse.json({ ok: true });
  }

  await db.insert(reviews).values({
    id: randomUUID(),
    userId: session.user.id,
    rating,
    comment,
    status: "approved",
  });

  return NextResponse.json({ ok: true });
}
