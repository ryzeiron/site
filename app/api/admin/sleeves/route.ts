import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { isAdmin } from "@/lib/admin/auth";
import { deleteManagedPhoto } from "@/lib/media";
import { getCatalogSleeve } from "@/lib/catalog/sleeves";
import { getDb } from "@/lib/db/client";
import { sleeveOverrides } from "@/lib/db/schema";
import { discordAdminUrl, sendDiscordNotification } from "@/lib/discord";
import { revalidatePublicSleeveCache } from "@/lib/sleeves";

type Body = {
  id?: string;
  name?: string | null;
  description?: string | null;
  price?: number;
  stock?: number;
  active?: boolean;
  image?: string | null;
};

type ExistingSleeveOverride = {
  sleeveId: string;
  name: string | null;
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
      return row ? ({ ...row, name: null } as ExistingSleeveOverride) : undefined;
    }

    const [row] = await getDb()
      .select(baseSelect)
      .from(sleeveOverrides)
      .where(eq(sleeveOverrides.sleeveId, id))
      .limit(1);

    return row
      ? ({ ...row, image: null, name: null } as ExistingSleeveOverride)
      : undefined;
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
  // Un sleeve cree depuis l'admin n'est pas dans le catalogue : sa seule
  // existence est la ligne de surcharge, qui fait alors foi.
  const existingRow = id
    ? await getExistingOverride(id, true).catch(() => undefined)
    : undefined;

  if (!id || (!catalogSleeve && !existingRow)) {
    return NextResponse.json(
      { error: "Sleeve introuvable." },
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
  // Un nom vide remet le libelle du catalogue, il n'est pas rejete.
  const hasName = typeof body.name !== "undefined";
  const nameInput = hasName
    ? String(body.name ?? "").trim().slice(0, 120) || null
    : undefined;
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
      : existing?.priceCents ?? catalogSleeve?.defaultPriceCents ?? 0;
    const stock = hasStock
      ? Number(body.stock)
      : existing?.stock ?? catalogSleeve?.defaultStock ?? 0;
    const active = hasActive
      ? Boolean(body.active)
      : existing?.active ?? catalogSleeve?.active ?? true;
    const nextImage = imageInput ?? null;
    const now = new Date();

    await getDb()
      .insert(sleeveOverrides)
      .values({
        sleeveId: id,
        priceCents,
        stock,
        active,
        ...(hasName ? { name: nameInput } : {}),
        ...(hasImage ? { image: nextImage } : {}),
        updatedAt: now,
      })
      .onConflictDoUpdate({
        target: sleeveOverrides.sleeveId,
        set: {
          priceCents,
          stock,
          active,
          ...(hasName ? { name: nameInput } : {}),
          ...(hasImage ? { image: nextImage } : {}),
          updatedAt: now,
        },
      });

    revalidatePublicSleeveCache();

    if (hasImage && nextImage !== previousImage) {
      await deleteManagedPhoto(previousImage);
    }

    if (hasStock && stock <= LOW_STOCK_ALERT_THRESHOLD) {
      await sendDiscordNotification("stock", {
        title: "Stock faible sleeve",
        description: `[Ouvrir l'admin sleeves](${discordAdminUrl("/admin?sleeves=1")})`,
        fields: [
          {
            name: "Sleeve",
            value: nameInput || catalogSleeve?.name || id,
            inline: true,
          },
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

// Creation d'un sleeve depuis l'admin : il vit uniquement dans la base, sans
// contrepartie dans lib/catalog/sleeves.ts.
function slugifySleeveId(value: string): string {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
}

export async function PUT(request: Request) {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: "Non autorise." }, { status: 401 });
  }

  let body: Body;
  try {
    body = (await request.json()) as Body;
  } catch {
    return NextResponse.json({ error: "Requete invalide." }, { status: 400 });
  }

  const name = String(body.name ?? "").trim().slice(0, 120);
  if (!name) {
    return NextResponse.json(
      { error: "Le nom est obligatoire." },
      { status: 400 },
    );
  }

  const id = slugifySleeveId(body.id?.trim() || name);
  if (!id) {
    return NextResponse.json(
      { error: "Impossible de generer un identifiant depuis ce nom." },
      { status: 400 },
    );
  }

  if (getCatalogSleeve(id)) {
    return NextResponse.json(
      { error: `L'identifiant ${id} existe deja dans le catalogue.` },
      { status: 409 },
    );
  }

  const priceCents = Math.round(Number(body.price ?? 0) * 100);
  const stock = Math.trunc(Number(body.stock ?? 0));

  if (!Number.isFinite(priceCents) || priceCents < 0) {
    return NextResponse.json({ error: "Prix invalide." }, { status: 400 });
  }

  if (!Number.isInteger(stock) || stock < 0) {
    return NextResponse.json({ error: "Stock invalide." }, { status: 400 });
  }

  try {
    const existing = await getExistingOverride(id, true).catch(() => undefined);

    if (existing) {
      return NextResponse.json(
        { error: `L'identifiant ${id} est deja utilise.` },
        { status: 409 },
      );
    }

    const description = String(body.description ?? "").trim().slice(0, 500);

    await getDb().insert(sleeveOverrides).values({
      sleeveId: id,
      name,
      description: description || null,
      priceCents,
      stock,
      active: body.active !== false,
      updatedAt: new Date(),
    });

    revalidatePublicSleeveCache();

    return NextResponse.json({ ok: true, id });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Erreur base de donnees.";
    return NextResponse.json({ error: message }, { status: 500 });
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

    await deleteManagedPhoto(existing?.image);

    return NextResponse.json({ ok: true });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Erreur base de donnees.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
