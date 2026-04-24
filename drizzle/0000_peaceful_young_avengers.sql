CREATE TABLE "processed_events" (
	"event_id" text PRIMARY KEY NOT NULL,
	"processed_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "stock_overrides" (
	"card_id" text NOT NULL,
	"variant" text NOT NULL,
	"stock" integer NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "stock_overrides_card_id_variant_pk" PRIMARY KEY("card_id","variant")
);
