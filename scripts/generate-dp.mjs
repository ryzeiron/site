// Fetch toutes les cartes du bloc Diamant et Perle depuis tcgdex.net (FR),
// telecharge les images dans public/cartes/<serie>/<localId>.(webp|png),
// et genere lib/catalog/cards/diamant-et-perle.ts
//
// Usage : node scripts/generate-dp.mjs
//
// Format : 1 entree par carte avec
//   - rarity "Commune" (base)
//   - altVariant: { rarity: "Reverse", price, stock }
// Sauf pour Secrete / Ultra Rare / LV.X / Shiny : 1 entree avec rarete originale,
// pas d'altVariant.

import { writeFileSync, mkdirSync, existsSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { Buffer } from "node:buffer";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "..");
const OUT_FILE = resolve(ROOT, "lib/catalog/cards/diamant-et-perle.ts");
const PUBLIC_CARTES = resolve(ROOT, "public/cartes");

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

const JCC_POKEMON_TF_SCAN_SETS = {
  dp03: "15",
  dp04: "14",
  dp05: "13",
  dp06: "12",
  dp07: "11",
};

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

const CONCURRENCY = 8;

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

async function downloadImage(srcUrl, destPath) {
  if (existsSync(destPath)) return "skipped";
  const res = await fetch(srcUrl);
  if (!res.ok) {
    throw new Error(`${res.status} ${res.statusText}`);
  }
  const buf = Buffer.from(await res.arrayBuffer());
  mkdirSync(dirname(destPath), { recursive: true });
  writeFileSync(destPath, buf);
  return "downloaded";
}

async function runPool(items, worker, concurrency) {
  let i = 0;
  let done = 0;
  const total = items.length;
  async function next() {
    while (i < items.length) {
      const idx = i++;
      try {
        await worker(items[idx]);
      } catch (e) {
        console.error(`  [${idx}] ${e.message}`);
      }
      done++;
      if (done % 25 === 0 || done === total) {
        process.stdout.write(`\r  progression : ${done}/${total}    `);
      }
    }
  }
  await Promise.all(Array.from({ length: concurrency }, () => next()));
  process.stdout.write("\n");
}

function cardEntry({ id, serieId, name, number, rarity, image, withReverse }) {
  const baseRarity = withReverse ? "Commune" : (rarity ?? "Commune");
  let line = `  { id: ${JSON.stringify(id)}, serieId: ${JSON.stringify(serieId)}, name: ${JSON.stringify(name)}, number: ${JSON.stringify(number)}, rarity: ${JSON.stringify(baseRarity)}, condition: "Near Mint", language: "FR", price: 0.5, stock: 0, image: ${JSON.stringify(image)}`;
  if (withReverse) {
    line += `, altVariant: { rarity: "Reverse", price: 0.5, stock: 0 }`;
  }
  line += `, },`;
  return line;
}

function imageInfo(serie, localId, tcgdexImage) {
  const jccSetId = JCC_POKEMON_TF_SCAN_SETS[serie];

  if (jccSetId) {
    return {
      image: `/cartes/${serie}/${localId}.png`,
      srcUrl: `https://www.jcc.pokemon.tf/Images/Scan/${jccSetId}/${localId}.png`,
    };
  }

  if (!tcgdexImage) return null;

  return {
    image: `/cartes/${serie}/${localId}.webp`,
    srcUrl: `${tcgdexImage}/high.webp`,
  };
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
  let imgOk = 0;
  let imgSkip = 0;
  let imgFail = 0;

  for (const { tcg, serie } of SETS) {
    console.log(`\n=== Set ${tcg} (-> ${serie}) ===`);
    let setData;
    try {
      setData = await fetchSet(tcg);
    } catch (e) {
      console.error(`  ERREUR fetch ${tcg} : ${e.message} - set ignore`);
      continue;
    }
    const cards = setData.cards ?? [];
    console.log(`  ${cards.length} cartes a traiter.`);

    cards.sort((a, b) => {
      const na = parseInt(a.localId, 10);
      const nb = parseInt(b.localId, 10);
      if (!isNaN(na) && !isNaN(nb)) return na - nb;
      return String(a.localId).localeCompare(String(b.localId));
    });

    const totalInSet = setData.cardCount?.official ?? cards.length;
    const serieDir = resolve(PUBLIC_CARTES, serie);
    mkdirSync(serieDir, { recursive: true });

    console.log(`  Telechargement des images dans public/cartes/${serie}/ ...`);
    await runPool(
      cards,
      async (c) => {
        const info = imageInfo(serie, c.localId, c.image);
        if (!info) return;

        const dest = resolve(ROOT, "public", info.image.replace(/^\//, ""));
        try {
          const state = await downloadImage(info.srcUrl, dest);
          if (state === "downloaded") imgOk++;
          else imgSkip++;
        } catch (e) {
          imgFail++;
          console.error(`\n  IMG FAIL ${c.localId} (${c.name}) : ${e.message}`);
        }
      },
      CONCURRENCY,
    );

    for (const c of cards) {
      const localId = c.localId;
      const number = `${String(localId).padStart(3, "0")}/${String(totalInSet).padStart(3, "0")}`;
      const id = `${serie}-${String(localId).padStart(3, "0")}`;
      const rarity = c.rarity ?? "Commune";
      const image = imageInfo(serie, localId, c.image)?.image ?? `/cartes/${serie}/${localId}.webp`;
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
  console.log(`Fichier : ${OUT_FILE}`);
  console.log(`Cartes : ${total} (avec Reverse: ${withReverseCount}, sans Reverse: ${singleCount})`);
  console.log(`Images : ${imgOk} telechargees, ${imgSkip} deja presentes, ${imgFail} echec`);
  console.log(`\nRaretes rencontrees :`);
  for (const [r, n] of [...seenRarities.entries()].sort((a, b) => b[1] - a[1])) {
    console.log(`  ${n.toString().padStart(4)}  ${r}`);
  }
})();
