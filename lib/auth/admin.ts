import { redirect } from "next/navigation";
import { getAdminById } from "../../db/admin-auth-queries";
import { getAdminSession } from "./admin-session";

/**
 * Gate for the /admin console. Checks the completely separate
 * `gc_admin_session` cookie/`admins` table — NOT the family session or a flag
 * on `users`. A family login can never satisfy this check, by construction.
 * Loads the admin row fresh from the DB on every call (never trusts the
 * session cookie alone) so a deleted admin loses access immediately, not
 * just after the 12-hour cookie expires. Redirects non-admins to
 * `/admin/login` rather than exposing a 403 page.
 */
export async function requireAdmin() {
  const session = await getAdminSession();
  if (!session) {
    redirect("/admin/login");
  }

  const admin = await getAdminById(session.adminId);
  if (!admin) {
    redirect("/admin/login");
  }

  return admin;
}
