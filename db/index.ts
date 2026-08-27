// Placeholder database client. Wire this up once Vercel storage (Postgres,
// e.g. via Neon/Vercel Postgres) is provisioned:
//
//   import { drizzle } from "drizzle-orm/neon-http";
//   import * as schema from "./schema";
//   export function getDb() {
//     return drizzle(process.env.DATABASE_URL!, { schema });
//   }
export function getDb(): never {
  throw new Error(
    "Database not configured yet. Provision Postgres in Vercel, set DATABASE_URL, and implement getDb() in db/index.ts."
  );
}
