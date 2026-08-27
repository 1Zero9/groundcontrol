import Link from "next/link";
import { redirect } from "next/navigation";
import { getSession } from "../../lib/auth/session";
import { loginAction } from "../../lib/auth/actions";

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
    <div className="auth-screen">
      <div className="auth-card">
        <span className="brand-dot-pulse" />
        <h1 className="auth-title">Welcome back</h1>
        <p className="auth-subtitle">Log in to your family&apos;s mission control.</p>

        {error && <p className="auth-error">{error}</p>}

        <form action={loginAction} className="auth-form">
          <label className="auth-field">
            <span>Email</span>
            <input type="email" name="email" required autoComplete="email" />
          </label>
          <label className="auth-field">
            <span>Password</span>
            <input
              type="password"
              name="password"
              required
              autoComplete="current-password"
            />
          </label>
          <button type="submit" className="auth-submit-btn">
            Log in
          </button>
        </form>

        <p className="auth-switch">
          New to Ground Control? <Link href="/signup">Create a family</Link>
        </p>
      </div>
    </div>
  );
}
