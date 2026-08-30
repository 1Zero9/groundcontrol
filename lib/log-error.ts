/**
 * Single integration point for reporting uncaught errors.
 *
 * Right now this just logs to `console.error`, which Vercel automatically
 * captures and surfaces in its Function/Runtime logs — so this already gives
 * real production visibility with zero extra setup. If/when a real error
 * monitoring account (e.g. Sentry) is wired up, only this file needs to
 * change: swap the body for a call to that provider's SDK and every caller
 * (error.tsx, global-error.tsx, etc.) keeps working unmodified.
 */
export function logError(context: string, error: unknown, extra?: Record<string, unknown>) {
  console.error(`[${context}]`, error, extra ?? "");
}
