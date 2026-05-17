// Telecharge les images FR des cartes Noir et Blanc.
// Dexocard fournit les scans FR en webp pour les series BW/NB.
//
// Usage : node scripts/download-nb-images.mjs
// Reforcer : node scripts/download-nb-images.mjs --force

import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { Buffer } from "node:buffer";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "..");
const CATALOG_FILE = resolve(ROOT, "lib/catalog/cards/noir-et-blanc.ts");

const FORCE = process.argv.includes("--force");
const CONCURRENCY = 6;

const SETS = {
  prbw: "bwp",
  nb01: "bw1",
  nb02: "bw2",
  nb03: "bw3",
  nb04: "bw4",
  nb05: "bw5",
  nb06: "bw6",
  nb07: "dv1",
  "nb07.5": "bw7",
  nb08: "bw8",
  nb09: "bw9",
  nb10: "bw10",
};

const imageUrlCache = new Map();

function readCardsFromCatalog() {
  const source = readFileSync(CATALOG_FILE, "utf8");
  const regex =
    /\{\s*id:\s*"([^"]+)"[\s\S]*?serieId:\s*"([^"]+)"[\s\S]*?name:\s*"([^"]+)"[\s\S]*?number:\s*"([^"]+)"[\s\S]*?image:\s*"([^"]+)"/g;

  const cards = [];

  for (const match of source.matchAll(regex)) {
    const [, id, serieId, name, number, image] = match;
    const dexocardSet = SETS[serieId];

    if (!dexocardSet) continue;

    const fileName = image.split("/").pop() ?? "";
    const localId = fileName.replace(/\.(webp|png)$/i, "");

    cards.push({ id, serieId, dexocardSet, name, number, image, localId });
  }

  return cards;
}

function sourceLocalId(card) {
  if (card.serieId !== "prbw") return card.localId;

  const promoNumber = card.number.match(/BW(\d+)/i)?.[1] ?? card.localId;
  const normalized =
    promoNumber.length >= 3 ? promoNumber : promoNumber.padStart(2, "0");

  return `BW${normalized}`;
}

async function imageExists(url) {
  if (imageUrlCache.has(url)) return imageUrlCache.get(url);

  const res = await fetch(url, { method: "HEAD" });
  const exists =
    res.ok && (res.headers.get("content-type") ?? "").startsWith("image/");

  imageUrlCache.set(url, exists);
  return exists;
}

async function findImageUrl(card) {
  const cardId = `${card.dexocardSet}-${sourceLocalId(card)}`;
  const urls = [
    `https://www.dexocard.com/card/${cardId}/w500.webp`,
    `https://www.dexocard.com/card/${cardId}/w400.webp`,
  ];

  for (const url of urls) {
    if (await imageExists(url)) return url;
  }

  throw new Error("Image FR introuvable");
}

async function downloadImage(url, destPath) {
  if (!FORCE && existsSync(destPath)) return "skipped";

  const res = await fetch(url);

  if (!res.ok) {
    throw new Error(`${res.status} ${res.statusText}`);
  }

  const buffer = Buffer.from(await res.arrayBuffer());

  if (buffer.length === 0) {
    throw new Error("Fichier vide");
  }

  mkdirSync(dirname(destPath), { recursive: true });
  writeFileSync(destPath, buffer);

  return "downloaded";
}

async function runPool(items, worker, concurrency) {
  let index = 0;

  async function next() {
    while (index < items.length) {
      const item = items[index];
      index++;
      await worker(item);
    }
  }

  await Promise.all(Array.from({ length: concurrency }, () => next()));
}

async function main() {
  const cards = readCardsFromCatalog();

  console.log(`${cards.length} images a verifier`);

  let downloaded = 0;
  let skipped = 0;
  let failed = 0;

  await runPool(
    cards,
    async (card) => {
      const dest = resolve(ROOT, "public", card.image.replace(/^\//, ""));

      try {
        const imageUrl = await findImageUrl(card);
        const result = await downloadImage(imageUrl, dest);

        if (result === "downloaded") {
          downloaded++;
          console.log(`[OK] ${card.serieId} ${sourceLocalId(card)} - ${card.name}`);
        } else {
          skipped++;
        }
      } catch (error) {
        failed++;
        console.log(
          `[ERREUR] ${card.serieId} ${sourceLocalId(card)} - ${card.name}: ${error.message}`,
        );
      }
    },
    CONCURRENCY,
  );

  console.log("");
  console.log("=== TOTAL ===");
  console.log(`Telechargees: ${downloaded}`);
  console.log(`Deja presentes: ${skipped}`);
  console.log(`Erreurs: ${failed}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
