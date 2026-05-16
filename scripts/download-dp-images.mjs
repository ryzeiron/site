// Telecharge UNIQUEMENT les images des cartes Diamant et Perle depuis tcgdex.net
// dans public/cartes/<serie>/<localId>.webp
//
// Usage : node scripts/download-dp-images.mjs
//
// Ne touche PAS au fichier lib/catalog/cards/diamant-et-perle.ts.
// Re-execute = saute les images deja telechargees (idempotent).

import { writeFileSync, mkdirSync, existsSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { Buffer } from "node:buffer";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "..");
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

const CONCURRENCY = 8;

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

(async () => {
  let totalOk = 0;
  let totalSkip = 0;
  let totalFail = 0;

  for (const { tcg, serie } of SETS) {
    console.log(`\n=== Set ${tcg} (-> public/cartes/${serie}/) ===`);
    let setData;
    try {
      setData = await fetchSet(tcg);
    } catch (e) {
      console.error(`  ERREUR fetch ${tcg} : ${e.message} - set ignore`);
      continue;
    }
    const allCards = setData.cards ?? [];
    const cards = allCards.filter((c) => c.image);
    console.log(`  Reponse API : ${allCards.length} cartes au total, dont ${cards.length} avec image.`);
    if (allCards.length === 0) {
      console.log(`  DEBUG cles de setData : ${Object.keys(setData).join(", ")}`);
    } else if (cards.length === 0) {
      console.log(`  DEBUG premiere carte : ${JSON.stringify(allCards[0]).slice(0, 300)}`);
    }

    const serieDir = resolve(PUBLIC_CARTES, serie);
    mkdirSync(serieDir, { recursive: true });

    let setOk = 0;
    let setSkip = 0;
    let setFail = 0;

    await runPool(
      cards,
      async (c) => {
        const dest = resolve(serieDir, `${c.localId}.webp`);
        const srcUrl = `${c.image}/high.webp`;
        try {
          const state = await downloadImage(srcUrl, dest);
          if (state === "downloaded") setOk++;
          else setSkip++;
        } catch (e) {
          setFail++;
          console.error(`\n  IMG FAIL ${c.localId} (${c.name}) : ${e.message}`);
        }
      },
      CONCURRENCY,
    );

    console.log(`  -> ${setOk} telechargees, ${setSkip} skip, ${setFail} echec`);
    totalOk += setOk;
    totalSkip += setSkip;
    totalFail += setFail;
  }

  console.log(`\n=== TERMINE ===`);
  console.log(`Total : ${totalOk} telechargees, ${totalSkip} skip, ${totalFail} echec`);
  if (totalFail > 0) {
    console.log(`\nRelance le script pour retenter les images en echec.`);
  }
})();
