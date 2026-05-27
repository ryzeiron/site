import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { isAdmin } from "@/lib/admin/auth";
import { getDb } from "@/lib/db/client";
import { reviews } from "@/lib/db/schema";
import { revalidatePublicReviewsCache } from "@/lib/public-reviews";

export async function DELETE(request: Request) {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: "Non autorisé." }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const reviewId = String(body?.reviewId ?? "");

  if (!reviewId) {
    return NextResponse.json({ error: "Avis introuvable." }, { status: 400 });
  }

  const db = getDb();
  await db.delete(reviews).where(eq(reviews.id, reviewId));
  revalidatePublicReviewsCache();

  return NextResponse.json({ ok: true });
}
