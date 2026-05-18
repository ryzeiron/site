import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { eq } from "drizzle-orm";
import { getDb } from "@/lib/db/client";
import { passwordResets, users } from "@/lib/db/schema";

export async function POST(request: Request) {
  let body: { token?: string; password?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Requête invalide." }, { status: 400 });
  }

  const token = String(body.token ?? "").trim();
  const password = String(body.password ?? "");

  if (!token) {
    return NextResponse.json({ error: "Token manquant." }, { status: 400 });
  }
  if (password.length < 8) {
    return NextResponse.json(
      { error: "Le mot de passe doit faire au moins 8 caracteres." },
      { status: 400 },
    );
  }

  const db = getDb();
  const rows = await db
    .select({
      token: passwordResets.token,
      userId: passwordResets.userId,
      expiresAt: passwordResets.expiresAt,
    })
    .from(passwordResets)
    .where(eq(passwordResets.token, token))
    .limit(1);

  const reset = rows[0];
  if (!reset) {
    return NextResponse.json(
      { error: "Lien invalide ou déjà utilisé." },
      { status: 400 },
    );
  }

  if (new Date(reset.expiresAt) < new Date()) {
    await db.delete(passwordResets).where(eq(passwordResets.token, token));
    return NextResponse.json({ error: "Lien expire." }, { status: 400 });
  }

  const passwordHash = await bcrypt.hash(password, 10);
  await db
    .update(users)
    .set({ passwordHash })
    .where(eq(users.id, reset.userId));

  await db.delete(passwordResets).where(eq(passwordResets.token, token));

  return NextResponse.json({ ok: true });
}
