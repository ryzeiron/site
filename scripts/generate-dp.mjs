// Fetch toutes les cartes du bloc Diamant et Perle depuis tcgdex.net (FR)
// et genere lib/catalog/cards/diamant-et-perle.ts
//
// Usage : node scripts/generate-dp.mjs
//
// Comportement : 1 entree par carte avec
//   - rarity "Commune" (base)
//   - altVariant: { rarity: "Reverse", price, stock } pour la variante reverse
// Pour les cartes Secrete / Ultra Rare / LV.X / Shiny : pas d'altVariant,
// juste la rarete originale.

import { writeFileSync, mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT_FILE = resolve(__dirname, "../lib/catalog/cards/diamant-et-perle.ts");

const SETS = [
  { tcg: "dpp", serie: "promo-dp" },
  { tcg: "dp1", serie: "dp01" },
  { tcg: "dp2", serie: "dp02" },
  { tcg: "dp3", serie: "dp03" },
  { tcg: "dp4", serie: "dp04" },
  { tcg: "dp5", serie: "dp05" },
  { tcg: "dp6", serie: "dp06" },
  { tcg: "dp7", serie: "dp07" },
];

const NO_REVERSE_RARITIES = [
  "ultra rare",
  "secret rare",
  "secrete rare",
  "lv.x",
  "lvx",
  "rare holo lv.x",
  "shiny",
  "shiny rare",
  "shiny holo rare",
  "shining",
  "gold star",
  "rare holo star",
  "rainbow rare",
];

function normalize(s) {
  return String(s ?? "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function hasReverse(rarity) {
  const r = normalize(rarity);
  return !NO_REVERSE_RARITIES.some((x) => r === normalize(x));
}

async function fetchSet(setId) {
  const url = `https://api.tcgdex.net/v2/fr/sets/${setId}`;
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`Fetch ${setId} failed: ${res.status} ${res.statusText}`);
  }
  return res.json();
}

function cardEntry({ id, serieId, name, number, rarity, image, withReverse }) {
  // 1 entree par carte. Rarity = "Commune" par defaut pour les cartes normales,
  // ou la rarete originale pour les cartes sans reverse.
  const baseRarity = withReverse ? "Commune" : (rarity ?? "Commune");
  let line = `  { id: ${JSON.stringify(id)}, serieId: ${JSON.stringify(serieId)}, name: ${JSON.stringify(name)}, number: ${JSON.stringify(number)}, rarity: ${JSON.stringify(baseRarity)}, condition: "Near Mint", language: "FR", price: 0.5, stock: 0, image: ${JSON.stringify(image)}`;
  if (withReverse) {
    line += `, altVariant: { rarity: "Reverse", price: 0.5, stock: 0 }`;
  }
  line += `, },`;
  return line;
}

(async () => {
  const lines = [];
  lines.push(`import type { Card } from "../../catalog";`);
  lines.push(``);
  lines.push(`// Diamant et Perle - genere par scripts/generate-dp.mjs`);
  lines.push(`export const DIAMANT_ET_PERLE_CARDS = ([`);

  let total = 0;
  let withReverseCount = 0;
  let singleCount = 0;
  const seenRarities = new Map();

  for (const { tcg, serie } of SETS) {
    console.log(`\n=== Fetch set ${tcg} (-> ${serie}) ===`);
    let setData;
    try {
      setData = await fetchSet(tcg);
    } catch (e) {
      console.error(`  ERREUR fetch ${tcg} : ${e.message} - set ignore`);
      continue;
    }
    const cards = setData.cards ?? [];
    console.log(`  ${cards.length} cartes recues.`);

    cards.sort((a, b) => {
      const na = parseInt(a.localId, 10);
      const nb = parseInt(b.localId, 10);
      if (!isNaN(na) && !isNaN(nb)) return na - nb;
      return String(a.localId).localeCompare(String(b.localId));
    });

    const totalInSet = setData.cardCount?.official ?? cards.length;

    for (const c of cards) {
      const localId = c.localId;
      const number = `${String(localId).padStart(3, "0")}/${String(totalInSet).padStart(3, "0")}`;
      const id = `${serie}-${String(localId).padStart(3, "0")}`;
      const rarity = c.rarity ?? "Commune";
      const image = `/cartes/${serie}/${localId}.webp`;
      const name = c.name ?? "Carte inconnue";

      seenRarities.set(rarity, (seenRarities.get(rarity) ?? 0) + 1);

      const withReverse = hasReverse(rarity);
      lines.push(cardEntry({ id, serieId: serie, name, number, rarity, image, withReverse }));
      total += 1;
      if (withReverse) withReverseCount += 1;
      else singleCount += 1;
    }
  }

  lines.push(`] as const) as readonly Card[];`);
  lines.push(``);

  mkdirSync(dirname(OUT_FILE), { recursive: true });
  writeFileSync(OUT_FILE, lines.join("\n"), "utf8");

  console.log(`\n=== TERMINE ===`);
  console.log(`${total} cartes ecrites dans ${OUT_FILE}`);
  console.log(`  - avec Reverse (Commune + altVariant Reverse) : ${withReverseCount}`);
  console.log(`  - sans Reverse (rarete originale seule)       : ${singleCount}`);
  console.log(`\nRaretes rencontrees (verifie si certaines auraient du etre sans reverse) :`);
  for (const [r, n] of [...seenRarities.entries()].sort((a, b) => b[1] - a[1])) {
    console.log(`  ${n.toString().padStart(4)}  ${r}`);
  }
})();
