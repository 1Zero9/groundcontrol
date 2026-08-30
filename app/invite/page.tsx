import Link from "next/link";
import { redirect } from "next/navigation";
import { Mail } from "lucide-react";
import { getSession } from "../../lib/auth/session";
import { claimMemberInviteAction } from "../../lib/auth/actions";
import { verifyMemberInviteToken } from "../../lib/auth/member-invite";
import { getFamilyMemberRawById } from "../../db/queries";
import { AuthShell, AuthCard } from "../components/auth-shell";
import { PasswordField } from "../components/password-field";
import { SubmitButton } from "../components/submit-button";

export default async function InvitePage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string; error?: string }>;
}) {
  const session = await getSession();
  if (session) {
    redirect("/");
  }

  const { token, error } = await searchParams;
  const invite = verifyMemberInviteToken(token);
  const member = invite ? await getFamilyMemberRawById(invite.memberId) : null;

  if (
    !invite ||
    !member ||
    member.familyId !== invite.familyId ||
    member.inviteTokenVersion !== invite.v
  ) {
    return (
      <AuthShell>
        <AuthCard>
          <h1 className="auth-title">Invite link invalid</h1>
          <p className="auth-subtitle">
            This connect link is invalid or has expired. Ask a family member
            to send you a new one from their Profile screen.
          </p>
          <p className="auth-switch">
            <Link href="/login">Back to log in</Link>
          </p>
        </AuthCard>
      </AuthShell>
    );
  }

  if (member.userId) {
    return (
      <AuthShell>
        <AuthCard>
          <h1 className="auth-title">Already connected</h1>
          <p className="auth-subtitle">
            {member.name} already has their own login. Just log in instead.
          </p>
          <p className="auth-switch">
            <Link href="/login">Go to log in</Link>
          </p>
        </AuthCard>
      </AuthShell>
    );
  }

  return (
    <AuthShell>
      <AuthCard>
        <h1 className="auth-title">Welcome, {member.name}!</h1>
        <p className="auth-subtitle">
          Set up your own login to connect to your family&apos;s mission
          control.
        </p>

        {error && <p className="auth-error">{error}</p>}

        <form action={claimMemberInviteAction} className="auth-form">
          <input type="hidden" name="token" value={token} />
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
          <label className="auth-field" htmlFor="invite-password">
            <span>Password</span>
            <PasswordField
              id="invite-password"
              name="password"
              required
              minLength={8}
              autoComplete="new-password"
            />
          </label>
          <SubmitButton pendingLabel="Connecting…">Connect to Ground Control</SubmitButton>
        </form>
      </AuthCard>
    </AuthShell>
  );
}
