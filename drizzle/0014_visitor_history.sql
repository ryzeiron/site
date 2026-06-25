CREATE TABLE IF NOT EXISTS "visitor_daily_stats" (
  "visitor_id" text NOT NULL,
  "day" text NOT NULL,
  "user_id" text,
  "user_email" text,
  "first_path" text,
  "last_path" text,
  "ping_count" integer DEFAULT 1 NOT NULL,
  "first_seen_at" timestamp with time zone DEFAULT now() NOT NULL,
  "last_seen_at" timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "visitor_daily_stats_visitor_id_day_pk" PRIMARY KEY ("visitor_id","day")
);

CREATE INDEX IF NOT EXISTS "visitor_daily_stats_day_idx"
  ON "visitor_daily_stats" ("day");

CREATE INDEX IF NOT EXISTS "visitor_daily_stats_last_seen_at_idx"
  ON "visitor_daily_stats" ("last_seen_at");

CREATE TABLE IF NOT EXISTS "visitor_hourly_stats" (
  "visitor_id" text NOT NULL,
  "hour" text NOT NULL,
  "day" text NOT NULL,
  "user_id" text,
  "user_email" text,
  "first_path" text,
  "last_path" text,
  "ping_count" integer DEFAULT 1 NOT NULL,
  "first_seen_at" timestamp with time zone DEFAULT now() NOT NULL,
  "last_seen_at" timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "visitor_hourly_stats_visitor_id_hour_pk" PRIMARY KEY ("visitor_id","hour")
);

CREATE INDEX IF NOT EXISTS "visitor_hourly_stats_hour_idx"
  ON "visitor_hourly_stats" ("hour");

CREATE INDEX IF NOT EXISTS "visitor_hourly_stats_day_idx"
  ON "visitor_hourly_stats" ("day");

CREATE INDEX IF NOT EXISTS "visitor_hourly_stats_last_seen_at_idx"
  ON "visitor_hourly_stats" ("last_seen_at");
