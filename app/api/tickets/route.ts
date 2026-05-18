import { NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { getDb } from "@/lib/db/client";
import { tickets } from "@/lib/db/schema";
import { sendToAdmin, ticketAdminEmail } from "@/lib/mail";

type Body = {
  subject?: string;
  email?: string;
  name?: string;
  phone?: string;
  message?: string;
  // Honeypot anti-spam : doit rester vide
  website?: string;
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
    return NextResponse.json({ error: "Requête invalide." }, { status: 400 });
  }

  // Honeypot : si rempli, on simule un succes mais on ignore
  if (typeof body.website === "string" && body.website.trim() !== "") {
    return NextResponse.json({ ok: true });
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
    // Email a l'admin (best-effort, n'echoue pas la requete si KO)
    try {
      const { text, html } = ticketAdminEmail({
        id,
        subject,
        email,
        name,
        phone,
        message,
      });
      await sendToAdmin({
        subject: `[Ticket PokeDel] ${subject}`,
        text,
        html,
        replyTo: email,
      });
    } catch {
      // ignore
    }
    return NextResponse.json({ ok: true, id });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Erreur base de données.";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
