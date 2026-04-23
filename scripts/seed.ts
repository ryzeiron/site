/**
 * Seed script: import all CARDS from lib/catalog.ts into the database.
 * Usage:  npx tsx scripts/seed.ts
 * Env:    POSTGRES_URL must be set (pull from Vercel with `vercel env pull .env.local`).
 */

import { config } from "dotenv";
config({ path: ".env.local" });
config({ path: ".env" });

import { db } from "../lib/db/client";
import { cards as cardsTable } from "../lib/db/schema";
import { CARDS } from "../lib/catalog";

async function main() {
  console.log(`Seeding ${CARDS.length} cards...`);

  const rows = CARDS.map((c) => ({
    id: c.id,
    serieId: c.serieId,
    name: c.name,
    number: c.number,
    rarity: c.rarity,
    condition: c.condition,
    language: c.language,
    price: c.price,
    stock: c.stock,
    image: c.image ?? null,
    description: c.description ?? null,
    altRarity: c.altVariant?.rarity ?? null,
    altPrice: c.altVariant?.price ?? null,
    altStock: c.altVariant?.stock ?? null,
  }));

  // Insert only: if a card already exists in DB, don't touch it
  // (to preserve stock/price edits made via the admin page).
  const CHUNK = 500;
  for (let i = 0; i < rows.length; i += CHUNK) {
    const chunk = rows.slice(i, i + CHUNK);
    await db.insert(cardsTable).values(chunk).onConflictDoNothing();
    console.log(`  ${Math.min(i + CHUNK, rows.length)}/${rows.length}`);
  }

  console.log("Done.");
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
