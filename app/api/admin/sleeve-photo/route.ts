import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { put } from "@vercel/blob";
import { isAdmin } from "@/lib/admin/auth";
import { getCatalogSleeve } from "@/lib/catalog/sleeves";

const MAX_UPLOAD_BYTES = 1024 * 1024;

function cleanPart(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9._-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

function extensionFromType(type: string) {
  if (type === "image/webp") return "webp";
  if (type === "image/png") return "png";
  if (type === "image/jpeg" || type === "image/jpg") return "jpg";
  return "webp";
}

export async function POST(request: Request) {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: "Non autorise." }, { status: 401 });
  }

  let formData: FormData;

  try {
    formData = await request.formData();
  } catch {
    return NextResponse.json({ error: "Requete invalide." }, { status: 400 });
  }

  const sleeveId = String(formData.get("sleeveId") ?? "").trim();
  const file = formData.get("file");
  const sleeve = getCatalogSleeve(sleeveId);

  if (!sleeve) {
    return NextResponse.json({ error: "Sleeve introuvable." }, { status: 404 });
  }

  if (!(file instanceof File)) {
    return NextResponse.json({ error: "Photo manquante." }, { status: 400 });
  }

  if (!file.type.startsWith("image/")) {
    return NextResponse.json(
      { error: "Le fichier doit etre une image." },
      { status: 400 },
    );
  }

  if (file.size > MAX_UPLOAD_BYTES) {
    return NextResponse.json(
      { error: "Photo trop lourde. Recadre-la puis reessaie." },
      { status: 400 },
    );
  }

  try {
    const ext = extensionFromType(file.type);
    const pathname = [
      "sleeve-photos",
      cleanPart(sleeve.id),
      `photo-${Date.now()}-${randomUUID()}.${ext}`,
    ].join("/");

    const blob = await put(pathname, file, {
      access: "public",
      contentType: file.type,
    });

    return NextResponse.json({ ok: true, url: blob.url });
  } catch (e) {
    const message =
      e instanceof Error ? e.message : "Erreur pendant l'envoi de la photo.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
