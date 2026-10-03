// Recupere les visuels manquants de la serie 30 ans depuis une source externe,
// quand tcgdex ne les fournit pas en francais.
//
// Usage :
//   npm run fetch:30ans -- --pattern="https://.../{n}.jpg" --prefix=p --from=1 --to=30
//
// {n}   est remplace par le numero sans zeros,  1, 2, 30
// {nnn} est remplace par le numero sur 3 chiffres, 001, 002, 030
//
// Les fichiers deja presents ne sont jamais ecrases.

import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { Buffer } from "node:buffer";

const __dirname = dirname(fileURLToPath(import.meta.url));
const SERIE_DIR = resolve(__dirname, "..", "public/cartes/30ans");

function arg(name, fallback) {
  const found = process.argv.find((a) => a.startsWith(`--${name}=`));
  return found ? found.slice(name.length + 3).trim() : fallback;
}

// Motif suppose pour Pokecardex. A corriger si la structure differe : c'est la
// seule ligne a changer.
const pattern = arg(
  "pattern",
  "https://www.pokecardex.com/assets/images/sets/30C/HD/{n}.jpg",
);
const prefix = arg("prefix", "p");
const from = Number.parseInt(arg("from", "1"), 10);
const to = Number.parseInt(arg("to", "30"), 10);
const listArg = arg("list", "");

if (!pattern.includes("{n}") && !pattern.includes("{nnn}")) {
  console.error(
    "Le motif doit contenir {n} ou {nnn} a la place du numero de carte.\n" +
      `Recu : ${pattern}`,
  );
  process.exit(1);
}

// --list=R,G,B permet de viser des identifiants non numeriques.
const targets = listArg
  ? listArg.split(",").map((v) => v.trim()).filter(Boolean)
  : Array.from({ length: to - from + 1 }, (_, i) => String(from + i));

async function download(url, dest) {
  const res = await fetch(url, {
    // Certains hebergeurs refusent les requetes sans navigateur declare.
    headers: {
      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120 Safari/537.36",
      Accept: "image/avif,image/webp,image/*,*/*;q=0.8",
    },
  });

  if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);

  const buffer = Buffer.from(await res.arrayBuffer());
  if (buffer.length < 1024) {
    throw new Error(`reponse trop petite (${buffer.length} octets)`);
  }

  mkdirSync(dirname(dest), { recursive: true });
  writeFileSync(dest, buffer);
  return buffer.length;
}

(async () => {
  mkdirSync(SERIE_DIR, { recursive: true });
  console.log(`Motif   : ${pattern}`);
  console.log(`Cibles  : ${targets.length} fichier(s), prefixe "${prefix}"\n`);

  let ok = 0;
  let skipped = 0;
  const failed = [];

  for (const target of targets) {
    const padded = /^\d+$/.test(target)
      ? String(target).padStart(3, "0")
      : target;
    const dest = resolve(SERIE_DIR, `${prefix}${padded}.webp`);

    if (existsSync(dest)) {
      skipped++;
      continue;
    }

    const url = pattern
      .replace("{nnn}", padded)
      .replace("{n}", String(target).replace(/^0+(?=\d)/, ""));

    try {
      const size = await download(url, dest);
      ok++;
      console.log(`  OK   ${prefix}${padded}  ${Math.round(size / 1024)} Ko`);
    } catch (e) {
      failed.push({ target: padded, url, message: e.message });
      console.log(`  ECHEC ${prefix}${padded}  ${e.message}`);
    }
  }

  console.log(`\n=== TERMINE ===`);
  console.log(`${ok} telecharges, ${skipped} deja presents, ${failed.length} echecs`);

  if (failed.length > 0) {
    console.log(`\nURL tentee pour la premiere en echec :`);
    console.log(`  ${failed[0].url}`);
    console.log(
      `\nSi cette URL ne correspond pas a ce que tu vois sur le site source,\n` +
        `relance avec le bon motif :\n` +
        `  npm run fetch:30ans -- --pattern="https://.../{n}.jpg"`,
    );
  }
})().catch((e) => {
  console.error(`\nErreur : ${e.message}`);
  process.exit(1);
});
