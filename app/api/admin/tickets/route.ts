import { NextResponse } from "next/server";
import { desc, eq } from "drizzle-orm";
import { isAdmin } from "@/lib/admin/auth";
import { getDb } from "@/lib/db/client";
import { tickets } from "@/lib/db/schema";
import { sendMail } from "@/lib/mail";

type PatchBody = {
  id?: string;
  status?: "open" | "in_progress" | "closed";
  adminResponse?: string | null;
};

export async function GET() {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: "Non autorise." }, { status: 401 });
  }
  try {
    const db = getDb();
    const rows = await db
      .select()
      .from(tickets)
      .orderBy(desc(tickets.createdAt));
    return NextResponse.json({ tickets: rows });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Erreur base de données.";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: "Non autorise." }, { status: 401 });
  }
  let body: PatchBody;
  try {
    body = (await request.json()) as PatchBody;
  } catch {
    return NextResponse.json({ error: "Requête invalide." }, { status: 400 });
  }
  if (!body.id) {
    return NextResponse.json({ error: "id requis." }, { status: 400 });
  }

  const set: Record<string, unknown> = { updatedAt: new Date() };
  if (
    body.status === "open" ||
    body.status === "in_progress" ||
    body.status === "closed"
  ) {
    set.status = body.status;
  }
  if (body.adminResponse !== undefined) {
    if (body.adminResponse === null) {
      set.adminResponse = null;
    } else if (typeof body.adminResponse === "string") {
      const t = body.adminResponse.trim();
      set.adminResponse = t === "" ? null : t.slice(0, 5000);
    }
  }

  try {
    const db = getDb();
    await db.update(tickets).set(set).where(eq(tickets.id, body.id));
    return NextResponse.json({ ok: true });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Erreur base de données.";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

// Envoie la reponse au client depuis l'adresse de la boutique, via Resend.
// Le message part de RESEND_FROM : les reponses du client reviennent donc dans
// la boite contact, pas dans une adresse personnelle.
export async function POST(request: Request) {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: "Non autorise." }, { status: 401 });
  }

  let body: { id?: string; message?: string };
  try {
    body = (await request.json()) as { id?: string; message?: string };
  } catch {
    return NextResponse.json({ error: "Requête invalide." }, { status: 400 });
  }

  const message = body.message?.trim() ?? "";

  if (!body.id) {
    return NextResponse.json({ error: "id requis." }, { status: 400 });
  }
  if (!message) {
    return NextResponse.json(
      { error: "La réponse est vide." },
      { status: 400 },
    );
  }

  try {
    const db = getDb();
    const [ticket] = await db
      .select()
      .from(tickets)
      .where(eq(tickets.id, body.id))
      .limit(1);

    if (!ticket) {
      return NextResponse.json({ error: "Ticket introuvable." }, { status: 404 });
    }

    const text = `${message}

---
Ta demande initiale :
${ticket.message}

---
PokeDel62 - https://www.pokedel62.fr
Reponds directement a cet email pour continuer la discussion.`;

    const sent = await sendMail({
      to: ticket.email,
      subject: `Re: ${ticket.subject}`,
      text,
    });

    if (!sent.ok) {
      return NextResponse.json(
        { error: sent.error ?? "Envoi impossible." },
        { status: 502 },
      );
    }

    // La reponse n'est enregistree qu'une fois l'envoi reussi, pour que le
    // ticket ne paraisse jamais traite alors que le client n'a rien recu.
    await db
      .update(tickets)
      .set({
        adminResponse: message.slice(0, 5000),
        status: "closed",
        updatedAt: new Date(),
      })
      .where(eq(tickets.id, body.id));

    return NextResponse.json({ ok: true, sentTo: ticket.email });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Erreur envoi.";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: "Non autorise." }, { status: 401 });
  }
  let body: { id?: string };
  try {
    body = (await request.json()) as { id?: string };
  } catch {
    return NextResponse.json({ error: "Requête invalide." }, { status: 400 });
  }
  if (!body.id) {
    return NextResponse.json({ error: "id requis." }, { status: 400 });
  }
  try {
    const db = getDb();
    await db.delete(tickets).where(eq(tickets.id, body.id));
    return NextResponse.json({ ok: true });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Erreur base de données.";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
