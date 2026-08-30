/**
 * One-off maintenance script: marks the existing drizzle/ migration files as
 * already applied, without running their SQL.
 *
 * Background: every schema change so far has been applied to the real
 * database with `npm run db:push` (drizzle-kit push), which diffs the live
 * schema against db/schema.ts and never records anything in a migrations
 * table. The SQL files under drizzle/ exist (from `drizzle-kit generate`)
 * but have never actually been executed against this database.
 *
 * Going forward we want to use `drizzle-kit migrate` (npm run db:migrate)
 * instead, which is safer for production: it applies a fixed, reviewed set
 * of SQL files in order and tracks what's applied in a
 * drizzle.__drizzle_migrations table. That table only checks the single
 * most recent row's created_at (a high-water mark) to decide which
 * migrations still need to run - so this script only needs to insert one
 * row per already-applied migration, using the same hash/timestamp that
 * `drizzle-kit migrate` would compute itself, so it recognizes all 9
 * existing migrations as already applied and does not try to re-run their
 * CREATE TABLE / ALTER TABLE statements.
 *
 * Safe to run multiple times: it refuses to do anything if the tracking
 * table already has rows.
 *
 * Usage: npx tsx db/baseline-migrations.ts
 */
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { sql } from "drizzle-orm";
import { getDb } from "./index";

const MIGRATIONS_SCHEMA = "drizzle";
const MIGRATIONS_TABLE = "__drizzle_migrations";
const dirname = path.dirname(fileURLToPath(import.meta.url));
const MIGRATIONS_DIR = path.join(dirname, "..", "drizzle");

interface JournalEntry {
  idx: number;
  when: number;
  tag: string;
}

async function main() {
  const db = getDb();

  const journalPath = path.join(MIGRATIONS_DIR, "meta", "_journal.json");
  const journal = JSON.parse(fs.readFileSync(journalPath, "utf8")) as {
    entries: JournalEntry[];
  };

  if (journal.entries.length === 0) {
    console.log("No migration entries found in the journal, nothing to do.");
    return;
  }

  await db.execute(sql`CREATE SCHEMA IF NOT EXISTS ${sql.identifier(MIGRATIONS_SCHEMA)}`);
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS ${sql.identifier(MIGRATIONS_SCHEMA)}.${sql.identifier(MIGRATIONS_TABLE)} (
      id SERIAL PRIMARY KEY,
      hash text NOT NULL,
      created_at bigint
    )
  `);

  const existing = await db.execute(
    sql`select count(*)::int as count from ${sql.identifier(MIGRATIONS_SCHEMA)}.${sql.identifier(MIGRATIONS_TABLE)}`
  );
  const existingCount = Number((existing.rows[0] as { count: number }).count);

  if (existingCount > 0) {
    console.log(
      `drizzle.__drizzle_migrations already has ${existingCount} row(s). ` +
        "Refusing to baseline again - if you need to re-baseline, empty that table first."
    );
    return;
  }

  console.log(`Baselining ${journal.entries.length} migration(s)...`);

  for (const entry of journal.entries) {
    const filePath = path.join(MIGRATIONS_DIR, `${entry.tag}.sql`);
    const contents = fs.readFileSync(filePath, "utf8");
    const hash = crypto.createHash("sha256").update(contents).digest("hex");

    await db.execute(
      sql`insert into ${sql.identifier(MIGRATIONS_SCHEMA)}.${sql.identifier(MIGRATIONS_TABLE)} ("hash", "created_at") values (${hash}, ${entry.when})`
    );
    console.log(`  marked ${entry.tag} as applied (created_at=${entry.when})`);
  }

  console.log("Done. `npm run db:migrate` will now only apply new migrations added after this point.");
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
