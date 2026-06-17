import { NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import { put } from "@vercel/blob";
import { isAdmin } from "@/lib/admin/auth";
import { getCard } from "@/lib/catalog";

const MAX_UPLOAD_BYTES = 8 * 1024 * 1024;

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

  const cardId = String(formData.get("cardId") ?? "").trim();
  const side = String(formData.get("side") ?? "").trim();
  const file = formData.get("file");
  const card = getCard(cardId);

  if (!card) {
    return NextResponse.json({ error: "Carte introuvable." }, { status: 404 });
  }

  if (side !== "front" && side !== "back") {
    return NextResponse.json({ error: "Face invalide." }, { status: 400 });
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
      { error: "Photo trop lourde. Reessaie avec une image plus legere." },
      { status: 400 },
    );
  }

  try {
    const ext = extensionFromType(file.type);
    const pathname = [
      "card-photos",
      cleanPart(card.serieId),
      cleanPart(card.id),
      `${side}-${Date.now()}-${randomUUID()}.${ext}`,
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
