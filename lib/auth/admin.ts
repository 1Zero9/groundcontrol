import { redirect } from "next/navigation";
import { getUserById } from "../../db/auth-queries";
import { getSession } from "./session";

/**
 * Gate for the /admin console. Loads the *current* `isAdmin` flag from the
 * DB on every call (never trusts the session cookie for this) so revoking
 * admin access takes effect immediately, not just after the 30-day cookie
 * expires. Redirects non-admins to "/" rather than exposing a 403 page that
 * confirms the route exists.
 */
export async function requireAdmin() {
  const session = await getSession();
  if (!session) {
    redirect("/login");
  }

  const user = await getUserById(session.userId);
  if (!user || !user.isAdmin) {
    redirect("/");
  }

  return user;
}
