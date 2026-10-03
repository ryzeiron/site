CREATE TABLE IF NOT EXISTS "custom_cards" (
  "card_id" text PRIMARY KEY NOT NULL,
  "serie_id" text NOT NULL,
  "name" text NOT NULL,
  "number" text NOT NULL,
  "rarity" text NOT NULL,
  "price_cents" integer DEFAULT 0 NOT NULL,
  "stock" integer DEFAULT 0 NOT NULL,
  "image" text,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS "custom_cards_serie_id_idx"
  ON "custom_cards" ("serie_id");
