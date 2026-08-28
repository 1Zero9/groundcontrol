import { redirect } from "next/navigation";
import { getAdminSession } from "../../../lib/auth/admin-session";
import { adminLoginAction } from "../../../lib/auth/admin-actions";
import { SiteFooter } from "../../components/site-footer";

export default async function AdminLoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const session = await getAdminSession();
  if (session) {
    redirect("/admin");
  }

  const { error } = await searchParams;

  return (
    <div className="auth-screen">
      <div className="auth-card">
        <span className="brand-dot-pulse" />
        <h1 className="auth-title">Admin sign in</h1>
        <p className="auth-subtitle">
          Operator access only. This is a separate login from any family account.
        </p>

        {error && <p className="auth-error">{error}</p>}

        <form action={adminLoginAction} className="auth-form">
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
            Sign in
          </button>
        </form>
      </div>

      <SiteFooter />
    </div>
  );
}
