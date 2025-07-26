CREATE TABLE "favorite_links" (
	"id" serial PRIMARY KEY NOT NULL,
	"title" text NOT NULL,
	"url" text NOT NULL,
	"description" text,
	"category" varchar(100) NOT NULL,
	"creator_name" varchar(100),
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
