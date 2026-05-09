import { NextResponse } from "next/server";
import { randomBytes } from "crypto";
import { eq } from "drizzle-orm";
import { getDb } from "@/lib/db/client";
import { users, passwordResets } from "@/lib/db/schema";
import { sendMail, passwordResetEmail } from "@/lib/mail";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function POST(request: Request) {
  let body: { email?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Requete invalide." }, { status: 400 });
  }

  const email = String(body.email ?? "").trim().toLowerCase();
  if (!EMAIL_RE.test(email)) {
    return NextResponse.json({ error: "Email invalide." }, { status: 400 });
  }

  const db = getDb();
  const userRows = await db
    .select({ id: users.id, email: users.email })
    .from(users)
    .where(eq(users.email, email))
    .limit(1);

  // Toujours repondre OK pour ne pas leak l'existence d'un compte
  if (userRows.length === 0) {
    return NextResponse.json({ ok: true });
  }

  const user = userRows[0];
  const token = randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1h

  await db.insert(passwordResets).values({
    token,
    userId: user.id,
    expiresAt,
  });

  const origin =
    process.env.NEXT_PUBLIC_SITE_URL ??
    request.headers.get("origin") ??
    "http://localhost:3000";
  const resetUrl = `${origin}/reinitialiser-mot-de-passe?token=${token}`;

  const { text, html } = passwordResetEmail({ resetUrl, email: user.email });
  await sendMail({
    to: user.email,
    subject: "Reinitialisation de ton mot de passe PokeDel",
    text,
    html,
  });

  return NextResponse.json({ ok: true });
}
