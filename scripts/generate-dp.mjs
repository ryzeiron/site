// Fetch toutes les cartes du bloc Diamant et Perle depuis tcgdex.net (FR)
// et genere lib/catalog/cards/diamant-et-perle.ts
//
// Usage : node scripts/generate-dp.mjs
//
// Comportement :
//   - Pour chaque carte qui n'est PAS Secrete/Ultra Rare : genere 2 entrees
//     (1 Commune + 1 Reverse).
//   - Pour les cartes Secrete / Ultra Rare / autres : 1 seule entree avec la
//     rarete originale traduite en FR.

import { writeFileSync, mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT_FILE = resolve(__dirname, "../lib/catalog/cards/diamant-et-perle.ts");

// id tcgdex -> serieId catalog
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

// Raretes tcgdex (FR) qui ne doivent PAS avoir de version Commune/Reverse
// (= les cartes secretes / ultra rares gardent leur rarete d'origine)
const NO_DOUBLE_VARIANTS = new Set([
  "Secrete Rare",
  "Secret Rare",
  "Ultra Rare",
  "Rare Holo LV.X",
  "LV.X",
  "Rare Holo Star",
  "Shiny Rare",
  "Shiny Holo Rare",
  "Rainbow Rare",
  "Gold Star",
]);

async function fetchSet(setId) {
  const url = `https://api.tcgdex.net/v2/fr/sets/${setId}`;
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`Fetch ${setId} failed: ${res.status} ${res.statusText}`);
  }
  return res.json();
}

function normalizeRarity(raw) {
  if (!raw) return null;
  const s = String(raw).trim();
  // tcgdex renvoie souvent en FR mais parfois en EN, on normalise
  const map = {
    Common: "Commune",
    Uncommon: "Peu Commune",
    Rare: "Rare",
    "Rare Holo": "Rare Holo",
    "Holo Rare": "Rare Holo",
    "Ultra Rare": "Ultra Rare",
    "Secret Rare": "Secrete Rare",
    "LV.X": "LV.X",
    "Rare Holo LV.X": "LV.X",
  };
  return map[s] ?? s;
}

function jsonLine(card) {
  // garde le meme format/ordre que les autres fichiers du catalogue
  return `  { id: ${JSON.stringify(card.id)}, serieId: ${JSON.stringify(card.serieId)}, name: ${JSON.stringify(card.name)}, number: ${JSON.stringify(card.number)}, rarity: ${JSON.stringify(card.rarity)}, condition: "Near Mint", language: "FR", price: 0.5, stock: 0, image: ${JSON.stringify(card.image)}, },`;
}

(async () => {
  const lines = [];
  lines.push(`import type { Card } from "../../catalog";`);
  lines.push(``);
  lines.push(`// Diamant et Perle - genere automatiquement par scripts/generate-dp.mjs`);
  lines.push(`export const DIAMANT_ET_PERLE_CARDS = ([`);

  let total = 0;

  for (const { tcg, serie } of SETS) {
    console.log(`Fetch set ${tcg}...`);
    const setData = await fetchSet(tcg);
    const cards = setData.cards ?? [];
    console.log(`  ${cards.length} cartes recues.`);

    // tri par localId numerique (ou alphanumerique en fallback)
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
      const baseId = `${serie}-${String(localId).padStart(3, "0")}`;
      const rarity = normalizeRarity(c.rarity) ?? "Commune";
      const image = `/cartes/${serie}/${localId}.webp`;
      const name = c.name;

      if (NO_DOUBLE_VARIANTS.has(rarity)) {
        // une seule entree, rarete d'origine
        lines.push(jsonLine({ id: baseId, serieId: serie, name, number, rarity, image }));
        total += 1;
      } else {
        // 2 entrees : Commune + Reverse
        lines.push(jsonLine({ id: `${baseId}-c`, serieId: serie, name, number, rarity: "Commune", image }));
        lines.push(jsonLine({ id: `${baseId}-r`, serieId: serie, name, number, rarity: "Reverse", image }));
        total += 2;
      }
    }
  }

  lines.push(`] as const) as readonly Card[];`);
  lines.push(``);

  mkdirSync(dirname(OUT_FILE), { recursive: true });
  writeFileSync(OUT_FILE, lines.join("\n"), "utf8");
  console.log(`OK : ${total} entrees ecrites dans ${OUT_FILE}`);
})();
