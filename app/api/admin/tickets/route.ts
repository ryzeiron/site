import { NextResponse } from "next/server";
import { desc, eq } from "drizzle-orm";
import { isAdmin } from "@/lib/admin/auth";
import { getDb } from "@/lib/db/client";
import { tickets } from "@/lib/db/schema";

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
    const msg = e instanceof Error ? e.message : "Erreur base de donnees.";
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
    return NextResponse.json({ error: "Requete invalide." }, { status: 400 });
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
    const msg = e instanceof Error ? e.message : "Erreur base de donnees.";
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
    return NextResponse.json({ error: "Requete invalide." }, { status: 400 });
  }
  if (!body.id) {
    return NextResponse.json({ error: "id requis." }, { status: 400 });
  }
  try {
    const db = getDb();
    await db.delete(tickets).where(eq(tickets.id, body.id));
    return NextResponse.json({ ok: true });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Erreur base de donnees.";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
