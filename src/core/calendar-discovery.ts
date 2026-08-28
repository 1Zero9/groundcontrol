/**
 * CALENDAR DISCOVERY
 * ------------------
 * Given a plain website URL (a school, club, or college's homepage), try to
 * find a calendar feed link on it — so someone can paste in
 * "stmarys.school.ie" instead of having to already know the exact .ics/
 * webcal link. Best-effort scraping, not a guarantee: results are shown as
 * suggestions the user picks from, never auto-applied.
 *
 * Two strategies, combined:
 * 1. Fetch the page and scan its HTML for <a href> links that look like a
 *    calendar (contain .ics, webcal://, or common calendar-ish keywords).
 * 2. Probe a handful of common guessed paths on the same site
 *    (/calendar.ics, /events.ics, ...) and keep any that actually respond
 *    with calendar-shaped content.
 */

const LINK_HREF_RE = /<a\b[^>]*\bhref\s*=\s*["']([^"']+)["'][^>]*>/gi;

const CALENDAR_KEYWORD_RE = /\.ics(\?|#|$)|webcal:\/\/|\/ical\b|calendar/i;

const GUESSED_PATHS = [
  "/calendar.ics",
  "/calendar/ical",
  "/events.ics",
  "/events/calendar.ics",
  "/calendar/events.ics",
  "/school-calendar.ics",
];

function toAbsoluteUrl(href: string, baseUrl: string): string | null {
  try {
    return new URL(href, baseUrl).toString();
  } catch {
    return null;
  }
}

function normalizePageUrl(input: string): string {
  const trimmed = input.trim();
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  return `https://${trimmed}`;
}

async function looksLikeCalendar(url: string): Promise<boolean> {
  try {
    const res = await fetch(url, { method: "GET", redirect: "follow" });
    if (!res.ok) return false;
    const contentType = res.headers.get("content-type") ?? "";
    if (contentType.includes("text/calendar")) return true;
    const text = await res.text();
    return text.trimStart().startsWith("BEGIN:VCALENDAR");
  } catch {
    return false;
  }
}

/**
 * Returns candidate calendar feed URLs found on/around the given page.
 * Never throws for a page that just doesn't have one — returns `[]`.
 */
export async function discoverCalendarFeeds(pageUrl: string): Promise<string[]> {
  const baseUrl = normalizePageUrl(pageUrl);
  const candidates = new Set<string>();

  try {
    const res = await fetch(baseUrl, { redirect: "follow" });
    if (res.ok) {
      const html = await res.text();
      for (const match of html.matchAll(LINK_HREF_RE)) {
        const href = match[1];
        if (!CALENDAR_KEYWORD_RE.test(href)) continue;
        const absolute = toAbsoluteUrl(href, baseUrl);
        if (absolute) candidates.add(absolute);
      }
    }
  } catch {
    // Site unreachable/blocked — fall through to guessed paths only.
  }

  const origin = (() => {
    try {
      return new URL(baseUrl).origin;
    } catch {
      return null;
    }
  })();

  if (origin) {
    for (const path of GUESSED_PATHS) {
      candidates.add(origin + path);
    }
  }

  const verified: string[] = [];
  const checks = Array.from(candidates).map(async (url) => {
    if (await looksLikeCalendar(url)) verified.push(url);
  });
  await Promise.all(checks);

  return verified;
}
