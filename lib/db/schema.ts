import { integer, pgTable, primaryKey, text, timestamp } from "drizzle-orm/pg-core";

export const stockOverrides = pgTable(
  "stock_overrides",
  {
    cardId: text("card_id").notNull(),
    variant: text("variant").notNull(),
    stock: integer("stock").notNull(),
    priceCents: integer("price_cents"),
    rarity: text("rarity"),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [primaryKey({ columns: [t.cardId, t.variant] })],
);

export const processedEvents = pgTable("processed_events", {
  eventId: text("event_id").primaryKey(),
  processedAt: timestamp("processed_at", { withTimezone: true }).notNull().defaultNow(),
});

export const cardOverrides = pgTable("card_overrides", {
  cardId: text("card_id").primaryKey(),
  name: text("name"),
  image: text("image"),
  imageBack: text("image_back"),
  description: text("description"),
  weightGrams: integer("weight_grams"),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});
