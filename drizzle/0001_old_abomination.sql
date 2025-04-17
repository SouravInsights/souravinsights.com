ALTER TABLE "curated_links" ADD COLUMN "newsletter_status" varchar(20) DEFAULT 'none';--> statement-breakpoint
ALTER TABLE "curated_links" ADD COLUMN "buttondown_email_id" varchar(100);