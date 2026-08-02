// Exporte les emails des comptes clients au format CSV Resend.
//
// Usage : node scripts/export-emails.mjs
//
// Necessite DATABASE_URL. Genere contacts-resend.csv a la racine du projet,
// pret a etre importe dans Resend (Audiences -> Import CSV).

import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { neon } from "@neondatabase/serverless";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "..");
const OUT_FILE = resolve(ROOT, "contacts-resend.csv");

// Recupere une variable dans .env.local puis .env, pour eviter d'avoir a la
// definir dans le shell a chaque execution.
function readEnvFile(key) {
  for (const fileName of [".env.local", ".env"]) {
    const filePath = resolve(ROOT, fileName);
    if (!existsSync(filePath)) continue;

    for (const rawLine of readFileSync(filePath, "utf8").split(/\r?\n/)) {
      const line = rawLine.trim();
      if (!line || line.startsWith("#")) continue;

      const separator = line.indexOf("=");
      if (separator === -1) continue;
      if (line.slice(0, separator).trim() !== key) continue;

      // Les guillemets encadrants sont une syntaxe de fichier, pas la valeur.
      return line
        .slice(separator + 1)
        .trim()
        .replace(/^["']|["']$/g, "");
    }
  }

  return null;
}

// Comptes internes, jamais exportes.
const EXCLUDED_EMAILS = [
  "del6.2pokemon@gmail.com",
  "antoningiolda@gmail.com",
];

// L'environnement du shell est prioritaire sur les fichiers : on retient d'ou
// vient la valeur, sinon une variable oubliee dans le terminal masque .env.local
// sans que rien ne l'indique.
const envValue = process.env.DATABASE_URL?.trim();
const fileValue = envValue ? null : readEnvFile("DATABASE_URL");
const DATABASE_URL = (envValue || fileValue || "").replace(/^["']|["']$/g, "");
const SOURCE = envValue
  ? "la variable d'environnement du shell"
  : fileValue
    ? "le fichier .env.local"
    : "aucune source";

if (!DATABASE_URL) {
  console.error(
    "DATABASE_URL introuvable.\n\n" +
      "Ajoute-la dans un fichier .env.local a la racine du projet :\n" +
      "  DATABASE_URL=postgresql://user:motdepasse@host/dbname?sslmode=require\n\n" +
      "Ou definis-la dans le shell :\n" +
      '  PowerShell : $env:DATABASE_URL="postgresql://..."   (guillemets obligatoires)\n' +
      '  bash       : export DATABASE_URL="postgresql://..."',
  );
  process.exit(1);
}

if (!/^postgres(ql)?:\/\/.+@.+\/.+/.test(DATABASE_URL)) {
  console.error(
    "DATABASE_URL est definie mais mal formee.\n\n" +
      `Source     : ${SOURCE}\n` +
      `Valeur lue : ${DATABASE_URL}\n\n` +
      "Format attendu :\n" +
      "  postgresql://user:motdepasse@host.tld/dbname?sslmode=require\n\n" +
      (envValue
        ? "La valeur vient du shell, pas de .env.local : une variable definie\n" +
          "plus tot dans ce terminal masque le fichier. Supprime-la avec\n" +
          "  Remove-Item Env:DATABASE_URL\n" +
          "ou ouvre simplement un nouveau terminal, puis relance.\n"
        : "Remplace la valeur du fichier par la vraie URL de connexion Neon,\n" +
          "copiee depuis la console Neon ou depuis Vercel. Les points de\n" +
          "suspension d'un exemple ne sont pas une URL valide.\n"),
  );
  process.exit(1);
}

// Une valeur CSV doit etre quotee des qu'elle contient une virgule, un guillemet
// ou un retour a la ligne ; les guillemets internes se doublent.
function csvCell(value) {
  const text = String(value ?? "").trim();
  if (!/[",\r\n]/.test(text)) return text;
  return `"${text.replace(/"/g, '""')}"`;
}

// Resend attend un prenom et un nom separes : on coupe sur le premier espace.
function splitName(name) {
  const clean = String(name ?? "").trim().replace(/\s+/g, " ");
  if (!clean) return { firstName: "", lastName: "" };

  const spaceIndex = clean.indexOf(" ");
  if (spaceIndex === -1) return { firstName: clean, lastName: "" };

  return {
    firstName: clean.slice(0, spaceIndex),
    lastName: clean.slice(spaceIndex + 1),
  };
}

(async () => {
  const sql = neon(DATABASE_URL);
  const excluded = EXCLUDED_EMAILS.map((email) => email.toLowerCase());

  const rows = await sql`
    SELECT email, name
    FROM users
    ORDER BY created_at ASC
  `;

  const seen = new Set();
  const contacts = [];
  let skippedInternal = 0;
  let skippedDuplicate = 0;
  let skippedInvalid = 0;

  for (const row of rows) {
    const email = String(row.email ?? "").trim().toLowerCase();

    if (!email || !email.includes("@")) {
      skippedInvalid += 1;
      continue;
    }
    if (excluded.includes(email)) {
      skippedInternal += 1;
      continue;
    }
    if (seen.has(email)) {
      skippedDuplicate += 1;
      continue;
    }

    seen.add(email);
    const { firstName, lastName } = splitName(row.name);
    contacts.push({ email, firstName, lastName });
  }

  const lines = ["email,first_name,last_name"];
  for (const contact of contacts) {
    lines.push(
      [
        csvCell(contact.email),
        csvCell(contact.firstName),
        csvCell(contact.lastName),
      ].join(","),
    );
  }

  writeFileSync(OUT_FILE, `${lines.join("\n")}\n`, "utf8");

  console.log(`\nFichier : ${OUT_FILE}`);
  console.log(`Contacts exportes : ${contacts.length}`);
  console.log(`Comptes lus       : ${rows.length}`);
  console.log(`Ignores - internes  : ${skippedInternal}`);
  console.log(`Ignores - doublons  : ${skippedDuplicate}`);
  console.log(`Ignores - invalides : ${skippedInvalid}`);
  console.log(
    `\nImporte ce fichier dans Resend : Audiences -> ton audience -> Import CSV.`,
  );
})().catch((e) => {
  console.error(`Erreur : ${e.message}`);
  process.exit(1);
});
