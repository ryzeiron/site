ALTER TABLE "users"
  ADD COLUMN IF NOT EXISTS "points_balance" integer DEFAULT 0 NOT NULL;

CREATE TABLE IF NOT EXISTS "loyalty_ledger" (
  "id" text PRIMARY KEY NOT NULL,
  "user_id" text NOT NULL,
  "order_id" text,
  "delta" integer NOT NULL,
  "reason" text NOT NULL,
  "balance_after" integer NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS "loyalty_ledger_user_id_idx"
  ON "loyalty_ledger" ("user_id");

CREATE INDEX IF NOT EXISTS "loyalty_ledger_created_at_idx"
  ON "loyalty_ledger" ("created_at");

CREATE UNIQUE INDEX IF NOT EXISTS "loyalty_ledger_user_order_reason_unique_idx"
  ON "loyalty_ledger" ("user_id", "order_id", "reason")
  WHERE "order_id" IS NOT NULL;
