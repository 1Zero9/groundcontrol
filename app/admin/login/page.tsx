import { redirect } from "next/navigation";
import { getAdminSession } from "../../../lib/auth/admin-session";
import { AuthShell, AuthCard } from "../../components/auth-shell";

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
    <AuthShell>
      <AuthCard>
        <h1 className="auth-title">Admin sign in</h1>
        <p className="auth-subtitle">
          Operator access only, via Google. This is a separate sign-in from any family account.
        </p>

        {error && <p className="auth-error">{error}</p>}

        <a href="/admin/auth/google" className="auth-submit-btn admin-google-btn">
          Continue with Google
        </a>
      </AuthCard>
    </AuthShell>
  );
}
