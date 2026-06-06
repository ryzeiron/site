import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { isAdmin } from "@/lib/admin/auth";
import { getCatalogSleeve } from "@/lib/catalog/sleeves";
import { getDb } from "@/lib/db/client";
import { sleeveOverrides } from "@/lib/db/schema";
import { discordAdminUrl, sendDiscordNotification } from "@/lib/discord";
import { revalidatePublicSleeveCache } from "@/lib/sleeves";

type Body = {
  id?: string;
  price?: number;
  stock?: number;
  active?: boolean;
};

const LOW_STOCK_ALERT_THRESHOLD = Math.max(
  0,
  Number.parseInt(process.env.LOW_STOCK_ALERT_THRESHOLD ?? "1", 10) || 1,
);

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

  const id = body.id?.trim();
  const price = body.price;
  const stock = body.stock;

  const catalogSleeve = id ? getCatalogSleeve(id) : null;

  if (!id || !catalogSleeve) {
    return NextResponse.json(
      { error: "Sleeve introuvable dans le catalogue." },
      { status: 404 },
    );
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
      .insert(sleeveOverrides)
      .values({
        sleeveId: id,
        priceCents,
        stock,
        active: body.active ?? true,
        updatedAt: now,
      })
      .onConflictDoUpdate({
        target: sleeveOverrides.sleeveId,
        set: {
          priceCents,
          stock,
          active: body.active ?? true,
          updatedAt: now,
        },
      });

    revalidatePublicSleeveCache();

    if (stock <= LOW_STOCK_ALERT_THRESHOLD) {
      await sendDiscordNotification("stock", {
        title: "Stock faible sleeve",
        description: `[Ouvrir l'admin sleeves](${discordAdminUrl("/admin?sleeves=1")})`,
        fields: [
          { name: "Sleeve", value: catalogSleeve.name, inline: true },
          { name: "Stock", value: String(stock), inline: true },
        ],
      }).catch(() => false);
    }

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
    await getDb()
      .delete(sleeveOverrides)
      .where(eq(sleeveOverrides.sleeveId, id));
    revalidatePublicSleeveCache();

    return NextResponse.json({ ok: true });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Erreur base de données.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
