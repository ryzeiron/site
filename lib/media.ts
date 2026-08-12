import "server-only";

import { del } from "@vercel/blob";
import { deleteFromR2, isR2Url, keyFromR2Url } from "@/lib/r2";

// Les photos de cartes ont vecu sur Vercel Blob avant de passer sur R2. Les deux
// coexistent donc durablement : la suppression doit router selon l'URL, sinon on
// laisse des fichiers orphelins sur l'ancien service.

// Prefixes des fichiers que nous avons nous-memes deposes : on ne supprime
// jamais une URL qui ne vient pas de l'admin.
const MANAGED_PREFIXES = ["/card-photos/", "/sleeve-photos/"];

function isManagedBlobUrl(value: string | null | undefined): value is string {
  return (
    typeof value === "string" &&
    value.includes(".blob.vercel-storage.com/") &&
    MANAGED_PREFIXES.some((prefix) => value.includes(prefix))
  );
}

export function isManagedPhotoUrl(
  value: string | null | undefined,
): value is string {
  return isManagedBlobUrl(value) || isR2Url(value);
}

export async function deleteManagedPhoto(value: string | null | undefined) {
  if (typeof value !== "string") return;

  try {
    if (isR2Url(value)) {
      const key = keyFromR2Url(value);
      if (key) await deleteFromR2(key);
      return;
    }

    if (isManagedBlobUrl(value)) {
      await del(value);
    }
  } catch {
    // La photo peut deja avoir ete supprimee, ou le service etre indisponible :
    // ce nettoyage ne doit jamais faire echouer l'enregistrement de la carte.
  }
}
