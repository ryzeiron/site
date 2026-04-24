import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import * as schema from "./schema";

let dbSingleton: ReturnType<typeof drizzle<typeof schema>> | null = null;

export function getDb() {
  if (!dbSingleton) {
    const url = process.env.DATABASE_URL;
    if (!url) {
      throw new Error(
        "DATABASE_URL manquante. Ajoute-la dans .env.local ou sur Vercel.",
      );
    }
    const sql = neon(url);
    dbSingleton = drizzle(sql, { schema });
  }
  return dbSingleton;
}
