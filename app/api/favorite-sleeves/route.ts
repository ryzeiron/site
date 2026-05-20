import { NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { getDb } from "@/lib/db/client";
import { favoriteSleeves } from "@/lib/db/schema";
import { getSleevesByIds } from "@/lib/sleeves";

type Body = {
  sleeveId?: string;
};

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
  const sleeveId = url.searchParams.get("sleeveId")?.trim();

  if (!sleeveId) {
    const rows = await getDb()
      .select({
        sleeveId: favoriteSleeves.sleeveId,
      })
      .from(favoriteSleeves)
      .where(eq(favoriteSleeves.userId, user.id));

    return NextResponse.json({ authenticated: true, favorites: rows });
  }

  const rows = await getDb()
    .select({ sleeveId: favoriteSleeves.sleeveId })
    .from(favoriteSleeves)
    .where(
      and(
        eq(favoriteSleeves.userId, user.id),
        eq(favoriteSleeves.sleeveId, sleeveId),
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
      { error: "Connecte-toi pour ajouter ce sleeve à tes favoris." },
      { status: 401 },
    );
  }

  let body: Body;
  try {
    body = (await request.json()) as Body;
  } catch {
    return NextResponse.json({ error: "Requête invalide." }, { status: 400 });
  }

  const sleeveId = body.sleeveId?.trim();
  if (!sleeveId) {
    return NextResponse.json({ error: "Sleeve introuvable." }, { status: 400 });
  }

  const [sleeve] = await getSleevesByIds([sleeveId]);
  if (!sleeve || !sleeve.active) {
    return NextResponse.json({ error: "Sleeve introuvable." }, { status: 404 });
  }

  await getDb()
    .insert(favoriteSleeves)
    .values({
      userId: user.id,
      sleeveId,
    })
    .onConflictDoNothing();

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

  const sleeveId = body.sleeveId?.trim();
  if (!sleeveId) {
    return NextResponse.json({ error: "Sleeve introuvable." }, { status: 400 });
  }

  await getDb()
    .delete(favoriteSleeves)
    .where(
      and(
        eq(favoriteSleeves.userId, user.id),
        eq(favoriteSleeves.sleeveId, sleeveId),
      ),
    );

  return NextResponse.json({ ok: true, favorite: false });
}
