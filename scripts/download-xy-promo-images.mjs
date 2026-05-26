// Telecharge les images FR des cartes Promo XY.
// Les images sont recuperees uniquement depuis les assets FR de TCGdex.
// Si aucune image FR n'est disponible, la carte est signalee en erreur.
//
// Usage : node scripts/download-xy-promo-images.mjs
// Ignorer les images deja presentes : node scripts/download-xy-promo-images.mjs --skip-existing

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
const CATALOG_FILE = resolve(ROOT, "lib/catalog/cards/xy.ts");

const SKIP_EXISTING = process.argv.includes("--skip-existing");
const CONCURRENCY = 5;
const TCGDEX_SERIE = "xy";
const TCGDEX_SET = "xyp";
const CATALOG_SERIE_ID = "prxy";
const ALLOWED_SOURCE_PREFIX = `https://assets.tcgdex.net/fr/${TCGDEX_SERIE}/${TCGDEX_SET}/`;
const REPORT_FILE = resolve(ROOT, "verification-images-fr", "xy-promo-errors.txt");

function readCardsFromCatalog() {
  const source = readFileSync(CATALOG_FILE, "utf8");
  const regex =
    /\{\s*id:\s*"([^"]+)"[\s\S]*?serieId:\s*"([^"]+)"[\s\S]*?name:\s*"([^"]+)"[\s\S]*?number:\s*"([^"]+)"[\s\S]*?image:\s*"([^"]+)"/g;

  const cards = [];

  for (const match of source.matchAll(regex)) {
    const [, id, serieId, name, number, image] = match;

    if (serieId !== CATALOG_SERIE_ID) continue;

    cards.push({ id, serieId, name, number, image });
  }

  return cards;
}

function getFrenchImageCandidates(card) {
  const baseUrl = `${ALLOWED_SOURCE_PREFIX}${card.number}`;

  return [
    `${baseUrl}/high.webp`,
    `${baseUrl}/low.webp`,
  ];
}

async function downloadImage(card, destPath) {
  if (SKIP_EXISTING && existsSync(destPath)) return "skipped";

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

  console.log(`${cards.length} images Promo XY a verifier`);

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
          console.log(`[OK] ${card.number} - ${card.name}`);
        } else {
          skipped++;
        }
      } catch (error) {
        failed++;
        errors.push(`${card.number} - ${card.name}: ${error.message}`);
        console.log(`[ERREUR] ${card.number} - ${card.name}: ${error.message}`);
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
      : "Aucune erreur Promo XY. Toutes les images traitees viennent de la source FR TCGdex.\n",
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
