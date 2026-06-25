import fs from "node:fs";
import path from "node:path";

const cardsDir = path.join(process.cwd(), "lib", "catalog", "cards");
const dryRun = process.argv.includes("--check");

const CARD_LINE_RE =
  /^\s*\{.*?\bid:\s*"([^"]+)".*?\bserieId:\s*"([^"]+)".*?\bnumber:\s*"([^"]+)".*?\brarity:\s*"([^"]+)"/;

const NUMERIC_NUMBER_RE = /^(\d+)\/(\d+)$/;
const PREFIXED_NUMBER_RE = /^([A-Z]+)(\d+)\/([A-Z]+)(\d+)$/;
const PREFIXED_NUMERIC_TOTAL_RE = /^([A-Z]+)(\d+)\/(\d+)$/;
const BASE_TOTAL_OVERRIDES = new Map([
  ["me03", 88],
  ["nb01", 114],
  ["sl11.5", 68],
]);

const files = fs
  .readdirSync(cardsDir)
  .filter((file) => file.endsWith(".ts"))
  .sort();

/** @type {Map<string, {cards: Array<{file: string, lineIndex: number, id: string, number: string, rarity: string}>, denominators: Map<number, number>, maxNonSecret: number, maxAll: number, secretCount: number}>} */
const series = new Map();

for (const file of files) {
  const filePath = path.join(cardsDir, file);
  const lines = fs.readFileSync(filePath, "utf8").split(/\r?\n/);

  lines.forEach((line, lineIndex) => {
    const match = line.match(CARD_LINE_RE);
    if (!match) return;

    const [, id, serieId, number, rarity] = match;
    const serie =
      series.get(serieId) ??
      {
        cards: [],
        denominators: new Map(),
        maxNonSecret: 0,
        maxAll: 0,
        secretCount: 0,
      };

    serie.cards.push({ file, lineIndex, id, number, rarity });

    const numericMatch = number.match(NUMERIC_NUMBER_RE);
    if (numericMatch) {
      const numerator = Number(numericMatch[1]);
      const denominator = Number(numericMatch[2]);
      serie.denominators.set(
        denominator,
        (serie.denominators.get(denominator) ?? 0) + 1,
      );
      serie.maxAll = Math.max(serie.maxAll, numerator);

      if (rarity === "Secrete") {
        serie.secretCount += 1;
      } else {
        serie.maxNonSecret = Math.max(serie.maxNonSecret, numerator);
      }
    }

    series.set(serieId, serie);
  });
}

const baseTotals = new Map();
const suspiciousSeries = [];

for (const [serieId, serie] of series) {
  if (serie.denominators.size === 0) continue;

  const denominators = [...serie.denominators.entries()].sort(
    (a, b) => b[1] - a[1],
  );
  const mostUsedDenominator = denominators[0][0];
  let baseTotal = BASE_TOTAL_OVERRIDES.get(serieId) ?? mostUsedDenominator;

  if (
    serie.secretCount > 0 &&
    serie.maxNonSecret > 0 &&
    mostUsedDenominator > serie.maxNonSecret &&
    mostUsedDenominator === serie.maxAll
  ) {
    baseTotal = BASE_TOTAL_OVERRIDES.get(serieId) ?? serie.maxNonSecret;
    suspiciousSeries.push({
      serieId,
      from: mostUsedDenominator,
      to: baseTotal,
      secrets: serie.secretCount,
    });
  }

  baseTotals.set(serieId, baseTotal);
}

const changesByFile = new Map();
const sampleChanges = [];
let changeCount = 0;

for (const [serieId, serie] of series) {
  const baseTotal = baseTotals.get(serieId);

  for (const card of serie.cards) {
    const nextNumber = normalizeNumber(card.number, baseTotal);
    if (!nextNumber || nextNumber === card.number) continue;

    const filePath = path.join(cardsDir, card.file);
    const lines =
      changesByFile.get(filePath) ??
      fs.readFileSync(filePath, "utf8").split(/\r?\n/);
    const previousLine = lines[card.lineIndex];

    lines[card.lineIndex] = previousLine.replace(
      `number: "${card.number}"`,
      `number: "${nextNumber}"`,
    );
    changesByFile.set(filePath, lines);
    changeCount += 1;

    if (sampleChanges.length < 40) {
      sampleChanges.push({
        serieId,
        id: card.id,
        from: card.number,
        to: nextNumber,
      });
    }
  }
}

if (!dryRun) {
  for (const [filePath, lines] of changesByFile) {
    fs.writeFileSync(filePath, lines.join("\n"), "utf8");
  }
}

console.log(
  JSON.stringify(
    {
      mode: dryRun ? "check" : "write",
      filesChanged: changesByFile.size,
      changedNumbers: changeCount,
      suspiciousSeries,
      sampleChanges,
    },
    null,
    2,
  ),
);

function normalizeNumber(value, baseTotal) {
  const numeric = value.match(NUMERIC_NUMBER_RE);
  if (numeric && baseTotal) {
    const numerator = Number(numeric[1]);
    const width = Math.max(3, String(baseTotal).length, String(numerator).length);

    return `${String(numerator).padStart(width, "0")}/${String(baseTotal).padStart(width, "0")}`;
  }

  const prefixed = value.match(PREFIXED_NUMBER_RE);
  if (prefixed && prefixed[1] === prefixed[3]) {
    const [, prefix, rawNumerator, , rawDenominator] = prefixed;
    const numerator = Number(rawNumerator);
    const denominator = Number(rawDenominator);
    const width = Math.max(
      3,
      String(numerator).length,
      String(denominator).length,
    );

    return `${prefix}${String(numerator).padStart(width, "0")}/${prefix}${String(denominator).padStart(width, "0")}`;
  }

  const prefixedNumericTotal = value.match(PREFIXED_NUMERIC_TOTAL_RE);
  if (prefixedNumericTotal && prefixedNumericTotal[1] === "SV") {
    const [, prefix, rawNumerator, rawDenominator] = prefixedNumericTotal;
    const numerator = Number(rawNumerator);
    const denominator = Number(rawDenominator);
    const width = Math.max(
      3,
      String(numerator).length,
      String(denominator).length,
    );

    return `${prefix}${String(numerator).padStart(width, "0")}/${prefix}${String(denominator).padStart(width, "0")}`;
  }

  return null;
}
