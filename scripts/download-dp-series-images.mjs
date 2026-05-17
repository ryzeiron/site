// Telecharge les images des series Diamant et Perle
// dans public/series/DP/*.webp
//
// Usage : node scripts/download-dp-series-images.mjs
// Force le re-telechargement : node scripts/download-dp-series-images.mjs --force

import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { Buffer } from "node:buffer";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "..");
const OUT_DIR = resolve(ROOT, "public/series/DP");

const force = process.argv.includes("--force");

const SERIES = [
  {
    name: "Promo DP",
    tcgdexId: "dpp",
    file: "DPP.webp",
  },
  {
    name: "Diamant et Perle",
    tcgdexId: "dp1",
    file: "DP1.webp",
  },
  {
    name: "Tresors Mysterieux",
    tcgdexId: "dp2",
    file: "DP2.webp",
  },
  {
    name: "Merveilles Secretes",
    tcgdexId: "dp3",
    file: "DP3.webp",
  },
  {
    name: "Duels au Sommet",
    tcgdexId: "dp4",
    file: "DP4.webp",
  },
  {
    name: "Aube Majestueuse",
    tcgdexId: "dp5",
    file: "DP5.webp",
  },
  {
    name: "Eveil des Legendes",
    tcgdexId: "dp6",
    file: "DP6.webp",
  },
  {
    name: "Tempete",
    tcgdexId: "dp7",
    file: "DP7.webp",
  },
];

async function download(url, dest) {
  const res = await fetch(url);

  if (!res.ok) {
    throw new Error(`${res.status} ${res.statusText}`);
  }

  const buffer = Buffer.from(await res.arrayBuffer());

  if (buffer.length === 0) {
    throw new Error("Fichier vide");
  }

  writeFileSync(dest, buffer);
}

async function getLogoUrls(tcgdexId) {
  const fallbackUrls = [
    `https://assets.tcgdex.net/fr/dp/${tcgdexId}/logo.webp`,
    `https://assets.tcgdex.net/en/dp/${tcgdexId}/logo.webp`,
  ];

  try {
    const res = await fetch(`https://api.tcgdex.net/v2/fr/sets/${tcgdexId}`);

    if (!res.ok) {
      return fallbackUrls;
    }

    const set = await res.json();

    if (!set.logo) {
      return fallbackUrls;
    }

    return [`${set.logo}.webp`, ...fallbackUrls];
  } catch {
    return fallbackUrls;
  }
}

async function main() {
  mkdirSync(OUT_DIR, { recursive: true });

  let downloaded = 0;
  let skipped = 0;
  let missing = 0;

  for (const serie of SERIES) {
    const dest = resolve(OUT_DIR, serie.file);

    if (!force && existsSync(dest)) {
      skipped++;
      console.log(`[SKIP] ${serie.name} -> public/series/DP/${serie.file}`);
      continue;
    }

    const urls = await getLogoUrls(serie.tcgdexId);
    let success = false;
    const errors = [];

    for (const url of urls) {
      try {
        await download(url, dest);
        downloaded++;
        success = true;
        console.log(`[OK] ${serie.name} -> public/series/DP/${serie.file}`);
        break;
      } catch (error) {
        errors.push(`${url} -> ${error.message}`);
      }
    }

    if (!success) {
      missing++;
      console.log(`[MANQUANTE] ${serie.name}`);
      for (const error of errors) {
        console.log(`  ${error}`);
      }
    }
  }

  console.log("");
  console.log(`Telechargees: ${downloaded}`);
  console.log(`Deja presentes: ${skipped}`);
  console.log(`Manquantes: ${missing}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
