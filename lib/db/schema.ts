import { sql } from "drizzle-orm";
import { integer, pgTable, real, text } from "drizzle-orm/pg-core";

export const cards = pgTable("cards", {
  id: text("id").primaryKey(),
  serieId: text("serie_id").notNull(),
  name: text("name").notNull(),
  number: text("number").notNull(),
  rarity: text("rarity").notNull(),
  condition: text("condition").notNull(),
  language: text("language").notNull(),
  price: real("price").notNull(),
  stock: integer("stock").notNull().default(0),
  image: text("image"),
  description: text("description"),
  altRarity: text("alt_rarity"),
  altPrice: real("alt_price"),
  altStock: integer("alt_stock"),
  updatedAt: text("updated_at").notNull().default(sql`now()`),
});

export type DbCard = typeof cards.$inferSelect;
