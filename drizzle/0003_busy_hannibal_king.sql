CREATE TABLE "document_files" (
	"document_id" uuid PRIMARY KEY NOT NULL,
	"file_data" "bytea" NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "redline_edits" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"document_id" uuid NOT NULL,
	"instruction" text NOT NULL,
	"original_text" text NOT NULL,
	"replacement_text" text NOT NULL,
	"reason" text,
	"verified" boolean DEFAULT false NOT NULL,
	"status" text DEFAULT 'PROPOSED' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "document_files" ADD CONSTRAINT "document_files_document_id_documents_id_fk" FOREIGN KEY ("document_id") REFERENCES "public"."documents"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "redline_edits" ADD CONSTRAINT "redline_edits_document_id_documents_id_fk" FOREIGN KEY ("document_id") REFERENCES "public"."documents"("id") ON DELETE cascade ON UPDATE no action;