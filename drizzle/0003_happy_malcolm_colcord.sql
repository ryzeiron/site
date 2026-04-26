CREATE TABLE "card_overrides" (
	"card_id" text PRIMARY KEY NOT NULL,
	"name" text,
	"image" text,
	"description" text,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
