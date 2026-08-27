"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { createFamilyWithOwner, getUserByEmail } from "../../db/auth-queries";
import { hashPassword, verifyPassword } from "./password";
import { clearSessionCookie, setSessionCookie } from "./session";

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
  const parsed = loginSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });

  if (!parsed.success) {
    redirectWithError("/login", parsed.error.issues[0]?.message ?? "Invalid input");
  }

  const user = await getUserByEmail(parsed.data.email);
  if (!user || !verifyPassword(parsed.data.password, user.passwordHash)) {
    redirectWithError("/login", "Incorrect email or password.");
  }

  await setSessionCookie({ userId: user.id, familyId: user.familyId });
  redirect("/");
}

export async function logoutAction() {
  await clearSessionCookie();
  redirect("/login");
}
