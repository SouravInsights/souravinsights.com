CREATE TABLE "highlights" (
	"id" bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "highlights_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1 CACHE 1),
	"link_id" bigint NOT NULL,
	"quote" text NOT NULL,
	"prefix" text DEFAULT '' NOT NULL,
	"suffix" text DEFAULT '' NOT NULL,
	"occurrence" smallint DEFAULT 0 NOT NULL,
	"stale" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "links" DROP CONSTRAINT "links_extract_status_check";--> statement-breakpoint
ALTER TABLE "link_chunks" ADD COLUMN "unit_type" text DEFAULT 'prose' NOT NULL;--> statement-breakpoint
ALTER TABLE "link_chunks" ADD COLUMN "heading" text;--> statement-breakpoint
ALTER TABLE "links" ADD COLUMN "read_status" text DEFAULT 'pending' NOT NULL;--> statement-breakpoint
ALTER TABLE "links" ADD COLUMN "markdown" text;--> statement-breakpoint
ALTER TABLE "links" ADD COLUMN "word_count" integer;--> statement-breakpoint
ALTER TABLE "links" ADD COLUMN "category" text;--> statement-breakpoint
ALTER TABLE "links" ADD COLUMN "topics" text[];--> statement-breakpoint
ALTER TABLE "links" ADD COLUMN "summary" text;--> statement-breakpoint
ALTER TABLE "links" ADD COLUMN "embedding_mode" text;--> statement-breakpoint
ALTER TABLE "links" ADD COLUMN "prompt_version" smallint;--> statement-breakpoint
ALTER TABLE "links" ADD COLUMN "analyzed_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "highlights" ADD CONSTRAINT "highlights_link_id_links_id_fk" FOREIGN KEY ("link_id") REFERENCES "public"."links"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "highlights_link_id_idx" ON "highlights" USING btree ("link_id");--> statement-breakpoint
CREATE INDEX "links_category_idx" ON "links" USING btree ("category");--> statement-breakpoint
ALTER TABLE "links" DROP COLUMN "extract_status";--> statement-breakpoint
ALTER TABLE "links" DROP COLUMN "raw_text";--> statement-breakpoint
ALTER TABLE "links" ADD CONSTRAINT "links_read_status_check" CHECK ("links"."read_status" in ('pending','ok','thin','failed'));--> statement-breakpoint
ALTER TABLE "links" ADD CONSTRAINT "links_embedding_mode_check" CHECK ("links"."embedding_mode" in ('full','summary'));