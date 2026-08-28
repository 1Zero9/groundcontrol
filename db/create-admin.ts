/**
 * One-off script to create a standalone operator login for the /admin
 * console. This is the ONLY way an admin account is ever created — there is
 * no signup form, and no family login can be "promoted" into one (see the
 * `admins` table in `db/schema.ts`, which has no relationship to
 * `users`/`families` at all).
 *
 * Usage:
 *   npm run admin:create -- you@example.com "a strong password"
 */
import { hashPassword } from "../lib/auth/password";
import { createAdmin, getAdminByEmail } from "./admin-auth-queries";

async function main() {
  const [email, password] = process.argv.slice(2);
  if (!email || !password) {
    console.error('Usage: npm run admin:create -- you@example.com "a strong password"');
    process.exit(1);
  }

  const existing = await getAdminByEmail(email);
  if (existing) {
    console.error(`An admin with email ${email} already exists.`);
    process.exit(1);
  }

  const passwordHash = hashPassword(password);
  const admin = await createAdmin(email, passwordHash);
  console.log(`Created admin login: ${admin.email}`);
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
