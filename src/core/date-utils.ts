export interface WeekDayInfo {
  dayName: string;
  dateNum: string;
  iso: string;
  dotColor: string;
  isToday: boolean;
}

const DOT_PALETTE = ["#6C7E90", "#22C1A2", "#6C4DFF", "#22C1A2", "#6C4DFF", "#22C1A2", "#FF5CA8"];
const DAY_NAMES = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

export function toISODate(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function getMonday(date: Date): Date {
  const d = new Date(date);
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

export function getWeekDays(referenceDate: Date, today: Date = referenceDate): WeekDayInfo[] {
  const monday = getMonday(referenceDate);
  const todayIso = toISODate(today);
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    const iso = toISODate(d);
    return {
      dayName: DAY_NAMES[i],
      dateNum: String(d.getDate()),
      iso,
      dotColor: DOT_PALETTE[i],
      isToday: iso === todayIso,
    };
  });
}

export function formatHeroDate(date: Date): string {
  return new Intl.DateTimeFormat("en-IE", {
    weekday: "long",
    day: "numeric",
    month: "long",
  }).format(date);
}

export function findNextEvent<T extends { start: string; end?: string }>(
  events: T[],
  now: Date = new Date()
): T | undefined {
  const nowTime = now.getTime();
  const upcoming = events
    .filter((e) => {
      const endTime = new Date(e.end || e.start).getTime();
      return !Number.isNaN(endTime) && endTime >= nowTime;
    })
    .sort((a, b) => new Date(a.start).getTime() - new Date(b.start).getTime());
  return upcoming[0] ?? events[0];
}
