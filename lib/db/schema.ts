import { integer, pgTable, primaryKey, text, timestamp } from "drizzle-orm/pg-core";

export const stockOverrides = pgTable(
  "stock_overrides",
  {
    cardId: text("card_id").notNull(),
    variant: text("variant").notNull(),
    stock: integer("stock").notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [primaryKey({ columns: [t.cardId, t.variant] })],
);

export const processedEvents = pgTable("processed_events", {
  eventId: text("event_id").primaryKey(),
  processedAt: timestamp("processed_at", { withTimezone: true }).notNull().defaultNow(),
});
