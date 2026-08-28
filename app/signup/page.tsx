import Link from "next/link";
import { redirect } from "next/navigation";
import { Mail } from "lucide-react";
import { getSession } from "../../lib/auth/session";
import { signupAction } from "../../lib/auth/actions";
import { AuthShell, AuthCard } from "../components/auth-shell";
import { PasswordField } from "../components/password-field";

export default async function SignupPage({
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
        <h1 className="auth-title">Create your family</h1>
        <p className="auth-subtitle">
          Set up mission control for your household in under a minute.
        </p>

        {error && <p className="auth-error">{error}</p>}

        <form action={signupAction} className="auth-form">
          <label className="auth-field">
            <span>Family name</span>
            <input
              type="text"
              name="familyName"
              placeholder="e.g. The Cranfields"
              required
              autoComplete="off"
            />
          </label>
          <label className="auth-field">
            <span>Your name</span>
            <input type="text" name="ownerName" required autoComplete="name" />
          </label>
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
          <label className="auth-field" htmlFor="signup-password">
            <span>Password</span>
            <PasswordField
              id="signup-password"
              name="password"
              required
              minLength={8}
              autoComplete="new-password"
            />
          </label>
          <button type="submit" className="auth-submit-btn">
            Create family
          </button>
        </form>

        <p className="auth-switch">
          Already have an account? <Link href="/login">Log in</Link>
        </p>
      </AuthCard>
    </AuthShell>
  );
}
