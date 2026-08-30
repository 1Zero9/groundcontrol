"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import {
  assertMemberInviteEligible,
  bumpMemberInviteVersion,
  claimFamilyMemberInvite,
  createFamilyWithOwner,
  getMemberInviteVersion,
  getUserByEmail,
  getUserById,
  updateUserPassword,
} from "../../db/auth-queries";
import { hashPassword, verifyPassword } from "./password";
import { clearSessionCookie, getSession, setSessionCookie } from "./session";
import { createMemberInviteToken, verifyMemberInviteToken } from "./member-invite";
import { createPasswordResetToken, verifyPasswordResetToken } from "./password-reset";
import { checkRateLimit, getClientIp, rateLimitMessage, resetRateLimit } from "../rate-limit";
import { sendEmail } from "../email";

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
  // Bumping the version here — rather than just signing a new token —
  // invalidates any older, still-unexpired link for this member.
  const v = await bumpMemberInviteVersion(memberId);
  return createMemberInviteToken({ familyId: session.familyId, memberId, v });
}

/**
 * Revokes any outstanding "connect to the app" link for a member without
 * issuing a replacement — just bumps the version so a previously shared
 * link (still within its 3-day window) stops working.
 */
export async function revokeMemberInviteLinkAction(memberId: string): Promise<void> {
  const session = await getSession();
  if (!session) {
    throw new Error("You must be signed in to do that.");
  }
  await assertMemberInviteEligible(session.familyId, memberId);
  await bumpMemberInviteVersion(memberId);
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

  const currentVersion = await getMemberInviteVersion(invite.memberId);
  if (currentVersion === null || currentVersion !== invite.v) {
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

const requestResetSchema = z.object({
  email: z.string().trim().toLowerCase().email("Enter a valid email address"),
});

function getSiteUrl(): string {
  return process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";
}

/**
 * Sends a password-reset link if the email matches an account. Always
 * redirects to the same "check your email" state whether or not the
 * account exists, so this can't be used to enumerate registered emails.
 */
export async function requestPasswordResetAction(formData: FormData) {
  const ip = await getClientIp();
  const ipLimit = await checkRateLimit(`reset-request:ip:${ip}`, {
    max: 10,
    windowSeconds: 60 * 60,
  });
  if (!ipLimit.allowed) {
    redirectWithError("/forgot-password", rateLimitMessage(ipLimit));
  }

  const parsed = requestResetSchema.safeParse({ email: formData.get("email") });
  if (!parsed.success) {
    redirectWithError("/forgot-password", parsed.error.issues[0]?.message ?? "Invalid input");
  }

  const emailLimit = await checkRateLimit(`reset-request:email:${parsed.data.email}`, {
    max: 5,
    windowSeconds: 60 * 60,
  });

  if (emailLimit.allowed) {
    const user = await getUserByEmail(parsed.data.email);
    if (user) {
      const token = createPasswordResetToken(user.id);
      const link = `${getSiteUrl()}/reset-password?token=${encodeURIComponent(token)}`;
      await sendEmail({
        to: parsed.data.email,
        subject: "Reset your Ground Control password",
        text: `Reset your password: ${link}\n\nThis link expires in 1 hour. If you didn't request this, you can ignore this email.`,
        html: `<p>Reset your password by clicking the link below:</p><p><a href="${link}">${link}</a></p><p>This link expires in 1 hour. If you didn't request this, you can ignore this email.</p>`,
      });
    }
  }

  redirect("/forgot-password?sent=1");
}

const resetPasswordSchema = z.object({
  token: z.string().min(1, "Missing reset link"),
  password: z.string().min(8, "Password must be at least 8 characters"),
});

export async function resetPasswordAction(formData: FormData) {
  const ip = await getClientIp();
  const limit = await checkRateLimit(`reset-confirm:ip:${ip}`, { max: 10, windowSeconds: 15 * 60 });
  if (!limit.allowed) {
    redirectWithError("/forgot-password", rateLimitMessage(limit));
  }

  const parsed = resetPasswordSchema.safeParse({
    token: formData.get("token"),
    password: formData.get("password"),
  });

  const rawToken = typeof formData.get("token") === "string" ? (formData.get("token") as string) : "";

  if (!parsed.success) {
    redirectWithError(
      `/reset-password?token=${encodeURIComponent(rawToken)}`,
      parsed.error.issues[0]?.message ?? "Invalid input"
    );
  }

  const payload = verifyPasswordResetToken(parsed.data.token);
  if (!payload) {
    redirectWithError(
      "/forgot-password",
      "This reset link is invalid or has expired. Please request a new one."
    );
  }

  const user = await getUserById(payload.userId);
  if (!user) {
    redirectWithError(
      "/forgot-password",
      "This reset link is invalid or has expired. Please request a new one."
    );
  }

  const passwordHash = hashPassword(parsed.data.password);
  await updateUserPassword(user.id, passwordHash);

  redirect("/login?reset=1");
}
