"use server";

import { redirect } from "next/navigation";
import { clearAdminSessionCookie } from "./admin-session";

/**
 * Admin sign-in itself is not a Server Action — it's a plain redirect flow
 * through Google OAuth (see `app/admin/auth/google/route.ts` +
 * `.../callback/route.ts`). This file only holds logout, which is a simple
 * mutation and fits the same Server Action pattern as the family session's
 * `logoutAction`.
 */
export async function adminLogoutAction() {
  await clearAdminSessionCookie();
  redirect("/admin/login");
}
