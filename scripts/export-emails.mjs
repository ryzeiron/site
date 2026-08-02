// Exporte les emails des comptes clients au format CSV Resend.
//
// Usage : node scripts/export-emails.mjs
//
// Necessite DATABASE_URL. Genere contacts-resend.csv a la racine du projet,
// pret a etre importe dans Resend (Audiences -> Import CSV).

import { writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { neon } from "@neondatabase/serverless";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "..");
const OUT_FILE = resolve(ROOT, "contacts-resend.csv");

// Comptes internes, jamais exportes.
const EXCLUDED_EMAILS = [
  "del6.2pokemon@gmail.com",
  "antoningiolda@gmail.com",
];

const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
  console.error(
    "DATABASE_URL manquante.\n" +
      'PowerShell : $env:DATABASE_URL="postgresql://..."\n' +
      'bash      : export DATABASE_URL="postgresql://..."',
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
