CREATE TABLE IF NOT EXISTS "user_delivery_profiles" (
  "user_id" text PRIMARY KEY,
  "first_name" text,
  "last_name" text,
  "phone" text,
  "address" text,
  "postcode" text,
  "city" text,
  "country" text NOT NULL DEFAULT 'FR',
  "relay_code" text,
  "relay_name" text,
  "relay_address" text,
  "relay_postcode" text,
  "relay_city" text,
  "created_at" timestamp with time zone NOT NULL DEFAULT now(),
  "updated_at" timestamp with time zone NOT NULL DEFAULT now()
);
