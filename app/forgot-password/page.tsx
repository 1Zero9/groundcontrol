import Link from "next/link";
import { redirect } from "next/navigation";
import { Mail } from "lucide-react";
import { getSession } from "../../lib/auth/session";
import { requestPasswordResetAction } from "../../lib/auth/actions";
import { AuthShell, AuthCard } from "../components/auth-shell";
import { SubmitButton } from "../components/submit-button";

export default async function ForgotPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; sent?: string }>;
}) {
  const session = await getSession();
  if (session) {
    redirect("/");
  }

  const { error, sent } = await searchParams;

  return (
    <AuthShell>
      <AuthCard>
        <h1 className="auth-title">Forgot your password?</h1>
        <p className="auth-subtitle">
          Enter your email and we&apos;ll send you a link to reset it.
        </p>

        {error && <p className="auth-error">{error}</p>}
        {sent && (
          <p className="auth-notice">
            If that email matches an account, we&apos;ve sent a reset link. Check your inbox.
          </p>
        )}

        <form action={requestPasswordResetAction} className="auth-form">
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
          <SubmitButton pendingLabel="Sending…">Send reset link</SubmitButton>
        </form>

        <p className="auth-switch">
          <Link href="/login">Back to log in</Link>
        </p>
      </AuthCard>
    </AuthShell>
  );
}
