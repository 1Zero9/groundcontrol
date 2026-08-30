"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import {
  assertMemberInviteEligible,
  claimFamilyMemberInvite,
  createFamilyWithOwner,
  getUserByEmail,
} from "../../db/auth-queries";
import { hashPassword, verifyPassword } from "./password";
import { clearSessionCookie, getSession, setSessionCookie } from "./session";
import { createMemberInviteToken, verifyMemberInviteToken } from "./member-invite";
import { checkRateLimit, getClientIp, rateLimitMessage, resetRateLimit } from "../rate-limit";

function redirectWithError(path: string, message: string): never {
  redirect(`${path}?error=${encodeURIComponent(message)}`);
}

const signupSchema = z.object({
  familyName: z.string().trim().min(1, "Family name is required").max(80),
  ownerName: z.string().trim().min(1, "Your name is required").max(80),
  email: z.string().trim().toLowerCase().email("Enter a valid email address"),
  password: z.string().min(8, "Password must be at least 8 characters"),
});

export async function signupAction(formData: FormData) {
  const ip = await getClientIp();
  const limit = await checkRateLimit(`signup:ip:${ip}`, { max: 5, windowSeconds: 60 * 60 });
  if (!limit.allowed) {
    redirectWithError("/signup", rateLimitMessage(limit));
  }

  const parsed = signupSchema.safeParse({
    familyName: formData.get("familyName"),
    ownerName: formData.get("ownerName"),
    email: formData.get("email"),
    password: formData.get("password"),
  });

  if (!parsed.success) {
    redirectWithError("/signup", parsed.error.issues[0]?.message ?? "Invalid input");
  }

  const existing = await getUserByEmail(parsed.data.email);
  if (existing) {
    redirectWithError("/signup", "An account with that email already exists.");
  }

  const passwordHash = hashPassword(parsed.data.password);
  const { user, member } = await createFamilyWithOwner({
    familyName: parsed.data.familyName,
    ownerName: parsed.data.ownerName,
    email: parsed.data.email,
    passwordHash,
  });

  await setSessionCookie({ userId: user.id, familyId: member.familyId });
  redirect("/");
}

const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email("Enter a valid email address"),
  password: z.string().min(1, "Password is required"),
});

export async function loginAction(formData: FormData) {
  const ip = await getClientIp();
  const ipLimit = await checkRateLimit(`login:ip:${ip}`, { max: 20, windowSeconds: 15 * 60 });
  if (!ipLimit.allowed) {
    redirectWithError("/login", rateLimitMessage(ipLimit));
  }

  const parsed = loginSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });

  if (!parsed.success) {
    redirectWithError("/login", parsed.error.issues[0]?.message ?? "Invalid input");
  }

  const emailLimit = await checkRateLimit(`login:email:${parsed.data.email}`, {
    max: 8,
    windowSeconds: 15 * 60,
  });
  if (!emailLimit.allowed) {
    redirectWithError("/login", rateLimitMessage(emailLimit));
  }

  const user = await getUserByEmail(parsed.data.email);
  if (!user || !verifyPassword(parsed.data.password, user.passwordHash)) {
    redirectWithError("/login", "Incorrect email or password.");
  }

  await resetRateLimit(`login:email:${parsed.data.email}`);
  await resetRateLimit(`login:ip:${ip}`);

  await setSessionCookie({ userId: user.id, familyId: user.familyId });
  redirect("/");
}

export async function logoutAction() {
  await clearSessionCookie();
  redirect("/login");
}

/**
 * Generates a shareable "connect to the app" link for a family member who
 * doesn't have their own login yet (e.g. a teen who wants their own phone
 * access). Only a signed-in family member of the same family can generate
 * one, and only for a member that doesn't already have an account.
 */
export async function generateMemberInviteLinkAction(memberId: string): Promise<string> {
  const session = await getSession();
  if (!session) {
    throw new Error("You must be signed in to do that.");
  }
  await assertMemberInviteEligible(session.familyId, memberId);
  return createMemberInviteToken({ familyId: session.familyId, memberId });
}

const claimInviteSchema = z.object({
  token: z.string().min(1, "Missing invite link"),
  email: z.string().trim().toLowerCase().email("Enter a valid email address"),
  password: z.string().min(8, "Password must be at least 8 characters"),
});

export async function claimMemberInviteAction(formData: FormData) {
  const ip = await getClientIp();
  const limit = await checkRateLimit(`invite-claim:ip:${ip}`, { max: 8, windowSeconds: 15 * 60 });
  if (!limit.allowed) {
    redirectWithError("/invite", rateLimitMessage(limit));
  }

  const parsed = claimInviteSchema.safeParse({
    token: formData.get("token"),
    email: formData.get("email"),
    password: formData.get("password"),
  });

  if (!parsed.success) {
    redirectWithError("/invite", parsed.error.issues[0]?.message ?? "Invalid input");
  }

  const invite = verifyMemberInviteToken(parsed.data.token);
  if (!invite) {
    redirectWithError("/invite", "This invite link is invalid or has expired.");
  }

  const existing = await getUserByEmail(parsed.data.email);
  if (existing) {
    redirectWithError(
      `/invite?token=${encodeURIComponent(parsed.data.token)}`,
      "An account with that email already exists."
    );
  }

  const passwordHash = hashPassword(parsed.data.password);

  let user: Awaited<ReturnType<typeof claimFamilyMemberInvite>>["user"];
  try {
    ({ user } = await claimFamilyMemberInvite({
      familyId: invite.familyId,
      memberId: invite.memberId,
      email: parsed.data.email,
      passwordHash,
    }));
  } catch (err) {
    redirectWithError(
      "/invite",
      err instanceof Error ? err.message : "Couldn't connect this profile."
    );
  }

  await setSessionCookie({ userId: user.id, familyId: invite.familyId });
  redirect("/");
}
