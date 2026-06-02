// Genere le bloc McDo depuis TCGdex en francais et telecharge les images FR depuis Pokepedia.
// Les cartes creees sont toutes en Commune, Near Mint, 0.50 EUR, stock 0.
//
// Usage : node scripts/sync-mcdo-cards.mjs
// Relancer sans retoucher les images deja presentes :
// node scripts/sync-mcdo-cards.mjs --skip-existing
// Ecrire le catalogue meme si certaines images FR restent introuvables :
// node scripts/sync-mcdo-cards.mjs --skip-existing --write-partial

import { Buffer } from "node:buffer";
import {
  existsSync,
  mkdirSync,
  writeFileSync,
} from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "..");
const OUTPUT_FILE = resolve(ROOT, "lib/catalog/cards/mcdo.ts");
const REPORT_FILE = resolve(ROOT, "verification-images-fr", "mcdo-errors.txt");

const API_BASE = "https://api.tcgdex.net/v2/fr";
const POKEPEDIA_BASE = "https://www.pokepedia.fr";
const POKEPEDIA_IMAGE_PREFIX = `${POKEPEDIA_BASE}/images/`;
const POKEPEDIA_THUMB_PREFIX = `${POKEPEDIA_BASE}/images/thumb/`;
const FETCH_HEADERS = {
  "user-agent": "Pokedel62 catalog image sync (https://pokedel62.fr)",
  accept: "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/png,image/jpeg,*/*;q=0.8",
};
const SKIP_EXISTING = process.argv.includes("--skip-existing");
const WRITE_PARTIAL = process.argv.includes("--write-partial");
const CONCURRENCY = 6;

// Secours si l'endpoint de serie ne repond pas.
const FALLBACK_SET_IDS = [
  "2011bw",
  "2012bw",
  "2013bw",
  "2014xy",
  "2015xy",
  "2016xy",
  "2017sm",
  "2018sm-fr",
  "2019sm-fr",
  "2021swsh",
  "2022swsh",
  "2023sv",
  "2024sv",
];

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

