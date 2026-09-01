// Apply db/migrations/*.sql in order to DATABASE_URL.
// Local-first: run against the docker-compose Postgres (synthetic data only).
//
//   DATABASE_URL=postgres://medikey:medikey_local_dev@127.0.0.1:5433/medikey_dev \
//     node scripts/migrate.mjs
//
// Pass --reset to drop and recreate the public schema first (dev/test only).
import { readdirSync, readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import pg from "pg";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const dir = resolve(root, "db/migrations");
const url = process.env.DATABASE_URL;
if (!url) { console.error("DATABASE_URL is required"); process.exit(1); }

const reset = process.argv.includes("--reset");
const client = new pg.Client({ connectionString: url });
await client.connect();

try {
  if (reset) {
    await client.query("DROP SCHEMA IF EXISTS public CASCADE; CREATE SCHEMA public;");
    console.log("reset: public schema recreated");
  }
  const files = readdirSync(dir).filter((f) => f.endsWith(".sql")).sort();
  for (const f of files) {
    const sql = readFileSync(resolve(dir, f), "utf8");
    await client.query(sql);
    console.log("applied", f);
  }
  console.log(`migrations complete (${files.length} files)`);
} finally {
  await client.end();
}
