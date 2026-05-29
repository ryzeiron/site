import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { getDb } from "@/lib/db/client";
import { userDeliveryProfiles } from "@/lib/db/schema";
import {
  hasDeliveryProfileData,
  normalizeDeliveryProfileInput,
} from "@/lib/delivery-profile";

export async function GET() {
  const session = await auth();

  if (!session?.user?.id) {
    return NextResponse.json({ authenticated: false, profile: null });
  }

  try {
    const db = getDb();
    const rows = await db
      .select()
      .from(userDeliveryProfiles)
      .where(eq(userDeliveryProfiles.userId, session.user.id))
      .limit(1);

    return NextResponse.json({
      authenticated: true,
      profile: rows[0] ?? null,
    });
  } catch {
    return NextResponse.json({ authenticated: true, profile: null });
  }
}

export async function PUT(request: Request) {
  const session = await auth();

  if (!session?.user?.id) {
    return NextResponse.json(
      { error: "Connecte-toi pour enregistrer tes informations." },
      { status: 401 },
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Requete invalide." }, { status: 400 });
  }

  const profile = normalizeDeliveryProfileInput(
    typeof body === "object" && body !== null ? body : {},
  );

  try {
    const db = getDb();

    if (!hasDeliveryProfileData(profile)) {
      await db
        .delete(userDeliveryProfiles)
        .where(eq(userDeliveryProfiles.userId, session.user.id));

      return NextResponse.json({ ok: true, profile: null });
    }

    const updatedAt = new Date();

    const rows = await db
      .insert(userDeliveryProfiles)
      .values({
        userId: session.user.id,
        ...profile,
        updatedAt,
      })
      .onConflictDoUpdate({
        target: userDeliveryProfiles.userId,
        set: {
          ...profile,
          updatedAt,
        },
      })
      .returning();

    return NextResponse.json({ ok: true, profile: rows[0] ?? profile });
  } catch {
    return NextResponse.json(
      { error: "Impossible d'enregistrer les informations de livraison." },
      { status: 500 },
    );
  }
}