function yearFromSet(set) {
  const releaseYear = Number(String(set.releaseDate ?? "").slice(0, 4));
  if (Number.isFinite(releaseYear) && releaseYear > 1900) return releaseYear;

  const idYear = Number(String(set.id ?? "").slice(0, 4));
  if (Number.isFinite(idYear) && idYear > 1900) return idYear;

  return 2024;
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

function formatCardNumber(localId, officialCount) {
  const local = String(localId);
  const official = Number(officialCount);

  if (!Number.isFinite(official) || !/^\d+$/.test(local)) return local;

  const width = String(official).length;
  return `${local.padStart(width, "0")}/${String(official).padStart(width, "0")}`;
}

function htmlDecode(value) {
  return String(value)
    .replace(/&amp;/g, "&")
    .replace(/&apos;/g, "'")
    .replace(/&#039;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">");
}

function decodeUrl(value) {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

function getPokepediaCollectionName(set) {
  const year = yearFromSet(set);

  if (year === 2018 || year === 2019) {
    return `Collection McDonald's ${year} (France)`;
  }

  return `Collection McDonald's ${year}`;
}

function getPokepediaLocalIds(localId) {
  const values = new Set();
  const raw = String(localId);
  const unpadded = raw.replace(/^0+(?=\d)/, "");
  const numeric = Number(raw);

  values.add(raw);
  values.add(unpadded);

  if (Number.isFinite(numeric)) {
    values.add(String(numeric));
    values.add(String(numeric).padStart(2, "0"));
    values.add(String(numeric).padStart(3, "0"));
  }

  return [...values].filter(Boolean);
}

function getPokepediaPageTitles(set, card) {
  const name = cleanName(card.name);
  const collection = getPokepediaCollectionName(set);

  return getPokepediaLocalIds(card.localId).map(
    (localId) => `${name} (${collection} ${localId})`,
  );
}

function pokepediaPageUrl(title) {
  return `${POKEPEDIA_BASE}/${encodeURIComponent(title).replace(/%20/g, "_")}`;
}

function normalizePokepediaImageUrl(url) {
  const value = htmlDecode(url);

  if (value.startsWith("//www.pokepedia.fr/")) {
    return `https:${value}`;
  }

  if (value.startsWith("/images/")) {
    return `${POKEPEDIA_BASE}${value}`;
  }

  return value;
}

function toOriginalImageUrl(url) {
  const normalizedUrl = normalizePokepediaImageUrl(url);

  if (!normalizedUrl.startsWith(POKEPEDIA_THUMB_PREFIX)) return normalizedUrl;

  const match = normalizedUrl.match(
    /^(https:\/\/www\.pokepedia\.fr\/images)\/thumb\/([^/]+\/[^/]+\/[^/]+\.(?:png|jpe?g|webp))(?:\/[^"'\s<>]+)?$/i,
  );

  return match ? `${match[1]}/${match[2]}` : normalizedUrl;
}

function extractPokepediaImageUrl(html) {
  const matches = [
    ...String(html).matchAll(/(?:(?:https?:)?\/\/www\.pokepedia\.fr)?\/images\/thumb\/[^"'\s<>]+/g),
  ];

  const candidates = matches.map((match) => normalizePokepediaImageUrl(match[0]));
  const cardImage =
    candidates.find((url) =>
      decodeUrl(url).replace(/\u2019/g, "'").includes("Carte_Collection_McDonald's"),
    ) ?? null;

  return cardImage ? toOriginalImageUrl(cardImage) : null;
}

async function getMcdoSetIds() {
  const ids = new Set(FALLBACK_SET_IDS);

  try {
    const serie = await fetchJson(`${API_BASE}/series/mc`);
    for (const set of serie.sets ?? []) {
      if (set?.id) ids.add(set.id);
    }
  } catch (error) {
    console.log(`[INFO] Liste de serie indisponible, utilisation du secours: ${error.message}`);
  }

  return [...ids];
}

async function downloadImage(set, card, destPath) {
  if (SKIP_EXISTING && existsSync(destPath)) return "skipped";

  const pageTitles = [...new Set(getPokepediaPageTitles(set, card))];
  const errors = [];

  if (pageTitles.length === 0) {
    throw new Error("Aucune page Pokepedia construite");
  }

  for (const pageTitle of pageTitles) {
    const pageUrl = pokepediaPageUrl(pageTitle);

    try {
      const pageResponse = await fetch(pageUrl, { headers: FETCH_HEADERS });
      if (!pageResponse.ok) {
        errors.push(`${pageUrl} -> ${pageResponse.status}`);
        continue;
      }

      const imageUrl = extractPokepediaImageUrl(await pageResponse.text());
      if (!imageUrl) {
        errors.push(`${pageUrl} -> aucune image de carte McDo trouvee`);
        continue;
      }

      if (!imageUrl.startsWith(POKEPEDIA_IMAGE_PREFIX)) {
        throw new Error(`Source non francaise refusee: ${imageUrl}`);
      }

      const imageResponse = await fetch(imageUrl, { headers: FETCH_HEADERS });
      if (!imageResponse.ok) {
        errors.push(`${imageUrl} -> ${imageResponse.status}`);
        continue;
      }

      const contentType = imageResponse.headers.get("content-type") ?? "";
      if (!contentType.startsWith("image/")) {
        errors.push(`${imageUrl} -> contenu non image (${contentType || "vide"})`);
        continue;
      }

      const buffer = Buffer.from(await imageResponse.arrayBuffer());
      if (buffer.length === 0) {
        errors.push(`${imageUrl} -> fichier vide`);
        continue;
      }

      mkdirSync(dirname(destPath), { recursive: true });
      writeFileSync(destPath, buffer);
      return "downloaded";
    } catch (error) {
      errors.push(`${pageUrl} -> ${error.message}`);
    }
  }

  throw new Error(`Image FR Pokepedia introuvable (${errors.join(" | ")})`);
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

function toCatalog(set, card) {
  const setId = safePathPart(set.id);
  const localId = safePathPart(card.localId);
  const officialCount = set.cardCount?.official ?? set.cards?.length;

  return {
    id: `mcdo-${setId}-${localId}`,
    serieId: set.id,
    name: cleanName(card.name),
    number: formatCardNumber(card.localId, officialCount),
    rarity: "Commune",
    condition: "Near Mint",
    language: "FR",
    price: 0.5,
    stock: 0,
    image: `/cartes/mcdo/${setId}/${localId}.png`,
  };
}

function toSerie(set) {
  const code =
    set.abbreviations?.fr ??
    set.abbreviations?.official ??
    set.id.toUpperCase();

  return {
    id: set.id,
    blocId: "mcdo",
    code,
    name: cleanName(set.name),
    releaseYear: yearFromSet(set),
  };
}

function serializeExport(name, value, typeName) {
  return `export const ${name} = ${JSON.stringify(value, null, 2)} satisfies ${typeName}[];\n`;
}

function writeCatalog(series, cards) {
  const source = [
    'import type { Card, Serie } from "../../catalog";',
    "",
    serializeExport("MCDO_SERIES", series, "Serie"),
    serializeExport("MCDO_CARDS", cards, "Card"),
  ].join("\n");

  writeFileSync(OUTPUT_FILE, source);
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

function writeReport(errors) {
  mkdirSync(dirname(REPORT_FILE), { recursive: true });
  writeFileSync(
    REPORT_FILE,
    errors.length > 0
      ? `${errors.join("\n")}\n`
      : "Aucune erreur McDo. Toutes les images traitees viennent de Pokepedia FR.\n",
  );
}

async function main() {
  const setIds = await getMcdoSetIds();
  const fetchedSets = [];
  const errors = [];

  for (const setId of setIds) {
    try {
      const set = await fetchJson(`${API_BASE}/sets/${setId}`);
      if (set.serie?.id && set.serie.id !== "mc") continue;
      if (!Array.isArray(set.cards) || set.cards.length === 0) {
        errors.push(`${setId}: aucune carte trouvee`);
        continue;
      }
      fetchedSets.push(set);
    } catch (error) {
      errors.push(`${setId}: ${error.message}`);
    }
  }

  fetchedSets.sort((a, b) => {
    const byYear = yearFromSet(a) - yearFromSet(b);
    if (byYear !== 0) return byYear;
    return String(a.id).localeCompare(String(b.id), "fr", { numeric: true });
  });

  const series = fetchedSets.map(toSerie);
  const cards = [];
  const imageJobs = [];

  for (const set of fetchedSets) {
    const sortedCards = [...set.cards].sort(compareLocalIds);

    for (const apiCard of sortedCards) {
      const catalogCard = toCatalog(set, apiCard);
      cards.push(catalogCard);
      imageJobs.push({ set, apiCard, catalogCard });
    }
  }

  let downloaded = 0;
  let skipped = 0;

  await runPool(
    imageJobs,
    async ({ set, apiCard, catalogCard }) => {
      const dest = resolve(ROOT, "public", catalogCard.image.replace(/^\//, ""));

      try {
        const result = await downloadImage(set, apiCard, dest);
        if (result === "skipped") {
          skipped++;
        } else {
          downloaded++;
          console.log(`[OK] ${catalogCard.serieId} ${catalogCard.number} - ${catalogCard.name}`);
        }
      } catch (error) {
        errors.push(`${catalogCard.serieId} ${catalogCard.number} - ${catalogCard.name}: ${error.message}`);
        console.log(`[ERREUR] ${catalogCard.serieId} ${catalogCard.number} - ${catalogCard.name}: ${error.message}`);
      }
    },
    CONCURRENCY,
  );

  writeReport(errors);

  console.log("");
  console.log("=== TOTAL McDo ===");
  console.log(`Series: ${series.length}`);
  console.log(`Cartes: ${cards.length}`);
  console.log(`Images telechargees: ${downloaded}`);
  console.log(`Images deja presentes: ${skipped}`);
  console.log(`Erreurs: ${errors.length}`);
  console.log(`Rapport: ${REPORT_FILE}`);

  if (errors.length > 0) {
    console.log("");
    if (WRITE_PARTIAL) {
      writeCatalog(series, removeMissingImages(cards));
      console.log(
        "Catalogue ecrit en mode partiel: les images manquantes restent vides, aucune image non FR n'est ajoutee.",
      );
      console.log(`Catalogue ecrit: ${OUTPUT_FILE}`);
    } else {
      console.log("Le catalogue McDo n'a pas ete modifie tant qu'il reste des erreurs.");
      console.log(
        "Pour utiliser les images FR trouvees malgre les erreurs: node scripts/sync-mcdo-cards.mjs --skip-existing --write-partial",
      );
    }
    process.exitCode = 1;
    return;
  }

  writeCatalog(series, cards);
  console.log(`Catalogue ecrit: ${OUTPUT_FILE}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
