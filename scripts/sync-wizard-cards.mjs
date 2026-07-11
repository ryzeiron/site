// Genere le bloc Wizard depuis TCGdex en francais et telecharge uniquement les images FR.
// Les cartes creees sont en Near Mint, 0.50 EUR, stock 0.
//
// Usage : node scripts/sync-wizard-cards.mjs
// Relancer sans retoucher les images deja presentes :
// node scripts/sync-wizard-cards.mjs --skip-existing
// Bloquer l'ecriture du catalogue s'il reste des images manquantes :
// node scripts/sync-wizard-cards.mjs --strict

import { Buffer } from "node:buffer";
import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "..");
const OUTPUT_FILE = resolve(ROOT, "lib/catalog/cards/wizard.ts");
const REPORT_FILE = resolve(ROOT, "verification-images-fr", "wizard-errors.txt");

const API_BASE = "https://api.tcgdex.net/v2/fr";
const IMAGE_BASE_PREFIX = "https://assets.tcgdex.net/fr/";
const FETCH_HEADERS = {
  "user-agent": "Pokedel62 catalog image sync (https://pokedel62.fr)",
  accept: "image/avif,image/webp,image/png,image/jpeg,*/*;q=0.8",
};
const SKIP_EXISTING = process.argv.includes("--skip-existing");
const STRICT = process.argv.includes("--strict");
const CONCURRENCY = 8;

const SET_IDS = [
  "base1",
  "base2",
  "basep",
  "base3",
  "base5",
  "neo1",
  "neo2",
  "neo3",
  "neo4",
  "ecard1",
  "ecard2",
];

const SERIES_CODES = new Map([
  ["base1", "W01"],
  ["base2", "W02"],
  ["basep", "W03"],
  ["base3", "W04"],
  ["base5", "W05"],
  ["neo1", "W06"],
  ["neo2", "W07"],
  ["neo3", "W08"],
  ["neo4", "W09"],
  ["ecard1", "W10"],
  ["ecard2", "W11"],
]);

const SERIES_IMAGE_FALLBACKS = new Map([
  ["base1", "/cartes/wizard/base1/4.webp"],
]);

async function fetchJson(url) {
  const response = await fetch(url, {
    headers: { accept: "application/json" },
  });

  if (!response.ok) {
    throw new Error(`${url} -> ${response.status}`);
  }

  return response.json();
}

function cleanName(value) {
  return String(value ?? "")
    .replace(/\s+/g, " ")
    .trim();
}

function safePathPart(value) {
  return String(value)
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9.-]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function compareLocalIds(a, b) {
  const aNum = Number(a.localId);
  const bNum = Number(b.localId);

  if (Number.isFinite(aNum) && Number.isFinite(bNum)) return aNum - bNum;
  return String(a.localId).localeCompare(String(b.localId), "fr", {
    numeric: true,
    sensitivity: "base",
  });
}

function yearFromSet(set) {
  const releaseYear = Number(String(set.releaseDate ?? "").slice(0, 4));
  return Number.isFinite(releaseYear) && releaseYear > 1900 ? releaseYear : 1999;
}

function formatLocalIdForId(localId, officialCount) {
  const local = String(localId);
  if (!/^\d+$/.test(local)) return safePathPart(local);

  const width = Math.max(3, String(officialCount ?? "").length, local.length);
  return local.padStart(width, "0");
}

function formatCardNumber(localId, officialCount) {
  const local = String(localId);
  if (!/^\d+$/.test(local)) return local;

  const official = Number(officialCount);
  if (!Number.isFinite(official)) return local.padStart(3, "0");

  const width = Math.max(3, String(official).length, local.length);
  return `${local.padStart(width, "0")}/${String(official).padStart(width, "0")}`;
}

