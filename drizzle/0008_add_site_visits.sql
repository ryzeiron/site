CREATE TABLE "site_visits" (
	"id" text PRIMARY KEY NOT NULL,
	"visitor_id" text NOT NULL,
	"path" text NOT NULL,
	"user_agent" text,
	"referer" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX "site_visits_created_at_idx" ON "site_visits" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "site_visits_visitor_id_idx" ON "site_visits" USING btree ("visitor_id");--> statement-breakpoint
CREATE INDEX "site_visits_path_idx" ON "site_visits" USING btree ("path");