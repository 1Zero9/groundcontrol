import { logError } from "./log-error";

export type SendEmailInput = {
  to: string;
  subject: string;
  html: string;
  text: string;
};

/**
 * Single integration point for outbound transactional email (password
 * resets, invites, etc). Uses Resend's plain REST API via `fetch` when
 * `RESEND_API_KEY` is configured — no SDK dependency needed for something
 * this small. Until that key is added (e.g. in Vercel env vars), this falls
 * back to logging the email to the server console so flows like "forgot
 * password" are still fully testable locally/in early deploys without a
 * paid account.
 *
 * `EMAIL_FROM` (e.g. "Ground Control <noreply@yourdomain.com>") is required
 * once RESEND_API_KEY is set, since Resend needs a verified sending domain.
 */
export async function sendEmail(input: SendEmailInput): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY;

  if (!apiKey) {
    console.log(
      `[email:dev] To: ${input.to}\nSubject: ${input.subject}\n\n${input.text}`
    );
    return;
  }

  const from = process.env.EMAIL_FROM;
  if (!from) {
    throw new Error("EMAIL_FROM must be set when RESEND_API_KEY is configured.");
  }

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from,
      to: input.to,
      subject: input.subject,
      html: input.html,
      text: input.text,
    }),
  });

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    logError("lib/email", new Error(`Resend send failed: ${res.status}`), { body });
    throw new Error("Failed to send email.");
  }
}
