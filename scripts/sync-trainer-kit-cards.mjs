// Genere le bloc Trainer Kit depuis Pokepedia et telecharge uniquement les scans FR.
// Les cartes creees sont en Commune, Near Mint, 0.50 EUR, stock 0.
//
// Usage : node scripts/sync-trainer-kit-cards.mjs
// Relancer en forcant les images : node scripts/sync-trainer-kit-cards.mjs --force

import { Buffer } from "node:buffer";
import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { dirname, extname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "..");
const OUTPUT_FILE = resolve(ROOT, "lib/catalog/cards/trainer-kit.ts");
const REPORT_FILE = resolve(ROOT, "verification-images-fr", "trainer-kit-errors.txt");

const FORCE = process.argv.includes("--force");
const CONCURRENCY = 6;
const POKEPEDIA_API = "https://www.pokepedia.fr/api.php";
const POKEPEDIA_IMAGE_PREFIX = "https://www.pokepedia.fr/images/";
const FETCH_HEADERS = {
  "user-agent": "Pokedel62 Trainer Kit sync (https://pokedel62.fr)",
  accept: "application/json,image/avif,image/webp,image/png,image/jpeg,*/*;q=0.8",
};

const KITS = [
  {
    serieId: "trainer-kit-latios-latias-ex",
    pages: ["EX Kit Dresseur"],
  },
  {
    serieId: "trainer-kit-posipi-negapi",
    pages: ["EX Kit Dresseur 2"],
  },
  {
    serieId: "trainer-kit-lucario-manaphy",
    pages: ["Diamant & Perle Kit Dresseur"],
  },
  {
    serieId: "trainer-kit-leviator-raichu",
    pages: ["HS Kit du Dresseur"],
  },
  {
    serieId: "trainer-kit-minotaupe-zoroark",
    pages: ["Noir & Blanc Kit du Dresseur"],
  },
  {
    serieId: "trainer-kit-bruyverne-nymphali",
    pages: ["XY Kit du Dresseur"],
  },
  {
    serieId: "trainer-kit-scalproie-grodoudou",
    pages: ["XY Kit du Dresseur: Scalproie et Grodoudou"],
  },
  {
    serieId: "trainer-kit-latios-latias-xy",
    pages: ["XY Kit du Dresseur: Latias & Latios"],
  },
  {
    serieId: "trainer-kit-pikachu-catcheur-suicune",
    pages: ["XY Kit du Dresseur: Pikachu Catcheur et Suicune"],
  },
  {
    serieId: "trainer-kit-raichu-alola-lougaroc",
    pages: ["Soleil et Lune Kit du Dresseur: Lougaroc et Raichu d'Alola"],
  },
  {
    serieId: "trainer-kit-sablaireau-alola-feunard-alola",
    pages: ["Soleil et Lune Kit du Dresseur: Sablaireau d'Alola et Feunard d'Alola"],
  },
  {
    serieId: "trainer-kit-pikachu-evoli",
    deckPages: ["Let's Play, Pikachu", "Let's Play, Évoli"],
  },
];

async function fetchJson(url) {
  const response = await fetch(url, { headers: FETCH_HEADERS });

  if (!response.ok) {
    throw new Error(`${url} -> ${response.status}`);
  }

  return response.json();
}

function apiUrl(params) {
  const search = new URLSearchParams({
    format: "json",
    ...params,
  });

  return `${POKEPEDIA_API}?${search.toString()}`;
}

function cleanText(value) {
  return String(value ?? "")
    .replace(/<[^>]+>/g, "")
    .replace(/\{\{[^}]+\}\}/g, "")
    .replace(/\[\[Fichier:[^\]]+\]\]/gi, "")
    .replace(/\[\[([^|\]]+)\|([^\]]+)\]\]/g, "$2")
    .replace(/\[\[([^\]]+)\]\]/g, "$1")
    .replace(/&amp;/g, "&")
    .replace(/&#039;/g, "'")
    .replace(/&quot;/g, '"')
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

function escapeTs(value) {
  return JSON.stringify(value);
}

function normalizeFrenchCardName(name) {
  const fixes = new Map([
    ["Negapi", "Négapi"],
    ["Leo", "Léo"],
  ]);

  return fixes.get(name) ?? name;
}

function parseWikiLink(line) {
  const match = String(line).match(/\[\[([^|\]]+)(?:\|([^\]]+))?\]\]/);
  if (!match) return null;

  return {
    pageTitle: cleanText(match[1]),
    name: cleanText(match[2] ?? match[1].replace(/\s*\([^)]*\)\s*$/, "")),
  };
}

function parseNumberLine(line) {
  return cleanText(String(line).replace(/^\|\s*/, ""));
}

