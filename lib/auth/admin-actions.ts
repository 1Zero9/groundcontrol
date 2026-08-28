"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { getAdminByEmail } from "../../db/admin-auth-queries";
import { verifyPassword } from "./password";
import { clearAdminSessionCookie, setAdminSessionCookie } from "./admin-session";

function redirectWithError(path: string, message: string): never {
  redirect(`${path}?error=${encodeURIComponent(message)}`);
}

const adminLoginSchema = z.object({
  email: z.string().trim().toLowerCase().email("Enter a valid email address"),
  password: z.string().min(1, "Password is required"),
});

export async function adminLoginAction(formData: FormData) {
  const parsed = adminLoginSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });

  if (!parsed.success) {
    redirectWithError("/admin/login", parsed.error.issues[0]?.message ?? "Invalid input");
  }

  const admin = await getAdminByEmail(parsed.data.email);
  if (!admin || !verifyPassword(parsed.data.password, admin.passwordHash)) {
    redirectWithError("/admin/login", "Incorrect email or password.");
  }

  await setAdminSessionCookie({ adminId: admin.id });
  redirect("/admin");
}

export async function adminLogoutAction() {
  await clearAdminSessionCookie();
  redirect("/admin/login");
}
