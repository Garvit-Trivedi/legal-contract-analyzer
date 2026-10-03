const postgres = require('postgres');
const { loadEnvConfig } = require('@next/env');
loadEnvConfig(process.cwd());

async function checkVector() {
  const sql = postgres(process.env.DATABASE_URL);
  try {
    const ext = await sql`SELECT extname, extversion FROM pg_extension WHERE extname = 'vector';`;
    console.log(JSON.stringify(ext, null, 2));
    
    // Also check required tables
    const tables = await sql`SELECT table_name FROM information_schema.tables WHERE table_schema = 'public';`;
    console.log("TABLES:", tables.map(t => t.table_name).join(", "));

    // Also check embedding column
    const col = await sql`SELECT column_name, data_type, udt_name FROM information_schema.columns WHERE table_name = 'document_chunks' AND column_name = 'embedding';`;
    console.log("EMBEDDING COL:", JSON.stringify(col, null, 2));

  } catch (err) {
    console.error(err);
  } finally {
    await sql.end();
  }
}
checkVector();