function parseDeckCaption(line, fallback) {
  const cleaned = cleanText(String(line).replace(/^\|\+\s*/, ""))
    .replace(/^Deck\s+/i, "")
    .trim();

  return cleaned || fallback;
}

async function getPageWikitext(title) {
  const data = await fetchJson(
    apiUrl({
      action: "parse",
      page: title,
      prop: "wikitext",
    }),
  );

  return data.parse?.wikitext?.["*"] ?? "";
}

function parseNumberedKitPage(wikitext, serieId) {
  const lines = String(wikitext).split(/\r?\n/);
  const cards = [];
  let deck = "";

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();

    if (line.startsWith("|+")) {
      deck = parseDeckCaption(line, deck);
      continue;
    }

    if (line !== "|-") continue;

    const numberLine = lines[i + 1]?.trim() ?? "";
    const cardLine = lines[i + 2]?.trim() ?? "";

    if (!numberLine.startsWith("|")) continue;
    if (!cardLine.includes("[[")) continue;

    const link = parseWikiLink(cardLine);
    if (!link) continue;

    cards.push({
      serieId,
      deck,
      sourceNumber: parseNumberLine(numberLine),
      pageTitle: link.pageTitle,
      name: link.name,
    });
  }

  return cards;
}

function parseDeckCompositionPage(wikitext, serieId, deckName) {
  const lines = String(wikitext).split(/\r?\n/);
  const cards = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (line !== "|-") continue;

    const cardLine = lines[i + 1]?.trim() ?? "";
    if (!cardLine.includes("[[")) continue;

    const link = parseWikiLink(cardLine);
    if (!link) continue;

    let quantity = 1;
    for (let j = i + 2; j <= i + 6 && j < lines.length; j++) {
      const maybeQuantity = cleanText(lines[j].replace(/^\|\s*/, ""));
      if (/^\d+$/.test(maybeQuantity)) {
        quantity = Number(maybeQuantity);
        break;
      }
    }

    cards.push({
      serieId,
      deck: deckName,
      sourceNumber: `${quantity} ex.`,
      pageTitle: link.pageTitle,
      name: link.name,
      description: `${deckName} - ${quantity} exemplaire${quantity > 1 ? "s" : ""} dans le produit.`,
    });
  }

  return cards;
}

async function getCardImageUrl(pageTitle) {
  const data = await fetchJson(
    apiUrl({
      action: "parse",
      page: pageTitle,
      prop: "images",
    }),
  );

  const images = data.parse?.images ?? [];
  const cardImage = images.find((image) => {
    const normalized = String(image).replace(/ /g, "_");
    return /^Carte_/i.test(normalized) && /\.(png|jpe?g|webp)$/i.test(normalized);
  });

  if (!cardImage) return null;

  const imageInfo = await fetchJson(
    apiUrl({
      action: "query",
      titles: `Fichier:${cardImage}`,
      prop: "imageinfo",
      iiprop: "url",
    }),
  );

  const pages = Object.values(imageInfo.query?.pages ?? {});
  const url = pages[0]?.imageinfo?.[0]?.url ?? null;

  if (!url || !url.startsWith(POKEPEDIA_IMAGE_PREFIX)) return null;
  return url;
}

