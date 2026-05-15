import fs from "node:fs";
import https from "node:https";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, "..");
const catalogPath = path.join(rootDir, "lib", "catalog", "cards", "diamant-et-perle.ts");
const publicCartesDir = path.join(rootDir, "public", "cartes");

const force = process.argv.includes("--force");
const limitArg = process.argv.find((arg) => arg.startsWith("--limit="));
const limit = limitArg ? Number(limitArg.split("=")[1]) : Number.POSITIVE_INFINITY;

function cardSlug(localId) {
  return /^\d+$/.test(localId) ? localId.padStart(3, "0") : localId.toLowerCase();
}

function parseEntries(raw) {
  return raw
    .trim()
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => line.split("|")[0].trim());
}

function readCatalog() {
  const source = fs.readFileSync(catalogPath, "utf8");
  const entryBlocks = new Map();
  const blockRegex = /const\s+([A-Z0-9_]+)\s*=\s*parseEntries\(`([\s\S]*?)`\);/g;
  const callRegex = /\.\.\.makeCards\("([^"]+)",\s*"([^"]+)",\s*"([^"]+)",\s*\d+,\s*([A-Z0-9_]+)\)/g;

  for (const match of source.matchAll(blockRegex)) {
    entryBlocks.set(match[1], parseEntries(match[2]));
  }

  const cards = [];

  for (const match of source.matchAll(callRegex)) {
    const [, serieId, prefix, setCode, blockName] = match;
    const localIds = entryBlocks.get(blockName);

    if (!localIds) {
      throw new Error(`Liste introuvable dans le catalogue: ${blockName}`);
    }

    for (const localId of localIds) {
      cards.push({ serieId, prefix, setCode, localId });
    }
  }

  return cards;
}

function sourceUrls({ setCode, localId }) {
  const fileName = `${setCode}_FR_${localId}.png`;
  const assetPath = `static-assets/content-assets/cms2-fr-fr/img/cards/web/${setCode}/${fileName}`;

  return [
    `https://assets.pokemon.com/${assetPath}`,
    `https://www.pokemon.com/${assetPath}`,
  ];
}

function request(url, redirects = 0) {
  return new Promise((resolve, reject) => {
    const req = https.get(
      url,
      {
        headers: {
          "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
        },
      },
      (res) => {
        if (
          res.statusCode &&
          res.statusCode >= 300 &&
          res.statusCode < 400 &&
          res.headers.location &&
          redirects < 5
        ) {
          res.resume();
          resolve(request(new URL(res.headers.location, url).toString(), redirects + 1));
          return;
        }

        if (res.statusCode !== 200) {
          res.resume();
          reject(new Error(`HTTP ${res.statusCode}`));
          return;
        }

        const chunks = [];
        res.on("data", (chunk) => chunks.push(chunk));
        res.on("end", () => resolve(Buffer.concat(chunks)));
      },
    );

    req.setTimeout(30000, () => {
      req.destroy(new Error("Timeout"));
    });
    req.on("error", reject);
  });
}

async function downloadCard(card) {
  const outputDir = path.join(publicCartesDir, card.prefix);
  const outputPath = path.join(outputDir, `${cardSlug(card.localId)}.png`);

  if (!force && fs.existsSync(outputPath) && fs.statSync(outputPath).size > 0) {
    return { status: "skipped", card, outputPath };
  }

  fs.mkdirSync(outputDir, { recursive: true });

  const errors = [];

  for (const url of sourceUrls(card)) {
    try {
      const data = await request(url);

      if (data.length === 0) {
        throw new Error("Fichier vide");
      }

      const tmpPath = `${outputPath}.tmp`;
      fs.writeFileSync(tmpPath, data);
      fs.renameSync(tmpPath, outputPath);

      return { status: "downloaded", card, outputPath, url };
    } catch (error) {
      errors.push(`${url} -> ${error.message}`);
    }
  }

  return { status: "missing", card, outputPath, errors };
}

async function main() {
  const cards = readCatalog().slice(0, limit);
  const missing = [];
  let downloaded = 0;
  let skipped = 0;

  console.log(`Images a verifier: ${cards.length}`);

  for (let index = 0; index < cards.length; index += 1) {
    const result = await downloadCard(cards[index]);

    if (result.status === "downloaded") {
      downloaded += 1;
      console.log(
        `[OK] ${result.card.serieId} ${result.card.localId} -> ${path.relative(rootDir, result.outputPath)}`,
      );
    } else if (result.status === "skipped") {
      skipped += 1;
    } else {
      missing.push(result);
      console.log(`[MANQUANTE] ${result.card.serieId} ${result.card.localId}`);
    }
  }

  if (missing.length > 0) {
    const reportPath = path.join(publicCartesDir, "diamant-et-perle-images-manquantes.txt");
    const report = missing
      .map((item) => {
        return [
          `${item.card.serieId} ${item.card.localId}`,
          `destination: ${path.relative(rootDir, item.outputPath)}`,
          ...item.errors.map((error) => `  ${error}`),
        ].join("\n");
      })
      .join("\n\n");

    fs.mkdirSync(publicCartesDir, { recursive: true });
    fs.writeFileSync(reportPath, `${report}\n`, "utf8");
  }

  console.log("");
  console.log(`Telechargees: ${downloaded}`);
  console.log(`Deja presentes: ${skipped}`);
  console.log(`Manquantes: ${missing.length}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
