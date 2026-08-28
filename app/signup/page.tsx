import Link from "next/link";
import { redirect } from "next/navigation";
import { getSession } from "../../lib/auth/session";
import { signupAction } from "../../lib/auth/actions";
import { SiteFooter } from "../components/site-footer";

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
    <div className="auth-screen">
      <div className="auth-card">
        <span className="brand-dot-pulse" />
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
            <input type="email" name="email" required autoComplete="email" />
          </label>
          <label className="auth-field">
            <span>Password</span>
            <input
              type="password"
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
      </div>

      <SiteFooter />
    </div>
  );
}