async function downloadImage(imageUrl, destPath) {
  if (!FORCE && existsSync(destPath)) return "skipped";

  if (!imageUrl.startsWith(POKEPEDIA_IMAGE_PREFIX)) {
    throw new Error(`Source non francaise refusee: ${imageUrl}`);
  }

  const response = await fetch(imageUrl, { headers: FETCH_HEADERS });
  if (!response.ok) {
    throw new Error(`${imageUrl} -> ${response.status}`);
  }

  const contentType = response.headers.get("content-type") ?? "";
  if (!contentType.startsWith("image/")) {
    throw new Error(`contenu non image (${contentType || "vide"})`);
  }

  const buffer = Buffer.from(await response.arrayBuffer());
  if (buffer.length === 0) {
    throw new Error("fichier vide");
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

function toCatalogCard(sourceCard, index, total, imagePath) {
  const totalLabel = String(total).padStart(3, "0");
  const number = `${String(index).padStart(3, "0")}/${totalLabel}`;
  const id = `${sourceCard.serieId}-${String(index).padStart(3, "0")}`;

  const card = {
    id,
    serieId: sourceCard.serieId,
    name: normalizeFrenchCardName(sourceCard.name),
    number,
    rarity: "Commune",
    condition: "Near Mint",
    language: "FR",
    price: 0.5,
    stock: 0,
  };

  if (imagePath) card.image = imagePath;
  if (sourceCard.description) card.description = sourceCard.description;
  else if (sourceCard.deck || sourceCard.sourceNumber) {
    card.description = [sourceCard.deck, sourceCard.sourceNumber ? `numéro original ${sourceCard.sourceNumber}` : ""]
      .filter(Boolean)
      .join(" - ");
  }

  return card;
}

function serializeCards(cards) {
  const lines = cards.map((card) => {
    const fields = [
      `id: ${escapeTs(card.id)}`,
      `serieId: ${escapeTs(card.serieId)}`,
      `name: ${escapeTs(card.name)}`,
      `number: ${escapeTs(card.number)}`,
      `rarity: ${escapeTs(card.rarity)}`,
      `condition: ${escapeTs(card.condition)}`,
      `language: ${escapeTs(card.language)}`,
      `price: ${card.price}`,
      `stock: ${card.stock}`,
      card.image ? `image: ${escapeTs(card.image)}` : null,
      card.description ? `description: ${escapeTs(card.description)}` : null,
    ].filter(Boolean);

    return `  { ${fields.join(", ")} },`;
  });

  return [
    'import type { Card } from "../../catalog";',
    "",
    "export const TRAINER_KIT_CARDS = [",
    ...lines,
    "] satisfies Card[];",
    "",
  ].join("\n");
}

function writeReport(errors) {
  mkdirSync(dirname(REPORT_FILE), { recursive: true });
  writeFileSync(
    REPORT_FILE,
    errors.length > 0
      ? `${errors.join("\n")}\n`
      : "Aucune erreur Trainer Kit. Toutes les images traitees viennent de Pokepedia FR.\n",
  );
}

async function main() {
  const sourceCards = [];
  const errors = [];

  for (const kit of KITS) {
    try {
      if (kit.pages) {
        for (const page of kit.pages) {
          const wikitext = await getPageWikitext(page);
          sourceCards.push(...parseNumberedKitPage(wikitext, kit.serieId));
        }
      }

      if (kit.deckPages) {
        for (const page of kit.deckPages) {
          const wikitext = await getPageWikitext(page);
          sourceCards.push(...parseDeckCompositionPage(wikitext, kit.serieId, page));
        }
      }
    } catch (error) {
      errors.push(`${kit.serieId}: ${error.message}`);
    }
  }

  const bySerie = new Map();
  for (const sourceCard of sourceCards) {
    const list = bySerie.get(sourceCard.serieId) ?? [];
    list.push(sourceCard);
    bySerie.set(sourceCard.serieId, list);
  }

  const catalogCards = [];
  const imageJobs = [];

  for (const kit of KITS) {
    const list = bySerie.get(kit.serieId) ?? [];

    list.forEach((sourceCard, zeroIndex) => {
      const index = zeroIndex + 1;
      const basePath = `/cartes/trainer-kit/${kit.serieId}/${String(index).padStart(3, "0")}`;
      const catalogCard = toCatalogCard(sourceCard, index, list.length, null);
      catalogCards.push(catalogCard);
      imageJobs.push({ sourceCard, catalogCard, basePath });
    });
  }

  let downloaded = 0;
  let skipped = 0;
  let missing = 0;

  await runPool(
    imageJobs,
    async ({ sourceCard, catalogCard, basePath }) => {
      try {
        const imageUrl = await getCardImageUrl(sourceCard.pageTitle);

        if (!imageUrl) {
          missing++;
          errors.push(`${catalogCard.serieId} ${catalogCard.number} - ${catalogCard.name}: image FR Pokepedia introuvable (${sourceCard.pageTitle})`);
          return;
        }

        const extension = extname(new URL(imageUrl).pathname).toLowerCase() || ".png";
        const imagePath = `${basePath}${extension}`;
        const dest = resolve(ROOT, "public", imagePath.replace(/^\//, ""));
        const result = await downloadImage(imageUrl, dest);

        catalogCard.image = imagePath;

        if (result === "skipped") {
          skipped++;
        } else {
          downloaded++;
          console.log(`[OK] ${catalogCard.serieId} ${catalogCard.number} - ${catalogCard.name}`);
        }
      } catch (error) {
        missing++;
        errors.push(`${catalogCard.serieId} ${catalogCard.number} - ${catalogCard.name}: ${error.message}`);
        console.log(`[ERREUR] ${catalogCard.serieId} ${catalogCard.number} - ${catalogCard.name}: ${error.message}`);
      }
    },
    CONCURRENCY,
  );

  writeFileSync(OUTPUT_FILE, serializeCards(catalogCards));
  writeReport(errors);

  console.log("");
  console.log("=== TOTAL Trainer Kit ===");
  console.log(`Series: ${KITS.length}`);
  console.log(`Cartes: ${catalogCards.length}`);
  console.log(`Images telechargees: ${downloaded}`);
  console.log(`Images deja presentes: ${skipped}`);
  console.log(`Images manquantes: ${missing}`);
  console.log(`Rapport: ${REPORT_FILE}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
