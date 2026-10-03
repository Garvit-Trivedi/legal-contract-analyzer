ALTER TYPE "public"."processing_status" ADD VALUE 'queued' BEFORE 'processing';--> statement-breakpoint
ALTER TYPE "public"."processing_status" ADD VALUE 'extracting' BEFORE 'processing';--> statement-breakpoint
ALTER TYPE "public"."processing_status" ADD VALUE 'chunking' BEFORE 'processing';--> statement-breakpoint
ALTER TYPE "public"."processing_status" ADD VALUE 'ready' BEFORE 'completed';--> statement-breakpoint
ALTER TABLE "documents" ADD COLUMN "progress" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "documents" ADD COLUMN "total_chunks" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "documents" ADD COLUMN "processed_chunks" integer DEFAULT 0 NOT NULL;