/**
 * One-off script to grant/revoke /admin console access for an existing
 * login. Admin status is deliberately never granted through signup/UI —
 * this is the only way to set it.
 *
 * Usage:
 *   npm run admin:promote -- you@example.com
 *   npm run admin:promote -- you@example.com --revoke
 */
import { getUserByEmail } from "./auth-queries";
import { setUserAdminFlag } from "./admin-queries";

async function main() {
  const [email, flag] = process.argv.slice(2);
  if (!email) {
    console.error("Usage: npm run admin:promote -- <email> [--revoke]");
    process.exit(1);
  }

  const user = await getUserByEmail(email);
  if (!user) {
    console.error(`No user found with email: ${email}`);
    process.exit(1);
  }

  const isAdmin = flag !== "--revoke";
  await setUserAdminFlag(user.id, isAdmin);
  console.log(`${email} is now ${isAdmin ? "an admin" : "no longer an admin"}.`);
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
