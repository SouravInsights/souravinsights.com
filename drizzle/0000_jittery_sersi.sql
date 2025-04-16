CREATE TABLE "curated_links" (
	"id" serial PRIMARY KEY NOT NULL,
	"title" text NOT NULL,
	"url" text NOT NULL,
	"description" text,
	"category" varchar(100) NOT NULL,
	"notes" text,
	"creator_twitter" varchar(100),
	"click_count" integer DEFAULT 0,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
