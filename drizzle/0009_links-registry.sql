CREATE TABLE "link_chunks" (
	"id" bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "link_chunks_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1 CACHE 1),
	"link_id" bigint NOT NULL,
	"chunk_index" smallint NOT NULL,
	"content" text NOT NULL,
	"token_count" smallint DEFAULT 0 NOT NULL,
	"embedding" vector(1536) NOT NULL,
	CONSTRAINT "link_chunks_link_chunk_unique" UNIQUE("link_id","chunk_index")
);
--> statement-breakpoint
CREATE TABLE "links" (
	"id" bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "links_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1 CACHE 1),
	"source" text DEFAULT 'discord' NOT NULL,
	"discord_id" bigint,
	"url_key" text NOT NULL,
	"url" text NOT NULL,
	"title" text DEFAULT '' NOT NULL,
	"description" text DEFAULT '' NOT NULL,
	"channel" text NOT NULL,
	"added_at" timestamp with time zone NOT NULL,
	"hidden_at" timestamp with time zone,
	"health" text DEFAULT 'unknown' NOT NULL,
	"consecutive_failures" smallint DEFAULT 0 NOT NULL,
	"health_checked_at" timestamp with time zone,
	"extract_status" text DEFAULT 'pending' NOT NULL,
	"raw_text" text,
	"content_hash" text,
	"extracted_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "links_discord_id_unique" UNIQUE("discord_id"),
	CONSTRAINT "links_url_key_unique" UNIQUE("url_key"),
	CONSTRAINT "links_url_nonempty" CHECK ("links"."url" <> ''),
	CONSTRAINT "links_health_check" CHECK ("links"."health" in ('unknown','alive','dying','dead','uncheckable')),
	CONSTRAINT "links_extract_status_check" CHECK ("links"."extract_status" in ('pending','ok','thin','failed','skipped'))
);
--> statement-breakpoint
ALTER TABLE "link_chunks" ADD CONSTRAINT "link_chunks_link_id_links_id_fk" FOREIGN KEY ("link_id") REFERENCES "public"."links"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "link_chunks_link_id_idx" ON "link_chunks" USING btree ("link_id");--> statement-breakpoint
CREATE INDEX "link_chunks_embedding_hnsw_idx" ON "link_chunks" USING hnsw ("embedding" vector_cosine_ops);--> statement-breakpoint
CREATE INDEX "links_channel_added_idx" ON "links" USING btree ("channel","added_at" DESC NULLS LAST,"id" DESC NULLS LAST);