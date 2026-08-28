import Link from "next/link";
import { redirect } from "next/navigation";
import { Mail } from "lucide-react";
import { getSession } from "../../lib/auth/session";
import { loginAction } from "../../lib/auth/actions";
import { AuthShell, AuthCard } from "../components/auth-shell";
import { PasswordField } from "../components/password-field";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const session = await getSession();
  if (session) {
    redirect("/");
  }

  const { error } = await searchParams;

  return (
    <AuthShell>
      <AuthCard>
        <h1 className="auth-title">Log in</h1>
        <p className="auth-subtitle">Access your family&apos;s mission control.</p>

        {error && <p className="auth-error">{error}</p>}

        <form action={loginAction} className="auth-form">
          <label className="auth-field">
            <span>Email</span>
            <div className="auth-input-wrap">
              <Mail size={16} className="auth-input-icon" />
              <input
                type="email"
                name="email"
                required
                autoComplete="email"
                placeholder="you@example.com"
              />
            </div>
          </label>
          <label className="auth-field" htmlFor="login-password">
            <span>Password</span>
            <PasswordField id="login-password" name="password" required autoComplete="current-password" />
          </label>
          <button type="submit" className="auth-submit-btn">
            Log in
          </button>
        </form>

        <p className="auth-switch">
          New to Ground Control? <Link href="/signup">Create a family</Link>
        </p>
      </AuthCard>
    </AuthShell>
  );
}
