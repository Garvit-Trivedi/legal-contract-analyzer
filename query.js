import postgres from 'postgres';
import { loadEnvConfig } from '@next/env';
loadEnvConfig(process.cwd());

async function checkVector() {
  const sql = postgres(process.env.DATABASE_URL);
  try {
    const ext = await sql`SELECT extname, extversion FROM pg_extension WHERE extname = 'vector';`;
    console.log(ext);
  } finally {
    await sql.end();
  }
}
checkVector();
