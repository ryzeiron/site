CREATE TABLE "orders" (
	"id" text PRIMARY KEY NOT NULL,
	"stripe_session_id" text NOT NULL,
	"customer_email" text,
	"customer_name" text,
	"customer_phone" text,
	"country" text,
	"relay_code" text,
	"relay_name" text,
	"relay_address" text,
	"relay_postcode" text,
	"relay_city" text,
	"mondial_relay_expedition_number" text,
	"mondial_relay_label_url" text,
	"mondial_relay_error" text,
	"status" text DEFAULT 'paid' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "stock_reservations" (
	"reservation_id" text NOT NULL,
	"stripe_session_id" text,
	"card_id" text NOT NULL,
	"variant" text NOT NULL,
	"quantity" integer NOT NULL,
	"status" text DEFAULT 'reserved' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "stock_reservations_reservation_id_card_id_variant_pk" PRIMARY KEY("reservation_id","card_id","variant")
);
--> statement-breakpoint
CREATE TABLE "tickets" (
	"id" text PRIMARY KEY NOT NULL,
	"subject" text NOT NULL,
	"email" text NOT NULL,
	"name" text,
	"phone" text,
	"message" text NOT NULL,
	"status" text DEFAULT 'open' NOT NULL,
	"admin_response" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
