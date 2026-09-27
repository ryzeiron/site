// Telecharge les cartes FR de l'extension 30e Anniversaire depuis tcgdex.net,
// enregistre les visuels dans public/cartes/30ans/ et genere
// lib/catalog/cards/30-ans.ts
//
// Usage : npm run generate:30ans
//         npm run generate:30ans -- --set=<id>      (force un set precis)
//         npm run generate:30ans -- --promos=<id>   (ajoute un set promo)
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
// Visuel de serie, affiche sur la page du bloc Mega-Evolution.
const SERIE_LOGO = resolve(ROOT, "public/series/ME/30ans.webp");

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
  "promo",
];

const promoSet = process.argv
  .find((arg) => arg.startsWith("--promos="))
  ?.slice("--promos=".length)
  .trim();

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

  // Le set principal s'appelle "30e Anniversaire" ; les sets derives prefixent
  // leur nom ("Collection Classique 30e Anniversaire"). On privilegie donc celui
  // dont le nom commence par 30, sinon le tri alphabetique choisirait le mauvais.
  const preferred =
    matches.find((set) => normalize(set.name).startsWith("30")) ?? matches[0];

  if (matches.length > 1) {
    console.log("Plusieurs sets correspondent :");
    for (const set of matches) {
      const mark = set.id === preferred.id ? "->" : "  ";
      console.log(`  ${mark} ${set.id}  ${set.name}`);
    }
    console.log("Force un autre avec --set=<id>.");
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

  // Logo du set, utilise comme visuel de serie. tcgdex renvoie une URL sans
  // extension : il faut l'ajouter, et le format varie selon les sets.
  if (setData.logo && !existsSync(SERIE_LOGO)) {
    let logoOk = false;

    for (const ext of ["webp", "png"]) {
      try {
        await downloadImage(`${setData.logo}.${ext}`, SERIE_LOGO);
        console.log(`\nLogo de serie : public/series/ME/30ans.webp (${ext})`);
        logoOk = true;
        break;
      } catch {
        // Format suivant.
      }
    }

    if (!logoOk) {
      console.log(
        `\nLogo de serie introuvable. Depose-le toi-meme dans` +
          ` public/series/ME/30ans.webp`,
      );
    }
  }

  // Le detail de chaque carte porte sa rarete et, surtout, l'URL reelle de son
  // visuel. Reconstruire cette URL a la main echoue des que le set range ses
  // assets autrement : on interroge donc les details avant de telecharger.
  console.log(`\nRecuperation des details FR`);

  const details = new Map();
  await runPool(
    cards,
    async (card) => {
      const full = await fetchJson(`${API}/cards/${card.id}`);
      details.set(card.id, full);
    },
    CONCURRENCY,
  );

  console.log(`\nTelechargement des visuels FR dans public/cartes/${SERIE_ID}/`);

  const missingImages = [];
  let ok = 0;
  let skipped = 0;

  await runPool(
    cards,
    async (card) => {
      const dest = resolve(SERIE_DIR, `${card.localId}.webp`);
      const base = details.get(card.id)?.image;
      const urls = base
        ? [`${base}/high.webp`, `${base}/high.png`]
        : [`${ASSETS}/${serieSegment}/${setId}/${card.localId}/high.webp`];

      for (const url of urls) {
        try {
          const state = await downloadImage(url, dest);
          if (state === "downloaded") ok++;
          else skipped++;
          return;
        } catch {
          // Format suivant.
        }
      }

      missingImages.push({ localId: card.localId, name: card.name });
      throw new Error(`${card.localId} (${card.name}) : visuel FR introuvable`);
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

  // Les 30 Pikachu anniversaire portent, en plus du numero de set, une seconde
  // numerotation 01/30 a 30/30 imprimee a droite du code du set. On ne l'applique
  // que si on en trouve exactement 30 : sinon la detection est douteuse et il
  // vaut mieux ne rien inventer. "Pikachu-ex" est exclu par l'egalite stricte.
  const pikachuIds = cards
    .filter((card) => (details.get(card.id)?.name ?? card.name) === "Pikachu")
    .map((card) => card.id);
  const pikachuRank = new Map();

  if (pikachuIds.length === 30) {
    pikachuIds.forEach((id, index) => pikachuRank.set(id, index + 1));
  } else if (pikachuIds.length > 0) {
    console.log(
      `\nATTENTION : ${pikachuIds.length} Pikachu trouves au lieu de 30.\n` +
        `La seconde numerotation 01/30 n'a pas ete appliquee.`,
    );
  }

  for (const card of cards) {
    const full = details.get(card.id);
    const localId = card.localId;
    const rarity = full?.rarity ?? "Commune";
    const name = full?.name ?? card.name ?? "Carte inconnue";
    const rank = pikachuRank.get(card.id);
    const baseNumber = `${String(localId).padStart(3, "0")}/${String(totalInSet).padStart(3, "0")}`;
    const number = rank
      ? `${baseNumber} (${String(rank).padStart(2, "0")}/30)`
      : baseNumber;
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

  // Set promo optionnel : ses cartes rejoignent la meme serie, avec un id et un
  // nom de fichier prefixes pour ne pas entrer en collision avec le set principal.
  let promoCount = 0;

  if (promoSet) {
    if (promoSet.includes("<") || promoSet.includes(">")) {
      throw new Error(
        `--promos=${promoSet} : remplace cet exemple par un vrai identifiant, ` +
          `par exemple --promos=30th-c`,
      );
    }

    console.log(`\n=== Set promo ${promoSet} ===`);

    const promoData = await fetchJson(`${API}/sets/${promoSet}`);
    const promoCards = promoData.cards ?? [];
    const promoTotal = promoData.cardCount?.official ?? promoCards.length;
    const promoSegment = promoData.serie?.id ?? serieSegment;

    console.log(`${promoCards.length} cartes promo.`);

    const promoDetails = new Map();
    await runPool(
      promoCards,
      async (card) => {
        promoDetails.set(card.id, await fetchJson(`${API}/cards/${card.id}`));
      },
      CONCURRENCY,
    );

    await runPool(
      promoCards,
      async (card) => {
        const dest = resolve(SERIE_DIR, `p${card.localId}.webp`);
        const base = promoDetails.get(card.id)?.image;
        const urls = base
          ? [`${base}/high.webp`, `${base}/high.png`]
          : [`${ASSETS}/${promoSegment}/${promoSet}/${card.localId}/high.webp`];

        for (const url of urls) {
          try {
            const state = await downloadImage(url, dest);
            if (state === "downloaded") ok++;
            else skipped++;
            return;
          } catch {
            // Format suivant.
          }
        }

        missingImages.push({ localId: `p${card.localId}`, name: card.name });
        throw new Error(`${card.localId} (${card.name}) : visuel FR introuvable`);
      },
      CONCURRENCY,
    );

    for (const card of promoCards) {
      const full = promoDetails.get(card.id);
      const localId = card.localId;
      const rarity = full?.rarity ?? "Promo";
      const name = full?.name ?? card.name ?? "Carte inconnue";
      const withReverse = hasReverse(rarity);

      rarities.set(rarity, (rarities.get(rarity) ?? 0) + 1);
      if (withReverse) withReverseCount++;
      promoCount++;

      lines.push(
        cardEntry({
          id: `${SERIE_ID}-p${String(localId).padStart(3, "0")}`,
          name,
          number: `${String(localId).padStart(3, "0")}/${String(promoTotal).padStart(3, "0")}`,
          rarity,
          image: `/cartes/${SERIE_ID}/p${localId}.webp`,
          withReverse,
        }),
      );
    }
  }

  lines.push(`] as const) as readonly Card[];`, ``);

  mkdirSync(dirname(OUT_FILE), { recursive: true });
  writeFileSync(OUT_FILE, lines.join("\n"), "utf8");

  console.log(`\n=== TERMINE ===`);
  console.log(`Fichier : ${OUT_FILE}`);
  console.log(
    `Cartes  : ${cards.length + promoCount} dont ${promoCount} promo (avec Reverse : ${withReverseCount})`,
  );
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
