CREATE TABLE "gallery_projects" (
	"key" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"url" text,
	"position" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "gallery_videos" (
	"id" text PRIMARY KEY NOT NULL,
	"project" text NOT NULL,
	"video_key" text NOT NULL,
	"poster_key" text NOT NULL,
	"title" text DEFAULT '' NOT NULL,
	"notes" text DEFAULT '' NOT NULL,
	"tags" text[] DEFAULT '{}'::text[] NOT NULL,
	"width" integer NOT NULL,
	"height" integer NOT NULL,
	"duration" double precision NOT NULL,
	"has_audio" boolean DEFAULT false NOT NULL,
	"recorded_at" date,
	"position" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "gallery_videos" ADD CONSTRAINT "gallery_videos_project_gallery_projects_key_fk" FOREIGN KEY ("project") REFERENCES "public"."gallery_projects"("key") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "gallery_videos_project_idx" ON "gallery_videos" USING btree ("project","position");