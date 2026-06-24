CREATE TABLE IF NOT EXISTS "order_analytics" (
  "order_id" text PRIMARY KEY NOT NULL,
  "stripe_session_id" text NOT NULL,
  "amount_subtotal_euros" numeric(10, 2),
  "amount_total_euros" numeric(10, 2),
  "shipping_total_euros" numeric(10, 2),
  "discount_total_euros" numeric(10, 2),
  "currency" text DEFAULT 'eur' NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS "order_analytics_created_at_idx"
  ON "order_analytics" ("created_at");

ALTER TABLE "order_analytics"
  ADD COLUMN IF NOT EXISTS "amount_subtotal_euros" numeric(10, 2),
  ADD COLUMN IF NOT EXISTS "amount_total_euros" numeric(10, 2),
  ADD COLUMN IF NOT EXISTS "shipping_total_euros" numeric(10, 2),
  ADD COLUMN IF NOT EXISTS "discount_total_euros" numeric(10, 2);

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_name = 'order_analytics'
      AND column_name = 'amount_subtotal_cents'
  ) THEN
    EXECUTE '
      UPDATE "order_analytics"
      SET
        "amount_subtotal_euros" = COALESCE("amount_subtotal_euros", ROUND("amount_subtotal_cents"::numeric / 100, 2)),
        "amount_total_euros" = COALESCE("amount_total_euros", ROUND("amount_total_cents"::numeric / 100, 2)),
        "shipping_total_euros" = COALESCE("shipping_total_euros", ROUND("shipping_total_cents"::numeric / 100, 2)),
        "discount_total_euros" = COALESCE("discount_total_euros", ROUND("discount_total_cents"::numeric / 100, 2))
    ';
  END IF;
END $$;

ALTER TABLE "order_analytics"
  DROP COLUMN IF EXISTS "amount_subtotal_cents",
  DROP COLUMN IF EXISTS "amount_total_cents",
  DROP COLUMN IF EXISTS "shipping_total_cents",
  DROP COLUMN IF EXISTS "discount_total_cents";
