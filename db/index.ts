import { drizzle } from "drizzle-orm/neon-http";
import { neon } from "@neondatabase/serverless";
import * as schema from "./schema";

let cached: ReturnType<typeof drizzle<typeof schema>> | null = null;

/**
 * Returns a singleton Drizzle client backed by Neon's serverless HTTP driver
 * (works for both Vercel Postgres and plain Neon connection strings).
 *
 * Set DATABASE_URL (or POSTGRES_URL) in your Vercel project / .env.local.
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

  const sql = neon(connectionString);
  cached = drizzle(sql, { schema });
  return cached;
}
