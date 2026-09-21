// Telecharge les cartes FR de l'extension 30e Anniversaire depuis tcgdex.net,
// enregistre les visuels dans public/cartes/30ans/ et genere
// lib/catalog/cards/30-ans.ts
//
// Usage : npm run generate:30ans
//         npm run generate:30ans -- --set=<id>   (force un set precis)
//
// Tout est en francais : noms, raretes et visuels. Si un visuel FR n'existe
// pas, la carte est signalee et aucun visuel anglais n'est utilise a la place.

import { writeFileSync, mkdirSync, existsSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { Buffer } from "node:buffer";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "..");
const OUT_FILE = resolve(ROOT, "lib/catalog/cards/30-ans.ts");
const SERIE_ID = "30ans";
const SERIE_DIR = resolve(ROOT, "public/cartes", SERIE_ID);

const API = "https://api.tcgdex.net/v2/fr";
const ASSETS = "https://assets.tcgdex.net/fr";
const CONCURRENCY = 6;

// Raretes sans Reverse : une seule entree, avec la rarete d'origine.
const NO_REVERSE_RARITIES = [
  "ultra rare",
  "secret rare",
  "secrete rare",
  "rare secrete",
  "hyper rare",
  "rainbow rare",
  "illustration rare",
  "illustration speciale rare",
  "chromatique rare",
  "chromatique ultra rare",
  "double rare",
  "lv.x",
  "shiny",
  "gold star",
];

const forcedSet = process.argv
  .find((arg) => arg.startsWith("--set="))
  ?.slice("--set=".length)
  .trim();

function normalize(value) {
  return String(value ?? "")
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

async function fetchJson(url) {
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`${res.status} ${res.statusText} sur ${url}`);
  }
  return res.json();
}

// Le set est retrouve par son nom plutot que par un identifiant code en dur,
// qui change selon les conventions de tcgdex.
async function findAnniversarySet() {
  if (forcedSet) {
    console.log(`Set force : ${forcedSet}`);
    return forcedSet;
  }

  const sets = await fetchJson(`${API}/sets`);
  const matches = sets.filter((set) => {
    const name = normalize(set.name);
    return name.includes("30") && name.includes("anniversaire");
  });

  if (matches.length === 0) {
    throw new Error(
      "Aucun set FR dont le nom contient 30 et anniversaire.\n" +
        "Relance avec --set=<id> en prenant l'identifiant sur api.tcgdex.net/v2/fr/sets",
    );
  }

  if (matches.length > 1) {
    console.log("Plusieurs sets correspondent :");
    for (const set of matches) console.log(`  ${set.id}  ${set.name}`);
    console.log("Le premier est utilise. Force le bon avec --set=<id>.");
  }

  console.log(`Set trouve : ${matches[0].id} (${matches[0].name})`);
  return matches[0].id;
}

async function downloadImage(srcUrl, destPath) {
  if (existsSync(destPath)) return "skipped";

  const res = await fetch(srcUrl);
  if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);

  const buffer = Buffer.from(await res.arrayBuffer());
  mkdirSync(dirname(destPath), { recursive: true });
  writeFileSync(destPath, buffer);
  return "downloaded";
}

async function runPool(items, worker, concurrency) {
  let index = 0;
  let done = 0;

  async function next() {
    while (index < items.length) {
      const current = index++;
      try {
        await worker(items[current]);
      } catch (e) {
        console.error(`  [${current}] ${e.message}`);
      }
      done++;
      if (done % 20 === 0 || done === items.length) {
        process.stdout.write(`\r  progression : ${done}/${items.length}    `);
      }
    }
  }

  await Promise.all(Array.from({ length: concurrency }, () => next()));
  process.stdout.write("\n");
}

function cardEntry({ id, name, number, rarity, image, withReverse }) {
  const baseRarity = withReverse ? "Commune" : (rarity ?? "Commune");
  let line =
    `  { id: ${JSON.stringify(id)}, serieId: ${JSON.stringify(SERIE_ID)}, ` +
    `name: ${JSON.stringify(name)}, number: ${JSON.stringify(number)}, ` +
    `rarity: ${JSON.stringify(baseRarity)}, condition: "Near Mint", language: "FR", ` +
    `price: 0.5, stock: 0, image: ${JSON.stringify(image)}`;

  if (withReverse) {
    line += `, altVariant: { rarity: "Reverse", price: 0.5, stock: 0 }`;
  }

  return `${line}, },`;
}

