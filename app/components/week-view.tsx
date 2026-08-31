"use client";

import { useMemo, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import type { Event, FamilyMember } from "../../src/core/models";
import { EventIcon } from "./event-icon";
import { useNow } from "../../src/core/use-now";
import { getWeekDays, toISODate } from "../../src/core/date-utils";

const FALLBACK_TODAY = new Date(2026, 7, 26);

interface WeekViewProps {
  currentUser: FamilyMember;
  family: FamilyMember[];
  events: Event[];
  onOpenAdd: () => void;
  onSelectEvent?: (event: Event) => void;
}

export function WeekView({
  family,
  events,
  onOpenAdd,
  onSelectEvent,
}: WeekViewProps) {
  const now = useNow();
  const today = now ?? FALLBACK_TODAY;
  const todayIso = toISODate(today);

  const [weekOffset, setWeekOffset] = useState(0);
  const [selectedDay, setSelectedDay] = useState<string | null>(null);
  const [selectedPersonId, setSelectedPersonId] = useState<string>("all");
  const [mode, setMode] = useState<"day" | "week">("day");

  const referenceDate = useMemo(() => {
    const d = new Date(today);
    d.setDate(d.getDate() + weekOffset * 7);
    return d;
  }, [today, weekOffset]);

  const weekDays = useMemo(() => getWeekDays(referenceDate, today), [referenceDate, today]);

  const effectiveSelectedDay = selectedDay ?? todayIso;

  // Navigate to a different week, defaulting the selected day to today (if
  // that week contains today) or the Monday of that week otherwise.
  const goToWeek = (offset: number) => {
    setWeekOffset(offset);
    if (offset === 0) {
      setSelectedDay(todayIso);
    } else {
      const ref = new Date(today);
      ref.setDate(ref.getDate() + offset * 7);
      const days = getWeekDays(ref, today);
      setSelectedDay(days[0]?.iso ?? null);
    }
  };

  const weekRangeLabel = useMemo(() => {
    const first = weekDays[0];
    const last = weekDays[6];
    if (!first || !last) return "";
    const monday = new Date(referenceDate);
    monday.setDate(monday.getDate() - ((monday.getDay() + 6) % 7));
    const sunday = new Date(monday);
    sunday.setDate(monday.getDate() + 6);
    const monthFmt = (d: Date) => new Intl.DateTimeFormat("en-IE", { month: "short" }).format(d);
    return monthFmt(monday) === monthFmt(sunday)
      ? first.dateNum + "-" + last.dateNum + " " + monthFmt(monday)
      : first.dateNum + " " + monthFmt(monday) + " - " + last.dateNum + " " + monthFmt(sunday);
  }, [weekDays, referenceDate]);

  const matchesPerson = (evt: Event) =>
    selectedPersonId === "all" || evt.personIds.includes(selectedPersonId);

  const getEventColor = (evt: Event) => {
    const primaryMember = family.find((m) => evt.personIds.includes(m.id));
    return evt.accentColor || primaryMember?.colour || "#6C4DFF";
  };

  // Events for the currently selected day only.
  const dayEvents = useMemo(
    () =>
      events
        .filter((evt) => matchesPerson(evt) && evt.start.startsWith(effectiveSelectedDay))
        .sort((a, b) => new Date(a.start).getTime() - new Date(b.start).getTime()),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [events, selectedPersonId, effectiveSelectedDay]
  );

  // All events across the currently viewed week, sorted chronologically.
  const weekEvents = useMemo(() => {
    const isoSet = new Set(weekDays.map((d) => d.iso));
    return events
      .filter((evt) => matchesPerson(evt) && isoSet.has(evt.start.slice(0, 10)))
      .sort((a, b) => new Date(a.start).getTime() - new Date(b.start).getTime());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [events, selectedPersonId, weekDays]);

  const displayEvents = mode === "week" ? weekEvents : dayEvents;

  const dayLabelFor = (evt: Event) =>
    weekDays.find((d) => d.iso === evt.start.slice(0, 10))?.dayName ?? "";

  // Which days in the current week strip actually have events, and what
  // color their dot should be (the first matching event's accent color).
  const dotColorByDay = useMemo(() => {
    const map = new Map<string, string>();
    for (const d of weekDays) {
      const evt = events.find((e) => matchesPerson(e) && e.start.startsWith(d.iso));
      if (evt) map.set(d.iso, getEventColor(evt));
    }
    return map;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [events, selectedPersonId, weekDays, family]);

  return (
    <div className="screen week-mobile-screen">
      {/* Header */}
      <div className="week-header-row">
        <div>
          <h1 className="screen-title">My Week</h1>
          <p className="screen-subtitle">Everyone’s schedule in one orbit</p>
        </div>

        {/* Day / Week mode toggle */}
        <div className="view-mode-toggle" role="tablist" aria-label="View mode">
          <button
            type="button"
            role="tab"
            aria-selected={mode === "day"}
            className={`view-mode-btn ${mode === "day" ? "active" : ""}`}
            onClick={() => setMode("day")}
          >
            Day
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={mode === "week"}
            className={`view-mode-btn ${mode === "week" ? "active" : ""}`}
            onClick={() => setMode("week")}
          >
            Week
          </button>
        </div>

        {/* Member filter chips */}
        <div className="family-avatar-filter" role="tablist" aria-label="Filter by member">
          <button
            type="button"
            className={`member-filter-chip ${selectedPersonId === "all" ? "active" : ""}`}
            onClick={() => setSelectedPersonId("all")}
          >
            All
          </button>
          {family.map((m) => (
            <button
              key={m.id}
              type="button"
              className={`member-filter-chip ${selectedPersonId === m.id ? "active" : ""}`}
              onClick={() => setSelectedPersonId(m.id)}
              style={{
                borderColor: selectedPersonId === m.id ? m.colour : "transparent",
              }}
              title={m.name}
            >
              <span
                className="chip-circle"
                style={{ backgroundColor: m.colour }}
              >
                {m.shortName || m.name.charAt(0)}
              </span>
              <span className="chip-name">{m.name}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Week Day Strip with prev/next navigation */}
      <div className="week-day-strip-container">
        <div className="week-nav-row">
          <button
            type="button"
            className="week-nav-btn"
            onClick={() => goToWeek(weekOffset - 1)}
            aria-label="Previous week"
          >
            <ChevronLeft size={18} strokeWidth={2.5} />
          </button>
          <button
            type="button"
            className="week-nav-label"
            onClick={() => goToWeek(0)}
            title={weekOffset !== 0 ? "Jump back to this week" : undefined}
          >
            {weekOffset === 0 ? "This week" : weekRangeLabel}
          </button>
          <button
            type="button"
            className="week-nav-btn"
            onClick={() => goToWeek(weekOffset + 1)}
            aria-label="Next week"
          >
            <ChevronRight size={18} strokeWidth={2.5} />
          </button>
        </div>
        <div className="week-day-strip" role="tablist">
          {weekDays.map((d) => {
            const isSelected = effectiveSelectedDay === d.iso;
            return (
              <button
                key={d.iso}
                type="button"
                role="tab"
                aria-selected={isSelected}
                className={`day-strip-item ${isSelected ? "selected-day" : ""}`}
                onClick={() => setSelectedDay(d.iso)}
              >
                <span className="day-name-label">{d.dayName}</span>
                <div className={`day-num-bubble ${d.isToday && !isSelected ? "is-today" : ""}`}>
                  <span>{d.dateNum}</span>
                </div>
                {dotColorByDay.has(d.iso) && (
                  <span
                    className="day-dot"
                    style={{
                      backgroundColor: isSelected ? "#6C4DFF" : dotColorByDay.get(d.iso),
                    }}
                  />
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Timeline Events List */}
      <div className="timeline-container">
        {displayEvents.length === 0 ? (
          <div className="empty-day-state">
            <span className="empty-icon">🪐</span>
            <h3>{mode === "week" ? "Nothing scheduled this week" : "Nothing scheduled for this day"}</h3>
            <p>Enjoy the free time or add a new activity!</p>
            <button
              type="button"
              className="quick-add-link-btn"
              onClick={onOpenAdd}
            >
              + Add something
            </button>
          </div>
        ) : (
          <div className="timeline-event-list">
            {displayEvents.map((evt) => {
              const accentColor = getEventColor(evt);
              const timeDisplay = evt.allDay ? "All day" : formatTime(evt.start);

              return (
                <button
                  key={evt.id}
                  type="button"
                  className="timeline-event-card"
                  onClick={() => onSelectEvent?.(evt)}
                >
                  {/* Left Color Stripe */}
                  <span
                    className="timeline-stripe"
                    style={{ backgroundColor: accentColor }}
                  />

                  {/* Time column */}
                  <div className="timeline-time-col">
                    {mode === "week" && (
                      <span className="timeline-day-badge">{dayLabelFor(evt)}</span>
                    )}
                    <span className="event-time-text">{timeDisplay}</span>
                  </div>

                  {/* Main Event Copy */}
                  <div className="timeline-info-col">
                    <h3 className="event-title-text">{evt.title}</h3>
                    <p className="event-location-text">
                      {evt.location || "Home"}
                      {evt.description ? ` · ${evt.description}` : ""}
                    </p>
                  </div>

                  {/* Right Category Icon */}
                  <div className="timeline-icon-col">
                    <span className="category-emoji-badge">
                      <EventIcon icon={evt.icon} category={evt.category} size={22} />
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

function formatTime(iso: string) {
  try {
    const d = new Date(iso);
    return new Intl.DateTimeFormat("en-IE", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    }).format(d);
  } catch {
    return "17:00";
  }
}
