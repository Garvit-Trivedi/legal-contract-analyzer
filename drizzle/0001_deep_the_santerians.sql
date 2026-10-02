CREATE TYPE "public"."indexing_status" AS ENUM('pending', 'indexing', 'completed', 'failed');--> statement-breakpoint
ALTER TABLE "document_chunks" ALTER COLUMN "embedding" SET DATA TYPE vector(3072);--> statement-breakpoint
ALTER TABLE "citations" ADD COLUMN "chunk_id" uuid;--> statement-breakpoint
ALTER TABLE "documents" ADD COLUMN "indexing_status" "indexing_status" DEFAULT 'pending' NOT NULL;--> statement-breakpoint
ALTER TABLE "documents" ADD COLUMN "indexing_error" text;--> statement-breakpoint
ALTER TABLE "citations" ADD CONSTRAINT "citations_chunk_id_document_chunks_id_fk" FOREIGN KEY ("chunk_id") REFERENCES "public"."document_chunks"("id") ON DELETE cascade ON UPDATE no action;