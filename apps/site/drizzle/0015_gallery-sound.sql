ALTER TABLE "gallery_videos" RENAME COLUMN "has_audio" TO "sound";--> statement-breakpoint
ALTER TABLE "gallery_videos" ALTER COLUMN "sound" SET DEFAULT true;