(async () => {
  const setId = await findAnniversarySet();
  const setData = await fetchJson(`${API}/sets/${setId}`);
  const cards = setData.cards ?? [];

  if (cards.length === 0) {
    throw new Error(`Le set ${setId} ne renvoie aucune carte.`);
  }

  console.log(`\n${cards.length} cartes dans le set.`);

  cards.sort((a, b) => {
    const na = Number.parseInt(a.localId, 10);
    const nb = Number.parseInt(b.localId, 10);
    if (!Number.isNaN(na) && !Number.isNaN(nb)) return na - nb;
    return String(a.localId).localeCompare(String(b.localId), "fr", {
      numeric: true,
    });
  });

  const totalInSet = setData.cardCount?.official ?? cards.length;
  const serieSegment = setData.serie?.id ?? "tcgp";
  mkdirSync(SERIE_DIR, { recursive: true });

  console.log(`\nTelechargement des visuels FR dans public/cartes/${SERIE_ID}/`);

  const missingImages = [];
  let ok = 0;
  let skipped = 0;

  await runPool(
    cards,
    async (card) => {
      const dest = resolve(SERIE_DIR, `${card.localId}.webp`);
      const url = `${ASSETS}/${serieSegment}/${setId}/${card.localId}/high.webp`;

      try {
        const state = await downloadImage(url, dest);
        if (state === "downloaded") ok++;
        else skipped++;
      } catch (e) {
        missingImages.push({ localId: card.localId, name: card.name });
        throw new Error(`${card.localId} (${card.name}) : ${e.message}`);
      }
    },
    CONCURRENCY,
  );

  // Les details (rarete) ne sont pas dans la reponse du set : une requete par
  // carte est necessaire.
  console.log(`\nRecuperation des raretes FR`);

  const details = new Map();
  await runPool(
    cards,
    async (card) => {
      const full = await fetchJson(`${API}/cards/${card.id}`);
      details.set(card.id, full);
    },
    CONCURRENCY,
  );

  const lines = [
    `import type { Card } from "../../catalog";`,
    ``,
    `// 30e Anniversaire - genere par scripts/generate-30ans.mjs`,
    `export const TRENTE_ANS_CARDS = ([`,
  ];

  const rarities = new Map();
  let withReverseCount = 0;

  for (const card of cards) {
    const full = details.get(card.id);
    const localId = card.localId;
    const rarity = full?.rarity ?? "Commune";
    const name = full?.name ?? card.name ?? "Carte inconnue";
    const number = `${String(localId).padStart(3, "0")}/${String(totalInSet).padStart(3, "0")}`;
    const withReverse = hasReverse(rarity);

    rarities.set(rarity, (rarities.get(rarity) ?? 0) + 1);
    if (withReverse) withReverseCount++;

    lines.push(
      cardEntry({
        id: `${SERIE_ID}-${String(localId).padStart(3, "0")}`,
        name,
        number,
        rarity,
        image: `/cartes/${SERIE_ID}/${localId}.webp`,
        withReverse,
      }),
    );
  }

  lines.push(`] as const) as readonly Card[];`, ``);

  mkdirSync(dirname(OUT_FILE), { recursive: true });
  writeFileSync(OUT_FILE, lines.join("\n"), "utf8");

  console.log(`\n=== TERMINE ===`);
  console.log(`Fichier : ${OUT_FILE}`);
  console.log(`Cartes  : ${cards.length} (avec Reverse : ${withReverseCount})`);
  console.log(`Visuels : ${ok} telecharges, ${skipped} deja presents`);

  if (missingImages.length > 0) {
    console.log(
      `\nATTENTION : ${missingImages.length} visuel(s) FR introuvable(s).`,
    );
    for (const item of missingImages.slice(0, 15)) {
      console.log(`  ${item.localId} ${item.name}`);
    }
    console.log(
      `\nAucun visuel anglais n'a ete utilise a la place. Relance plus tard :\n` +
        `les scans FR sont parfois mis en ligne apres la sortie.`,
    );
  }

  console.log(`\nRaretes rencontrees :`);
  for (const [rarity, count] of [...rarities.entries()].sort(
    (a, b) => b[1] - a[1],
  )) {
    console.log(`  ${String(count).padStart(4)}  ${rarity}`);
  }
})().catch((e) => {
  console.error(`\nErreur : ${e.message}`);
  process.exit(1);
});
