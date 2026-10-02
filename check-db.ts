import { loadEnvConfig } from "@next/env";
loadEnvConfig(process.cwd());
import { db } from "./src/db";
import { sql } from "drizzle-orm";

async function main() {
  const extensionRes = await db.execute(sql`SELECT extname FROM pg_extension WHERE extname = 'vector'`);
  console.log("pgvector extension:", extensionRes.length > 0 ? "EXISTS" : "MISSING");
  process.exit(0);
}
main();
