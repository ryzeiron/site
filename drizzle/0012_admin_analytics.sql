CREATE TABLE IF NOT EXISTS "order_analytics" (
  "order_id" text PRIMARY KEY NOT NULL,
  "stripe_session_id" text NOT NULL,
  "amount_subtotal_cents" integer,
  "amount_total_cents" integer,
  "shipping_total_cents" integer,
  "discount_total_cents" integer,
  "currency" text DEFAULT 'eur' NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS "order_analytics_created_at_idx"
  ON "order_analytics" ("created_at");

CREATE TABLE IF NOT EXISTS "active_visitors" (
  "visitor_id" text PRIMARY KEY NOT NULL,
  "user_id" text,
  "user_email" text,
  "path" text,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "last_seen_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS "active_visitors_last_seen_at_idx"
  ON "active_visitors" ("last_seen_at");
