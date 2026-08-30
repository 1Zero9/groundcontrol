import Link from "next/link";
import { redirect } from "next/navigation";
import { getSession } from "../../lib/auth/session";
import { resetPasswordAction } from "../../lib/auth/actions";
import { verifyPasswordResetToken } from "../../lib/auth/password-reset";
import { AuthShell, AuthCard } from "../components/auth-shell";
import { PasswordField } from "../components/password-field";
import { SubmitButton } from "../components/submit-button";

export default async function ResetPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string; error?: string }>;
}) {
  const session = await getSession();
  if (session) {
    redirect("/");
  }

  const { token, error } = await searchParams;
  const payload = verifyPasswordResetToken(token);

  if (!token || !payload) {
    return (
      <AuthShell>
        <AuthCard>
          <h1 className="auth-title">Reset link invalid</h1>
          <p className="auth-subtitle">
            This reset link is invalid or has expired. Request a new one below.
          </p>
          <p className="auth-switch">
            <Link href="/forgot-password">Request a new link</Link>
          </p>
        </AuthCard>
      </AuthShell>
    );
  }

  return (
    <AuthShell>
      <AuthCard>
        <h1 className="auth-title">Set a new password</h1>
        <p className="auth-subtitle">Choose a new password for your account.</p>

        {error && <p className="auth-error">{error}</p>}

        <form action={resetPasswordAction} className="auth-form">
          <input type="hidden" name="token" value={token} />
          <label className="auth-field" htmlFor="reset-password-input">
            <span>New password</span>
            <PasswordField
              id="reset-password-input"
              name="password"
              required
              minLength={8}
              autoComplete="new-password"
            />
          </label>
          <SubmitButton pendingLabel="Resetting…">Reset password</SubmitButton>
        </form>
      </AuthCard>
    </AuthShell>
  );
}
