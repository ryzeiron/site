CREATE TABLE IF NOT EXISTS "user_discounts" (
  "id" text PRIMARY KEY NOT NULL,
  "user_id" text NOT NULL,
  "type" text NOT NULL,
  "percent" integer,
  "amount_off_cents" integer,
  "note" text,
  "status" text DEFAULT 'active' NOT NULL,
  "order_id" text,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "used_at" timestamp with time zone
);

CREATE INDEX IF NOT EXISTS "user_discounts_user_id_idx"
  ON "user_discounts" ("user_id");

CREATE INDEX IF NOT EXISTS "user_discounts_status_idx"
  ON "user_discounts" ("status");
