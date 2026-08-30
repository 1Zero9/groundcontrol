import { describe, expect, it } from "vitest";
import { toISODate, getMonday, getWeekDays, formatHeroDate, findNextEvent } from "./date-utils";

describe("toISODate", () => {
  it("formats a date as YYYY-MM-DD", () => {
    expect(toISODate(new Date(2026, 7, 26))).toBe("2026-08-26");
  });

  it("pads single-digit months and days", () => {
    expect(toISODate(new Date(2026, 0, 5))).toBe("2026-01-05");
  });
});

describe("getMonday", () => {
  it("returns the same date when given a Monday", () => {
    const monday = new Date(2026, 7, 24); // 2026-08-24 is a Monday
    expect(toISODate(getMonday(monday))).toBe("2026-08-24");
  });

  it("rolls forward-in-week days back to that week's Monday", () => {
    const wednesday = new Date(2026, 7, 26);
    expect(toISODate(getMonday(wednesday))).toBe("2026-08-24");
  });

  it("treats Sunday as the end of the previous week", () => {
    const sunday = new Date(2026, 7, 30);
    expect(toISODate(getMonday(sunday))).toBe("2026-08-24");
  });

  it("zeroes out the time component", () => {
    const withTime = new Date(2026, 7, 26, 13, 45, 30);
    const monday = getMonday(withTime);
    expect(monday.getHours()).toBe(0);
    expect(monday.getMinutes()).toBe(0);
    expect(monday.getSeconds()).toBe(0);
  });
});

describe("getWeekDays", () => {
  it("returns 7 days starting Monday and ending Sunday", () => {
    const reference = new Date(2026, 7, 26);
    const days = getWeekDays(reference);
    expect(days).toHaveLength(7);
    expect(days[0].iso).toBe("2026-08-24");
    expect(days[6].iso).toBe("2026-08-30");
    expect(days[0].dayName).toBe("Mon");
    expect(days[6].dayName).toBe("Sun");
  });

  it("marks the correct day as today", () => {
    const reference = new Date(2026, 7, 26);
    const today = new Date(2026, 7, 26);
    const days = getWeekDays(reference, today);
    const todayEntries = days.filter((d) => d.isToday);
    expect(todayEntries).toHaveLength(1);
    expect(todayEntries[0].iso).toBe("2026-08-26");
  });

  it("marks no day as today when today falls outside the reference week", () => {
    const reference = new Date(2026, 7, 26);
    const today = new Date(2026, 8, 15);
    const days = getWeekDays(reference, today);
    expect(days.every((d) => !d.isToday)).toBe(true);
  });
});

describe("formatHeroDate", () => {
  it("formats a date with weekday, day, and month", () => {
    const result = formatHeroDate(new Date(2026, 7, 26));
    expect(result).toContain("August");
    expect(result).toContain("26");
  });
});

describe("findNextEvent", () => {
  const now = new Date(2026, 7, 26, 12, 0, 0);

  it("returns the soonest event that hasn't ended yet", () => {
    const events = [
      { id: "a", start: "2026-08-27T09:00" },
      { id: "b", start: "2026-08-26T15:00" },
      { id: "c", start: "2026-08-25T09:00", end: "2026-08-25T10:00" },
    ];
    expect(findNextEvent(events, now)?.id).toBe("b");
  });

  it("uses end time (falling back to start) to decide if an event has passed", () => {
    const events = [
      { id: "ongoing", start: "2026-08-26T10:00", end: "2026-08-26T14:00" },
      { id: "later", start: "2026-08-26T16:00" },
    ];
    expect(findNextEvent(events, now)?.id).toBe("ongoing");
  });

  it("falls back to the first event when everything has already ended", () => {
    const events = [
      { id: "past1", start: "2026-08-20T09:00" },
      { id: "past2", start: "2026-08-21T09:00" },
    ];
    expect(findNextEvent(events, now)?.id).toBe("past1");
  });

  it("returns undefined for an empty list", () => {
    expect(findNextEvent([], now)).toBeUndefined();
  });
});
