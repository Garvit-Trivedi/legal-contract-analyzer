import postgres from "postgres";
import * as dotenv from "dotenv";
import { resolve } from "path";

dotenv.config({ path: resolve(process.cwd(), ".env.local") });

const sql = postgres(process.env.DATABASE_URL!, { ssl: "require" });

async function migrate() {
  await sql`
    CREATE TABLE IF NOT EXISTS document_files (
      document_id uuid PRIMARY KEY REFERENCES documents(id) ON DELETE CASCADE,
      file_data bytea NOT NULL,
      created_at timestamp DEFAULT now() NOT NULL
    )
  `;
  await sql`
    CREATE TABLE IF NOT EXISTS redline_edits (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      document_id uuid NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
      instruction text NOT NULL,
      original_text text NOT NULL,
      replacement_text text NOT NULL,
      reason text,
      verified boolean DEFAULT false NOT NULL,
      status text DEFAULT 'PROPOSED' NOT NULL,
      created_at timestamp DEFAULT now() NOT NULL
    )
  `;
  console.log("✅ Migration complete: document_files and redline_edits tables created.");
  await sql.end();
}

migrate().catch(e => { console.error("❌ Migration failed:", e.message); process.exit(1); });
