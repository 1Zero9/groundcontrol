import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";
import { exchangeCodeForToken, fetchGoogleUserInfo } from "../../../../../lib/auth/google-oauth";
import { isAllowedAdminEmail } from "../../../../../lib/auth/admin-allowlist";
import { upsertAdminFromGoogleProfile } from "../../../../../db/admin-auth-queries";
import { setAdminSessionCookie } from "../../../../../lib/auth/admin-session";

const STATE_COOKIE_NAME = "gc_admin_oauth_state";

function redirectWithError(request: NextRequest, message: string) {
  const url = new URL("/admin/login", request.url);
  url.searchParams.set("error", message);
  return NextResponse.redirect(url);
}

/**
 * Google OAuth callback for /admin sign-in. Order of checks matters:
 * 1. CSRF: returned `state` must match the cookie set by `../route.ts`.
 * 2. Exchange the code + fetch the verified Google profile.
 * 3. `email_verified` must be true AND the email must be in the hardcoded
 *    allowlist (`lib/auth/admin-allowlist.ts`) — completing Google sign-in
 *    alone is NOT sufficient, only that one email can ever get in.
 * Only after all three pass do we provision/find the admin row and set the
 * admin session cookie.
 */
export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");

  const store = await cookies();
  const expectedState = store.get(STATE_COOKIE_NAME)?.value;
  store.delete(STATE_COOKIE_NAME);

  if (!code || !state || !expectedState || state !== expectedState) {
    return redirectWithError(request, "Sign-in failed. Please try again.");
  }

  try {
    const redirectUri = new URL("/admin/auth/google/callback", request.url).toString();
    const tokens = await exchangeCodeForToken({ code, redirectUri });
    const profile = await fetchGoogleUserInfo(tokens.access_token);

    if (!profile.email_verified || !isAllowedAdminEmail(profile.email)) {
      return redirectWithError(request, "This Google account is not authorized for admin access.");
    }

    const admin = await upsertAdminFromGoogleProfile({
      email: profile.email,
      googleId: profile.sub,
    });

    await setAdminSessionCookie({ adminId: admin.id });
    return NextResponse.redirect(new URL("/admin", request.url));
  } catch (err) {
    console.error("Admin Google sign-in failed", err);
    return redirectWithError(request, "Sign-in failed. Please try again.");
  }
}
