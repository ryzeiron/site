import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import type { Config } from "drizzle-kit";

// drizzle-kit ne lit pas .env.local, contrairement a Next.js : sans ca il faut
// redefinir DATABASE_URL dans le shell a chaque appel.
function readEnvFile(key: string): string | null {
  for (const fileName of [".env.local", ".env"]) {
    const filePath = resolve(process.cwd(), fileName);
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

const url =
  process.env.DATABASE_URL?.trim() || readEnvFile("DATABASE_URL") || "";

if (!url) {
  throw new Error(
    "DATABASE_URL introuvable.\n" +
      "Ajoute-la dans un fichier .env.local a la racine du projet :\n" +
      "  DATABASE_URL=postgresql://user:motdepasse@host/dbname?sslmode=require",
  );
}

export default {
  schema: "./lib/db/schema.ts",
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: { url },
} satisfies Config;
