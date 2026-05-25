// Telecharge les images FR des cartes HeartGold SoulSilver.
// Les images sont recuperees uniquement depuis les assets FR de TCGdex.
// Si aucune image FR n'est disponible, la carte est signalee en erreur.
//
// Usage : node scripts/download-hgss-images.mjs
// Reforcer : node scripts/download-hgss-images.mjs --force

import {
  existsSync,
  mkdirSync,
  readFileSync,
  writeFileSync,
} from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { Buffer } from "node:buffer";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "..");
const CATALOG_FILE = resolve(
  ROOT,
  "lib/catalog/cards/heartgold-soulsilver.ts",
);

const FORCE = process.argv.includes("--force");
const CONCURRENCY = 5;

const SETS = {
  prhgss: "hgssp",
  HGSS01: "hgss1",
  HGSS02: "hgss2",
  HGSS03: "hgss3",
  HGSS04: "hgss4",
};

const SECRET_LOCAL_IDS = {
  one: "ONE",
  deux: "TWO",
  trois: "THREE",
  quatre: "FOUR",
};

const ALLOWED_SOURCE_PREFIX = "https://assets.tcgdex.net/fr/hgss/";
const REPORT_FILE = resolve(ROOT, "verification-images-fr", "hgss-errors.txt");

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
    const localId = fileName.replace(/\.(webp|png|jpg)$/i, "");

    cards.push({ id, serieId, tcgdexSet, name, number, image, localId });
  }

  return cards;
}

function sourceLocalId(card) {
  if (card.serieId === "prhgss") {
    return card.number;
  }

  return SECRET_LOCAL_IDS[card.localId] ?? card.localId;
}

function getFrenchImageCandidates(card) {
  const cardLocalId = sourceLocalId(card);
  const baseUrl = `https://assets.tcgdex.net/fr/hgss/${card.tcgdexSet}/${cardLocalId}`;

  return [
    `${baseUrl}/high.webp`,
    `${baseUrl}/high.png`,
    `${baseUrl}/low.webp`,
    `${baseUrl}/low.png`,
  ];
}

async function downloadImage(card, destPath) {
  if (!FORCE && existsSync(destPath)) return "skipped";

  const errors = [];

  for (const url of getFrenchImageCandidates(card)) {
    if (!url.startsWith(ALLOWED_SOURCE_PREFIX)) {
      throw new Error(`Source non francaise refusee: ${url}`);
    }

    try {
      const res = await fetch(url);

      if (!res.ok) {
        errors.push(`${url} -> ${res.status}`);
        continue;
      }

      const contentType = res.headers.get("content-type") ?? "";

      if (!contentType.startsWith("image/")) {
        errors.push(`${url} -> contenu non image (${contentType || "vide"})`);
        continue;
      }

      const buffer = Buffer.from(await res.arrayBuffer());

      if (buffer.length === 0) {
        errors.push(`${url} -> fichier vide`);
        continue;
      }

      mkdirSync(dirname(destPath), { recursive: true });
      writeFileSync(destPath, buffer);

      return "downloaded";
    } catch (error) {
      errors.push(`${url} -> ${error.message}`);
    }
  }

  const allNetworkErrors = errors.every((error) => error.includes("fetch failed"));
  const reason = allNetworkErrors
    ? "Connexion impossible vers la source FR"
    : "Image FR introuvable";

  throw new Error(`${reason} (${errors.join(" | ")})`);
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

  console.log(`${cards.length} images HGSS a verifier`);

  let downloaded = 0;
  let skipped = 0;
  let failed = 0;
  const errors = [];

  await runPool(
    cards,
    async (card) => {
      const dest = resolve(ROOT, "public", card.image.replace(/^\//, ""));

      try {
        const result = await downloadImage(card, dest);

        if (result === "downloaded") {
          downloaded++;
          console.log(
            `[OK] ${card.serieId} ${sourceLocalId(card)} - ${card.name}`,
          );
        } else {
          skipped++;
        }
      } catch (error) {
        failed++;
        errors.push(
          `${card.serieId} ${sourceLocalId(card)} - ${card.name}: ${error.message}`,
        );
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

  mkdirSync(dirname(REPORT_FILE), { recursive: true });
  writeFileSync(
    REPORT_FILE,
    errors.length > 0
      ? `${errors.join("\n")}\n`
      : "Aucune erreur HGSS. Toutes les images traitees viennent de la source FR TCGdex.\n",
  );

  console.log(`Rapport: ${REPORT_FILE}`);

  if (failed > 0) {
    process.exitCode = 1;
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
