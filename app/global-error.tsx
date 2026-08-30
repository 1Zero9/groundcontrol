"use client";

import { useEffect } from "react";
import { logError } from "../lib/log-error";

/**
 * Last-resort fallback for crashes in the root layout itself. Deliberately
 * self-contained (no globals.css, no shared components) since the thing that
 * crashed might be exactly what this page would otherwise depend on. Must
 * define its own <html>/<body> tags — this replaces the root layout when active.
 */
export default function GlobalError({
  error,
  retry,
}: {
  error: Error & { digest?: string };
  retry: () => void;
}) {
  useEffect(() => {
    logError("app/global-error", error);
  }, [error]);

  return (
    <html lang="en">
      <body
        style={{
          margin: 0,
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#14102E",
          color: "#FFFFFF",
          fontFamily:
            "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
          padding: 24,
        }}
      >
        <div style={{ maxWidth: 380, textAlign: "center" }}>
          <h1 style={{ fontSize: 22, fontWeight: 800, marginBottom: 8 }}>
            Something went wrong
          </h1>
          <p style={{ fontSize: 14, color: "rgba(255,255,255,0.6)", marginBottom: 24 }}>
            An unexpected error occurred. Please try again.
          </p>
          <button
            type="button"
            onClick={() => retry()}
            style={{
              background: "linear-gradient(135deg, #8B6CFF 0%, #6C4DFF 100%)",
              color: "#FFFFFF",
              fontWeight: 700,
              fontSize: 15,
              padding: "14px 28px",
              borderRadius: 999,
              border: "none",
              cursor: "pointer",
            }}
          >
            Try again
          </button>
        </div>
      </body>
    </html>
  );
}
