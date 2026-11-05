// Telecharge les cartes FR de l'extension ME06 Regne Delta depuis tcgdex.net,
// enregistre les visuels dans public/cartes/me06/ et genere
// lib/catalog/cards/regne-delta.ts
//
// Usage : npm run generate:me06
//         npm run generate:me06 -- --set=<id>   (force un set precis)
//
// Tout est en francais. Si un visuel FR n'existe pas, la carte est signalee et
// aucun visuel anglais n'est utilise a la place.

import { writeFileSync, mkdirSync, existsSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { Buffer } from "node:buffer";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "..");
const OUT_FILE = resolve(ROOT, "lib/catalog/cards/regne-delta.ts");
const SERIE_ID = "me06";
const EXPORT_NAME = "REGNE_DELTA_CARDS";
const SERIE_DIR = resolve(ROOT, "public/cartes", SERIE_ID);
const SERIE_LOGO = resolve(ROOT, "public/series/ME/me06.webp");

const API = "https://api.tcgdex.net/v2/fr";
const CONCURRENCY = 6;

// Au-dela de ce numero, la carte est secrete : 103 cartes de serie, 141 au
// total. Une secrete n'a pas de Reverse.
const DERNIERE_CARTE_SERIE = 103;

// Raretes qui n'ont jamais de Reverse.
const SANS_REVERSE = [
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
  "promo",
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

function hasReverse(rarity, localId) {
  const numero = Number.parseInt(localId, 10);
  if (!Number.isNaN(numero) && numero > DERNIERE_CARTE_SERIE) return false;

  const r = normalize(rarity);
  return !SANS_REVERSE.some((x) => r === normalize(x));
}

async function fetchJson(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`${res.status} ${res.statusText} sur ${url}`);
  return res.json();
}

