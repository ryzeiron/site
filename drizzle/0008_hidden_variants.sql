CREATE TABLE "hidden_variants" (
	"card_id" text NOT NULL,
	"variant" text NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "hidden_variants_card_id_variant_pk" PRIMARY KEY("card_id","variant")
);
