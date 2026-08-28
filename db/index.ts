import { Pool } from "pg";
import { drizzle } from "drizzle-orm/node-postgres";
import * as schema from "./schema";

let cached: ReturnType<typeof drizzle<typeof schema>> | null = null;

/**
 * Returns a singleton Drizzle client over a standard Postgres connection
 * (Prisma Postgres, or any other Postgres-compatible provider).
 *
 * Set DATABASE_URL (or POSTGRES_URL) in Vercel / .env.local.
 */
export function getDb() {
  if (cached) return cached;

  const connectionString = process.env.DATABASE_URL || process.env.POSTGRES_URL;

  if (!connectionString) {
    throw new Error(
      "DATABASE_URL is not set. Add it in Vercel → Project → Settings → Environment Variables, " +
        "or run `vercel env pull .env.local` locally after linking the project."
    );
  }

  const pool = new Pool({
    connectionString,
    ssl: { rejectUnauthorized: false },
    // Serverless functions (Vercel) freeze between invocations; the DB or
    // infra can silently kill an idle socket during that freeze, and the next
    // query on that stale pooled connection then fails with "Connection
    // terminated unexpectedly". Closing idle clients quickly (rather than
    // holding them across a freeze) makes that far less likely, and `max: 1`
    // keeps this appropriate for a single serverless invocation's concurrency.
    max: 1,
    idleTimeoutMillis: 10_000,
    connectionTimeoutMillis: 10_000,
  });

  // Without this listener, an error on an idle pooled client (e.g. the DB
  // closing a stale connection) is an unhandled 'error' event and crashes the
  // whole process instead of just failing the next query that would open a
  // fresh connection anyway.
  pool.on("error", (err) => {
    console.error("Postgres pool idle client error", err);
  });

  cached = drizzle(pool, { schema });
  return cached;
}
