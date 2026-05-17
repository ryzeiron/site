// Telecharge les images FR des cartes Diamant et Perle.
// Dexocard fournit les scans FR en webp pour les premieres series DP.
// JCC Pokemon.tf complete les scans FR des series DP03 a DP07 en png.
//
// Usage : node scripts/download-dp-images.mjs
// Reforcer : node scripts/download-dp-images.mjs --force

import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { Buffer } from "node:buffer";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "..");
const CATALOG_FILE = resolve(ROOT, "lib/catalog/cards/diamant-et-perle.ts");

const FORCE = process.argv.includes("--force");
const CONCURRENCY = 4;

const SETS = {
  "promo-dp": "dpp",
  dp01: "dp1",
  dp02: "dp2",
  dp03: "dp3",
  dp04: "dp4",
  dp05: "dp5",
  dp06: "dp6",
  dp07: "dp7",
};

const JCC_POKEMON_TF_SCAN_SETS = {
  dp03: "15",
  dp04: "14",
  dp05: "13",
  dp06: "12",
  dp07: "11",
};

const imageUrlCache = new Map();

function readCardsFromCatalog() {
  const source = readFileSync(CATALOG_FILE, "utf8");
  const regex =
    /\{\s*id:\s*"([^"]+)"[\s\S]*?serieId:\s*"([^"]+)"[\s\S]*?name:\s*"([^"]+)"[\s\S]*?number:\s*"([^"]+)"[\s\S]*?image:\s*"([^"]+)"/g;

  const cards = [];

  for (const match of source.matchAll(regex)) {
    const [, id, serieId, name, number, image] = match;
    const tcgdexSet = SETS[serieId];

    if (!tcgdexSet) continue;

    const fileName = image.split("/").pop() ?? "";
    const localId = fileName.replace(/\.(webp|png)$/i, "");

    cards.push({ id, serieId, tcgdexSet, name, number, image, localId });
  }

  return cards;
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
  const jccSetId = JCC_POKEMON_TF_SCAN_SETS[card.serieId];

  if (jccSetId) {
    return `https://www.jcc.pokemon.tf/Images/Scan/${jccSetId}/${card.localId}.png`;
  }

  const urls = [
    `https://www.dexocard.com/card/${card.tcgdexSet}-${card.localId}/w500.webp`,
    `https://www.dexocard.com/card/${card.tcgdexSet}-${card.localId}/w400.webp`,
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
          console.log(`[OK] ${card.serieId} ${card.localId} - ${card.name}`);
        } else {
          skipped++;
        }
      } catch (error) {
        failed++;
        console.log(
          `[ERREUR] ${card.serieId} ${card.localId} - ${card.name}: ${error.message}`,
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