// Le set est retrouve par son nom plutot que par un identifiant code en dur.
// On privilegie celui dont le nom commence par le titre, pour ne pas retenir
// une collection derivee dont le nom le prefixe.
async function findSet() {
  if (forcedSet) {
    console.log(`Set force : ${forcedSet}`);
    return forcedSet;
  }

  const sets = await fetchJson(`${API}/sets`);

  // "delta" seul : tcgdex peut nommer le set autrement que "Regne Delta",
  // notamment juste apres une sortie ou avant la traduction du nom.
  const matches = sets.filter((set) => normalize(set.name).includes("delta"));

  if (matches.length === 0) {
    // Plutot qu'un echec sec, on montre ce que tcgdex a reellement : le set
    // peut y figurer sous un nom inattendu, et l'identifiant suffit alors.
    const recents = sets.slice(-15).reverse();

    console.log("\nDerniers sets connus de tcgdex en FR :");
    for (const set of recents) {
      const total = set.cardCount?.total ?? set.cardCount?.official ?? "?";
      console.log(`  ${String(set.id).padEnd(12)} ${String(set.name).padEnd(38)} ${total} cartes`);
    }

    throw new Error(
      "Aucun set FR dont le nom contient \"delta\".\n" +
        "L'extension vient de sortir, tcgdex ne l'a sans doute pas encore.\n" +
        "Si tu la reconnais ci-dessus, relance avec --set=<id>.\n" +
        "Sinon, reessaie dans quelques jours.",
    );
  }

  const preferred =
    matches.find((set) => normalize(set.name).includes("regne")) ?? matches[0];

  if (matches.length > 1) {
    console.log("Plusieurs sets correspondent :");
    for (const set of matches) {
      console.log(`  ${set.id === preferred.id ? "->" : "  "} ${set.id}  ${set.name}`);
    }
  }

  console.log(`Set retenu : ${preferred.id} (${preferred.name})`);
  return preferred.id;
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
        console.error(`\n  ${e.message}`);
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
  const setId = await findSet();
  const setData = await fetchJson(`${API}/sets/${setId}`);
  const cards = setData.cards ?? [];

  if (cards.length === 0) {
    throw new Error(`Le set ${setId} ne renvoie aucune carte.`);
  }

  console.log(`\n${cards.length} cartes dans le set.`);

  if (cards.length !== 141) {
    console.log(
      `ATTENTION : 141 cartes attendues, ${cards.length} recues.\n` +
        `Le set est peut-etre encore incomplet chez tcgdex.`,
    );
  }

  cards.sort((a, b) => {
    const na = Number.parseInt(a.localId, 10);
    const nb = Number.parseInt(b.localId, 10);
    if (!Number.isNaN(na) && !Number.isNaN(nb)) return na - nb;
    return String(a.localId).localeCompare(String(b.localId), "fr", {
      numeric: true,
    });
  });

  mkdirSync(SERIE_DIR, { recursive: true });

  // Le detail de chaque carte porte sa rarete et l'URL reelle de son visuel.
  // Reconstruire cette URL a la main echoue des qu'un set range ses assets
  // autrement : on interroge donc les details avant de telecharger.
  console.log(`\nRecuperation des details FR`);

  const details = new Map();
  await runPool(
    cards,
    async (card) => {
      details.set(card.id, await fetchJson(`${API}/cards/${card.id}`));
    },
    CONCURRENCY,
  );

  // Logo du set, utilise comme visuel de serie.
  if (setData.logo && !existsSync(SERIE_LOGO)) {
    for (const ext of ["webp", "png"]) {
      try {
        await downloadImage(`${setData.logo}.${ext}`, SERIE_LOGO);
        console.log(`\nLogo de serie : public/series/ME/me06.webp (${ext})`);
        break;
      } catch {
        // Format suivant.
      }
    }
  }

  console.log(`\nTelechargement des visuels FR dans public/cartes/${SERIE_ID}/`);

  const missing = [];
  let ok = 0;
  let skipped = 0;

  await runPool(
    cards,
    async (card) => {
      const dest = resolve(SERIE_DIR, `${card.localId}.webp`);
      const base = details.get(card.id)?.image;

      if (!base) {
        missing.push({ localId: card.localId, name: card.name });
        throw new Error(`${card.localId} (${card.name}) : aucune image FR`);
      }

      for (const url of [`${base}/high.webp`, `${base}/high.png`]) {
        try {
          const state = await downloadImage(url, dest);
          if (state === "downloaded") ok++;
          else skipped++;
          return;
        } catch {
          // Format suivant.
        }
      }

      missing.push({ localId: card.localId, name: card.name });
      throw new Error(`${card.localId} (${card.name}) : visuel FR introuvable`);
    },
    CONCURRENCY,
  );

  const lines = [
    `import type { Card } from "../../catalog";`,
    ``,
    `// Mega-Evolution ME06 - Regne Delta - genere par scripts/generate-me06.mjs`,
    `export const ${EXPORT_NAME} = ([`,
  ];

  const rarities = new Map();
  let withReverseCount = 0;
  let secretes = 0;

  for (const card of cards) {
    const full = details.get(card.id);
    const localId = card.localId;
    const rarity = full?.rarity ?? "Commune";
    const name = full?.name ?? card.name ?? "Carte inconnue";
    const numero = Number.parseInt(localId, 10);
    const estSecrete = !Number.isNaN(numero) && numero > DERNIERE_CARTE_SERIE;
    const withReverse = hasReverse(rarity, localId);

    if (estSecrete) secretes++;
    if (withReverse) withReverseCount++;
    rarities.set(rarity, (rarities.get(rarity) ?? 0) + 1);

    lines.push(
      cardEntry({
        id: `${SERIE_ID}-${String(localId).padStart(3, "0")}`,
        name,
        number: `${String(localId).padStart(3, "0")}/${DERNIERE_CARTE_SERIE}`,
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
  console.log(`Fichier  : ${OUT_FILE}`);
  console.log(`Cartes   : ${cards.length} dont ${secretes} secrete(s)`);
  console.log(`Reverse  : ${withReverseCount}`);
  console.log(`Visuels  : ${ok} telecharges, ${skipped} deja presents`);

  if (missing.length > 0) {
    console.log(`\nATTENTION : ${missing.length} visuel(s) FR introuvable(s).`);
    for (const item of missing.slice(0, 15)) {
      console.log(`  ${item.localId} ${item.name}`);
    }
    console.log(
      `\nAucun visuel anglais n'a ete utilise a la place. L'extension vient de\n` +
        `sortir : relance dans quelques jours, les scans FR arrivent souvent apres.`,
    );
  }

  console.log(`\nRaretes rencontrees :`);
  for (const [rarity, count] of [...rarities.entries()].sort((a, b) => b[1] - a[1])) {
    console.log(`  ${String(count).padStart(4)}  ${rarity}`);
  }
})().catch((e) => {
  console.error(`\nErreur : ${e.message}`);
  process.exitCode = 1;
});
