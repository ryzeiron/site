import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { isAdmin } from "@/lib/admin/auth";
import { getDb } from "@/lib/db/client";
import { sleeves } from "@/lib/db/schema";

type Body = {
  id?: string;
  name?: string;
  description?: string;
  image?: string;
  price?: number;
  stock?: number;
  active?: boolean;
};

function slugify(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 60);
}

function cleanOptional(value: string | undefined) {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

export async function POST(request: Request) {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: "Non autorisé." }, { status: 401 });
  }

  let body: Body;
  try {
    body = (await request.json()) as Body;
  } catch {
    return NextResponse.json({ error: "Requête invalide." }, { status: 400 });
  }

  const name = body.name?.trim();
  const id = (body.id?.trim() || (name ? slugify(name) : "")).trim();
  const price = body.price;
  const stock = body.stock;

  if (!id || !/^[a-z0-9-]{2,60}$/.test(id)) {
    return NextResponse.json({ error: "Identifiant sleeve invalide." }, { status: 400 });
  }

  if (!name) {
    return NextResponse.json({ error: "Nom obligatoire." }, { status: 400 });
  }

  if (typeof price !== "number" || !Number.isFinite(price) || price < 0) {
    return NextResponse.json({ error: "Prix invalide." }, { status: 400 });
  }

  if (typeof stock !== "number" || !Number.isInteger(stock) || stock < 0) {
    return NextResponse.json({ error: "Stock invalide." }, { status: 400 });
  }

  try {
    const priceCents = Math.round(price * 100);
    const now = new Date();

    await getDb()
      .insert(sleeves)
      .values({
        id,
        name,
        description: cleanOptional(body.description),
        image: cleanOptional(body.image),
        priceCents,
        stock,
        active: body.active ?? true,
        updatedAt: now,
      })
      .onConflictDoUpdate({
        target: sleeves.id,
        set: {
          name,
          description: cleanOptional(body.description),
          image: cleanOptional(body.image),
          priceCents,
          stock,
          active: body.active ?? true,
          updatedAt: now,
        },
      });

    return NextResponse.json({ ok: true, id });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Erreur base de données.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: "Non autorisé." }, { status: 401 });
  }

  let body: { id?: string };
  try {
    body = (await request.json()) as { id?: string };
  } catch {
    return NextResponse.json({ error: "Requête invalide." }, { status: 400 });
  }

  const id = body.id?.trim();
  if (!id) {
    return NextResponse.json({ error: "Sleeve invalide." }, { status: 400 });
  }

  try {
    await getDb().delete(sleeves).where(eq(sleeves.id, id));
    return NextResponse.json({ ok: true });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Erreur base de données.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
