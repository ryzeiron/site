import { NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { isAdmin } from "@/lib/admin/auth";
import { getDb } from "@/lib/db/client";
import { orderPreparationItems } from "@/lib/db/schema";

type Body = {
  orderId?: string;
  itemKey?: string;
  prepared?: boolean;
  items?: string[];
  mode?: "replace";
};

function cleanOrderId(value?: string | null) {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

function cleanItemKey(value?: string | null) {
  const trimmed = value?.trim();
  return trimmed && trimmed.length <= 240 ? trimmed : null;
}

function cleanItems(items: unknown) {
  if (!Array.isArray(items)) return [];
  return Array.from(
    new Set(
      items
        .map((item) => (typeof item === "string" ? cleanItemKey(item) : null))
        .filter((item): item is string => Boolean(item)),
    ),
  );
}

export async function GET(request: Request) {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: "Non autorise." }, { status: 401 });
  }

  const url = new URL(request.url);
  const orderId = cleanOrderId(url.searchParams.get("orderId"));

  if (!orderId) {
    return NextResponse.json({ error: "Commande invalide." }, { status: 400 });
  }

  try {
    const rows = await getDb()
      .select({ itemKey: orderPreparationItems.itemKey })
      .from(orderPreparationItems)
      .where(eq(orderPreparationItems.orderId, orderId));

    return NextResponse.json({ items: rows.map((row) => row.itemKey) });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Erreur inconnue.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: "Non autorise." }, { status: 401 });
  }

  let body: Body;
  try {
    body = (await request.json()) as Body;
  } catch {
    return NextResponse.json({ error: "Requete invalide." }, { status: 400 });
  }

  const orderId = cleanOrderId(body.orderId);
  if (!orderId) {
    return NextResponse.json({ error: "Commande invalide." }, { status: 400 });
  }

  try {
    const db = getDb();

    if (body.mode === "replace") {
      const items = cleanItems(body.items);

      await db
        .delete(orderPreparationItems)
        .where(eq(orderPreparationItems.orderId, orderId));

      if (items.length > 0) {
        await db
          .insert(orderPreparationItems)
          .values(items.map((itemKey) => ({ orderId, itemKey })))
          .onConflictDoNothing();
      }

      return NextResponse.json({ ok: true, items });
    }

    const itemKey = cleanItemKey(body.itemKey);
    if (!itemKey) {
      return NextResponse.json({ error: "Article invalide." }, { status: 400 });
    }

    if (body.prepared) {
      await db
        .insert(orderPreparationItems)
        .values({ orderId, itemKey })
        .onConflictDoNothing();
    } else {
      await db
        .delete(orderPreparationItems)
        .where(
          and(
            eq(orderPreparationItems.orderId, orderId),
            eq(orderPreparationItems.itemKey, itemKey),
          ),
        );
    }

    const rows = await db
      .select({ itemKey: orderPreparationItems.itemKey })
      .from(orderPreparationItems)
      .where(eq(orderPreparationItems.orderId, orderId));

    return NextResponse.json({ ok: true, items: rows.map((row) => row.itemKey) });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Erreur inconnue.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
