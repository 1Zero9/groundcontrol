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

  const pool = new Pool({ connectionString, ssl: { rejectUnauthorized: false } });
  cached = drizzle(pool, { schema });
  return cached;
}
