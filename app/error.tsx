"use client";

import { useEffect } from "react";
import Link from "next/link";
import { AuthCard, AuthShell } from "./components/auth-shell";
import { logError } from "../lib/log-error";

export default function ErrorPage({
  error,
  retry,
}: {
  error: Error & { digest?: string };
  retry: () => void;
}) {
  useEffect(() => {
    logError("app/error", error);
  }, [error]);

  return (
    <AuthShell>
      <AuthCard>
        <h1 className="auth-title">Something went wrong</h1>
        <p className="auth-subtitle">
          An unexpected error occurred. You can try again, or head back home.
        </p>
        <div className="auth-form">
          <button type="button" className="auth-submit-btn" onClick={() => retry()}>
            Try again
          </button>
          <Link href="/" className="auth-switch">
            Back to home
          </Link>
        </div>
      </AuthCard>
    </AuthShell>
  );
}
