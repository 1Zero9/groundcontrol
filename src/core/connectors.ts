import ical from "node-ical";

/**
 * CONNECTORS
 * ----------
 * A "connector" pulls events from an external calendar feed a household
 * points us at — a club's fixture calendar (ClubZap, DDSL, ...), a school's
 * term calendar, or any other iCal (.ics / webcal://) feed. Every provider
 * that exposes a calendar sync link speaks the same iCal format, so there's
 * one real implementation (`parseIcalFeed`) rather than bespoke scrapers per
 * provider.
 *
 * `connectorPresets` is just display metadata (name + placeholder + help
 * link) shown in the Modules UI to help someone find their provider's feed
 * link — it doesn't change how the feed is fetched/parsed.
 */

export interface ConnectorEvent {
  /** Stable ID from the source feed (iCal UID), used to dedupe on re-sync. */
  uid: string;
  title: string;
  description?: string;
  location?: string;
  start: string;
  end?: string;
  allDay: boolean;
}

/** webcal:// isn't a scheme fetch() understands — it's just https in disguise. */
function normalizeFeedUrl(url: string): string {
  const trimmed = url.trim();
  if (trimmed.startsWith("webcal://")) {
    return "https://" + trimmed.slice("webcal://".length);
  }
  return trimmed;
}

/**
 * node-ical types text fields (summary/description/location) as either a
 * plain string or `{ val, params }` when the source feed attaches iCal
 * parameters (e.g. a language or encoding). We only care about the text.
 */
function textValue(value: unknown): string | undefined {
  if (typeof value === "string") return value;
  if (value && typeof value === "object" && "val" in value) {
    const val = (value as { val?: unknown }).val;
    return typeof val === "string" ? val : undefined;
  }
  return undefined;
}

export async function parseIcalFeed(feedUrl: string): Promise<ConnectorEvent[]> {
  const url = normalizeFeedUrl(feedUrl);
  if (!/^https?:\/\//i.test(url)) {
    throw new Error("Feed URL must be a valid http(s) or webcal link");
  }

  const parsed = await ical.async.fromURL(url);

  const results: ConnectorEvent[] = [];
  for (const key of Object.keys(parsed)) {
    const entry = parsed[key];
    if (!entry || entry.type !== "VEVENT") continue;

    const start = entry.start as Date | undefined;
    if (!start) continue;
    const end = entry.end as Date | undefined;

    results.push({
      uid: entry.uid || key,
      title: textValue(entry.summary) || "Untitled event",
      description: textValue(entry.description),
      location: textValue(entry.location),
      start: start.toISOString(),
      end: end ? end.toISOString() : undefined,
      allDay: Boolean((entry as { datetype?: string }).datetype === "date"),
    });
  }

  return results;
}

export interface ConnectorPreset {
  id: string;
  name: string;
  placeholder: string;
  helpUrl?: string;
}

export const connectorPresets: ConnectorPreset[] = [
  {
    id: "clubzap",
    name: "ClubZap",
    placeholder: "webcal://dashboard.clubzap.com/api/users/…/calendar/…",
    helpUrl: "https://help.clubzap.com/en/articles/5670104-how-do-i-synchronise-clubzap-events-with-my-calendar",
  },
  {
    id: "ddsl",
    name: "DDSL",
    placeholder: "https://...ics",
  },
  {
    id: "ical",
    name: "Generic calendar (iCal)",
    placeholder: "https://... .ics",
  },
];
