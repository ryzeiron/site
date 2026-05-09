import { NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { getDb } from "@/lib/db/client";
import { tickets } from "@/lib/db/schema";

type Body = {
  subject?: string;
  email?: string;
  name?: string;
  phone?: string;
  message?: string;
};

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function clean(v: unknown, max: number): string | null {
  if (typeof v !== "string") return null;
  const t = v.trim();
  if (!t) return null;
  return t.slice(0, max);
}

export async function POST(request: Request) {
  let body: Body;
  try {
    body = (await request.json()) as Body;
  } catch {
    return NextResponse.json({ error: "Requete invalide." }, { status: 400 });
  }

  const subject = clean(body.subject, 200);
  const email = clean(body.email, 200);
  const message = clean(body.message, 5000);
  const name = clean(body.name, 200);
  const phone = clean(body.phone, 50);

  if (!subject || !email || !message) {
    return NextResponse.json(
      { error: "Sujet, email et message sont obligatoires." },
      { status: 400 },
    );
  }
  if (!EMAIL_RE.test(email)) {
    return NextResponse.json({ error: "Email invalide." }, { status: 400 });
  }

  try {
    const db = getDb();
    const id = randomUUID();
    await db.insert(tickets).values({
      id,
      subject,
      email,
      name,
      phone,
      message,
    });
    return NextResponse.json({ ok: true, id });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Erreur base de donnees.";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
