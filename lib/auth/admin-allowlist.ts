/**
 * The only email(s) allowed to ever hold /admin access. Checked on every
 * Google OAuth callback (see `app/admin/auth/google/callback/route.ts`)
 * BEFORE an admin session is ever issued or an `admins` row is provisioned —
 * completing Google sign-in alone is not enough, the verified email must
 * also be in this list. Deliberately hardcoded rather than DB-editable so it
 * can't be changed by anything other than a code change + deploy.
 */
const ALLOWED_ADMIN_EMAILS = ["onezeronine@gmail.com"];

export function isAllowedAdminEmail(email: string): boolean {
  return ALLOWED_ADMIN_EMAILS.includes(email.toLowerCase().trim());
}
