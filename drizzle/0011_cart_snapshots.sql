CREATE TABLE IF NOT EXISTS "cart_snapshots" (
  "cart_id" text PRIMARY KEY NOT NULL,
  "user_id" text,
  "user_email" text,
  "user_name" text,
  "item_count" integer DEFAULT 0 NOT NULL,
  "total_cents" integer DEFAULT 0 NOT NULL,
  "items" jsonb DEFAULT '[]'::jsonb NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS "cart_snapshots_updated_at_idx"
  ON "cart_snapshots" ("updated_at");

CREATE INDEX IF NOT EXISTS "cart_snapshots_user_id_idx"
  ON "cart_snapshots" ("user_id");