function mapRarity(card, set) {
  const rarity = cleanName(card.rarity);
  const local = String(card.localId);
  const localNumber = Number(local);
  const official = Number(set.cardCount?.official);

  if (/^h\d+$/i.test(local)) return "Rare Holo";
  if (Number.isFinite(localNumber) && Number.isFinite(official) && localNumber > official) {
    return "Secrete";
  }
  if (/ultra/i.test(rarity)) return "Ultra Rare";
  if (/secr/i.test(rarity)) return "Secrete";
  if (/promo/i.test(rarity)) return "Promo";
  if (/holo/i.test(rarity)) return "Rare Holo";
  if (/peu commune/i.test(rarity)) return "Peu Commune";
  if (/rare/i.test(rarity)) return "Rare";
  if (/commune/i.test(rarity)) return "Commune";

  return "Commune";
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

async function downloadBinary(url, destPath) {
  if (SKIP_EXISTING && existsSync(destPath)) return "skipped";

  const response = await fetch(url, { headers: FETCH_HEADERS });
  if (!response.ok) throw new Error(`${url} -> ${response.status}`);

  const contentType = response.headers.get("content-type") ?? "";
  if (!contentType.startsWith("image/")) {
    throw new Error(`${url} -> contenu non image (${contentType || "vide"})`);
  }

  const buffer = Buffer.from(await response.arrayBuffer());
  if (buffer.length === 0) throw new Error(`${url} -> fichier vide`);

  mkdirSync(dirname(destPath), { recursive: true });
  writeFileSync(destPath, buffer);
  return "downloaded";
}

async function downloadCardImage(card, destPath) {
  if (!card.image) {
    throw new Error("aucune image FR declaree par TCGdex");
  }

  if (!card.image.startsWith(IMAGE_BASE_PREFIX)) {
    throw new Error(`source non francaise refusee: ${card.image}`);
  }

  return downloadBinary(`${card.image}/high.webp`, destPath);
}

async function downloadSeriesImage(set) {
  const source = set.logo ?? set.symbol;
  if (!source) return SERIES_IMAGE_FALLBACKS.get(set.id);

  const destPath = resolve(ROOT, "public/series/wizard", `${safePathPart(set.id)}.webp`);
  try {
    await downloadBinary(`${source}.webp`, destPath);
    return `/series/wizard/${safePathPart(set.id)}.webp`;
  } catch {
    return SERIES_IMAGE_FALLBACKS.get(set.id);
  }
}

function toCatalogCard(set, card) {
  const officialCount = set.cardCount?.official ?? set.cardCount?.total ?? set.cards?.length;
  const localIdForPath = safePathPart(card.localId);
  const localIdForId = formatLocalIdForId(card.localId, officialCount);
  const imagePath = `/cartes/wizard/${safePathPart(set.id)}/${localIdForPath}.webp`;

  return {
    id: `wizard-${safePathPart(set.id)}-${localIdForId}`,
    serieId: set.id,
    name: cleanName(card.name),
    number: formatCardNumber(card.localId, officialCount),
    rarity: mapRarity(card, set),
    condition: "Near Mint",
    language: "FR",
    price: 0.5,
    stock: 0,
    image: imagePath,
  };
}

function toCatalogSerie(set, image) {
  const serie = {
    id: set.id,
    blocId: "wizard",
    code: SERIES_CODES.get(set.id) ?? set.id.toUpperCase(),
    name: cleanName(set.name),
    releaseYear: yearFromSet(set),
  };

  return image ? { ...serie, image } : serie;
}

function removeMissingImages(cards) {
  return cards.map((card) => {
    if (!card.image) return card;

    const imagePath = resolve(ROOT, "public", card.image.replace(/^\//, ""));
    if (existsSync(imagePath)) return card;

    const { image, ...cardWithoutMissingImage } = card;
    return cardWithoutMissingImage;
  });
}

function serializeExport(name, value, typeName) {
  return `export const ${name} = ${JSON.stringify(value, null, 2)} satisfies ${typeName}[];\n`;
}

function writeCatalog(series, cards) {
  const source = [
    'import type { Card, Serie } from "../../catalog";',
    "",
    serializeExport("WIZARD_SERIES", series, "Serie"),
    serializeExport("WIZARD_CARDS", cards, "Card"),
  ].join("\n");

  writeFileSync(OUTPUT_FILE, source);
}

function writeReport(errors) {
  mkdirSync(dirname(REPORT_FILE), { recursive: true });
  writeFileSync(
    REPORT_FILE,
    errors.length > 0
      ? `${errors.join("\n")}\n`
      : "Aucune erreur Wizard. Toutes les images de cartes viennent de TCGdex FR.\n",
  );
}

async function main() {
  const fetchedSets = [];
  const errors = [];

  for (const setId of SET_IDS) {
    try {
      const set = await fetchJson(`${API_BASE}/sets/${setId}`);
      fetchedSets.push(set);
    } catch (error) {
      errors.push(`${setId}: ${error.message}`);
    }
  }

  fetchedSets.sort((a, b) => SET_IDS.indexOf(a.id) - SET_IDS.indexOf(b.id));

  const detailJobs = [];
  for (const set of fetchedSets) {
    for (const card of [...(set.cards ?? [])].sort(compareLocalIds)) {
      detailJobs.push({ set, card });
    }
  }

  const details = [];
  await runPool(
    detailJobs,
    async ({ set, card }) => {
      try {
        details.push({
          set,
          card: await fetchJson(`${API_BASE}/cards/${set.id}-${card.localId}`),
        });
      } catch (error) {
        errors.push(`${set.id} ${card.localId}: detail introuvable (${error.message})`);
      }
    },
    CONCURRENCY,
  );

  details.sort((a, b) => {
    const bySet = SET_IDS.indexOf(a.set.id) - SET_IDS.indexOf(b.set.id);
    if (bySet !== 0) return bySet;
    return compareLocalIds(a.card, b.card);
  });

  const cards = details.map(({ set, card }) => toCatalogCard(set, card));
  let downloaded = 0;
  let skipped = 0;

  await runPool(
    details,
    async ({ set, card }) => {
      const catalogCard = toCatalogCard(set, card);
      const dest = resolve(ROOT, "public", catalogCard.image.replace(/^\//, ""));

      try {
        const result = await downloadCardImage(card, dest);
        if (result === "skipped") skipped++;
        else downloaded++;
      } catch (error) {
        errors.push(`${catalogCard.serieId} ${catalogCard.number} - ${catalogCard.name}: ${error.message}`);
      }
    },
    CONCURRENCY,
  );

  const series = [];
  for (const set of fetchedSets) {
    series.push(toCatalogSerie(set, await downloadSeriesImage(set)));
  }

  writeReport(errors);

  console.log("");
  console.log("=== TOTAL Wizard ===");
  console.log(`Series: ${series.length}`);
  console.log(`Cartes: ${cards.length}`);
  console.log(`Images telechargees: ${downloaded}`);
  console.log(`Images deja presentes: ${skipped}`);
  console.log(`Erreurs: ${errors.length}`);
  console.log(`Rapport: ${REPORT_FILE}`);

  if (STRICT && errors.length > 0) {
    console.log("");
    console.log("Le catalogue Wizard n'a pas ete modifie car --strict est active et il reste des erreurs.");
    process.exitCode = 1;
    return;
  }

  writeCatalog(series, removeMissingImages(cards));
  console.log(`Catalogue ecrit: ${OUTPUT_FILE}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
