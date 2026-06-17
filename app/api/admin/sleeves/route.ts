import { NextResponse } from "next/server";
import { del } from "@vercel/blob";
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
  image?: string | null;
};

type ExistingSleeveOverride = {
  sleeveId: string;
  priceCents: number;
  stock: number;
  active: boolean;
  image: string | null;
};

class AdminSleeveError extends Error {
  status: number;

  constructor(message: string, status = 400) {
    super(message);
    this.status = status;
  }
}

const LOW_STOCK_ALERT_THRESHOLD = Math.max(
  0,
  Number.parseInt(process.env.LOW_STOCK_ALERT_THRESHOLD ?? "1", 10) || 1,
);

function cleanImageUrl(value: unknown): string | null | undefined {
  if (value === undefined) return undefined;
  if (value === null) return null;
  if (typeof value !== "string") {
    throw new AdminSleeveError("Image invalide.");
  }

  const trimmed = value.trim();
  if (trimmed === "") return null;
  if (trimmed.startsWith("data:")) {
    throw new AdminSleeveError("Image invalide.");
  }

  return trimmed;
}

function isManagedBlobUrl(value: string | null | undefined): value is string {
  return (
    typeof value === "string" &&
    value.includes(".blob.vercel-storage.com/") &&
    value.includes("/sleeve-photos/")
  );
}

async function deleteManagedBlobUrl(value: string | null | undefined) {
  if (!isManagedBlobUrl(value)) return;

  try {
    await del(value);
  } catch {
    // La photo peut deja avoir ete supprimee depuis Vercel Blob.
  }
}

async function getExistingOverride(id: string, includeImage: boolean) {
  const baseSelect = {
    sleeveId: sleeveOverrides.sleeveId,
    priceCents: sleeveOverrides.priceCents,
    stock: sleeveOverrides.stock,
    active: sleeveOverrides.active,
  };

  try {
    if (includeImage) {
      const [row] = await getDb()
        .select({ ...baseSelect, image: sleeveOverrides.image })
        .from(sleeveOverrides)
        .where(eq(sleeveOverrides.sleeveId, id))
        .limit(1);
      return row as ExistingSleeveOverride | undefined;
    }

    const [row] = await getDb()
      .select(baseSelect)
      .from(sleeveOverrides)
      .where(eq(sleeveOverrides.sleeveId, id))
      .limit(1);

    return row ? ({ ...row, image: null } as ExistingSleeveOverride) : undefined;
  } catch {
    if (includeImage) {
      throw new AdminSleeveError(
        "Colonne photo sleeve manquante dans la base. Ajoute le SQL fourni.",
        500,
      );
    }

    return undefined;
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

  const id = body.id?.trim();
  const catalogSleeve = id ? getCatalogSleeve(id) : null;

  if (!id || !catalogSleeve) {
    return NextResponse.json(
      { error: "Sleeve introuvable dans le catalogue." },
      { status: 404 },
    );
  }

  let imageInput: string | null | undefined;
  try {
    imageInput = cleanImageUrl(body.image);
  } catch (e) {
    const message = e instanceof Error ? e.message : "Image invalide.";
    return NextResponse.json({ error: message }, { status: 400 });
  }

  const hasPrice = typeof body.price !== "undefined";
  const hasStock = typeof body.stock !== "undefined";
  const hasActive = typeof body.active !== "undefined";
  const hasImage = typeof imageInput !== "undefined";

  if (!hasPrice && !hasStock && !hasActive && !hasImage) {
    return NextResponse.json(
      { error: "Aucune modification." },
      { status: 400 },
    );
  }

  if (
    hasPrice &&
    (typeof body.price !== "number" || !Number.isFinite(body.price) || body.price < 0)
  ) {
    return NextResponse.json({ error: "Prix invalide." }, { status: 400 });
  }

  if (
    hasStock &&
    (typeof body.stock !== "number" || !Number.isInteger(body.stock) || body.stock < 0)
  ) {
    return NextResponse.json({ error: "Stock invalide." }, { status: 400 });
  }

  if (hasActive && typeof body.active !== "boolean") {
    return NextResponse.json({ error: "Visibilite invalide." }, { status: 400 });
  }

  try {
    const existing = await getExistingOverride(id, hasImage);
    const previousImage = existing?.image ?? null;
    const priceCents = hasPrice
      ? Math.round(Number(body.price) * 100)
      : existing?.priceCents ?? catalogSleeve.defaultPriceCents;
    const stock = hasStock
      ? Number(body.stock)
      : existing?.stock ?? catalogSleeve.defaultStock;
    const active = hasActive
      ? Boolean(body.active)
      : existing?.active ?? catalogSleeve.active ?? true;
    const nextImage = imageInput ?? null;
    const now = new Date();

    await getDb()
      .insert(sleeveOverrides)
      .values({
        sleeveId: id,
        priceCents,
        stock,
        active,
        ...(hasImage ? { image: nextImage } : {}),
        updatedAt: now,
      })
      .onConflictDoUpdate({
        target: sleeveOverrides.sleeveId,
        set: {
          priceCents,
          stock,
          active,
          ...(hasImage ? { image: nextImage } : {}),
          updatedAt: now,
        },
      });

    revalidatePublicSleeveCache();

    if (hasImage && nextImage !== previousImage) {
      await deleteManagedBlobUrl(previousImage);
    }

    if (hasStock && stock <= LOW_STOCK_ALERT_THRESHOLD) {
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
    const status = e instanceof AdminSleeveError ? e.status : 500;
    const message = e instanceof Error ? e.message : "Erreur base de donnees.";
    return NextResponse.json({ error: message }, { status });
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

  const id = body.id?.trim();
  if (!id) {
    return NextResponse.json({ error: "Sleeve invalide." }, { status: 400 });
  }

  try {
    const existing = await getExistingOverride(id, true).catch(() => undefined);

    await getDb()
      .delete(sleeveOverrides)
      .where(eq(sleeveOverrides.sleeveId, id));
    revalidatePublicSleeveCache();

    await deleteManagedBlobUrl(existing?.image);

    return NextResponse.json({ ok: true });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Erreur base de donnees.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
