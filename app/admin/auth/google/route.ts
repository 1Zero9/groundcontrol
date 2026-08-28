import { randomBytes } from "crypto";
import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";
import { buildGoogleAuthUrl } from "../../../../lib/auth/google-oauth";

const STATE_COOKIE_NAME = "gc_admin_oauth_state";
const STATE_MAX_AGE_SECONDS = 60 * 10; // 10 minutes — just long enough for the redirect round trip

/**
 * Starts the /admin Google sign-in flow: generates a CSRF `state` value,
 * stores it in a short-lived cookie, and redirects to Google. The callback
 * route (`./callback/route.ts`) checks the returned `state` against this
 * cookie before trusting anything else in the callback.
 */
export async function GET(request: NextRequest) {
  const state = randomBytes(16).toString("hex");
  const redirectUri = new URL("/admin/auth/google/callback", request.url).toString();

  const store = await cookies();
  store.set(STATE_COOKIE_NAME, state, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: STATE_MAX_AGE_SECONDS,
  });

  return NextResponse.redirect(buildGoogleAuthUrl({ redirectUri, state }));
}
