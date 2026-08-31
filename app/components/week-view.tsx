"use client";

import { useMemo, useRef, useState } from "react";
import type { PointerEvent as ReactPointerEvent } from "react";
import { ChevronLeft, ChevronRight, Clock, EyeOff } from "lucide-react";
import type { Event, FamilyMember } from "../../src/core/models";
import { EventIcon } from "./event-icon";
import { useNow } from "../../src/core/use-now";
import { getWeekDays, toISODate } from "../../src/core/date-utils";

const FALLBACK_TODAY = new Date(2026, 7, 26);

// Width of the revealed Snooze + Hide buttons behind a swiped card, and how
// far it needs to be dragged before it snaps fully open on release.
const ACTIONS_WIDTH = 144;
const OPEN_THRESHOLD = 48;

interface WeekViewProps {
  currentUser: FamilyMember;
  family: FamilyMember[];
  events: Event[];
  onOpenAdd: () => void;
  onSelectEvent?: (event: Event) => void;
  onHideEvent?: (id: string) => void;
  onSnoozeEvent?: (id: string) => void;
}

export function WeekView({
  family,
  events,
  onOpenAdd,
  onSelectEvent,
  onHideEvent,
  onSnoozeEvent,
}: WeekViewProps) {
  const now = useNow();
  const today = now ?? FALLBACK_TODAY;
  const todayIso = toISODate(today);

  const [weekOffset, setWeekOffset] = useState(0);
  const [selectedDay, setSelectedDay] = useState<string | null>(null);
  const [selectedPersonId, setSelectedPersonId] = useState<string>("all");
  const [mode, setMode] = useState<"day" | "week">("week");

  // Swipe-to-reveal state for the Hide/Snooze actions on each card. Only one
  // card can be open at a time; `liveDrag` tracks the finger/mouse mid-drag
  // for real-time feedback, separately from the "settled" open card.
  const [openCardId, setOpenCardId] = useState<string | null>(null);
  const [liveDrag, setLiveDrag] = useState<{ id: string; x: number } | null>(null);
  const dragInfo = useRef<{ id: string; startX: number; lastX: number; dragging: boolean } | null>(
    null
  );
  const wasDraggingRef = useRef(false);

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

  // Swiped "hidden" events stay hidden until unhidden elsewhere; "snoozed"
  // events reappear on their own once their snooze time has passed.
  const isDismissed = (evt: Event) => {
    if (evt.hiddenAt) return true;
    if (evt.snoozedUntil && new Date(evt.snoozedUntil).getTime() > today.getTime()) return true;
    return false;
  };

  const getEventColor = (evt: Event) => {
    const primaryMember = family.find((m) => evt.personIds.includes(m.id));
    return evt.accentColor || primaryMember?.colour || "#6C4DFF";
  };

  const getAssignedMembers = (evt: Event) =>
    evt.personIds
      .map((pid) => family.find((m) => m.id === pid))
      .filter((m): m is FamilyMember => !!m);

  // Events for the currently selected day only.
  const dayEvents = useMemo(
    () =>
      events
        .filter(
          (evt) => matchesPerson(evt) && !isDismissed(evt) && evt.start.startsWith(effectiveSelectedDay)
        )
        .sort((a, b) => new Date(a.start).getTime() - new Date(b.start).getTime()),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [events, selectedPersonId, effectiveSelectedDay, today]
  );

  // All events across the currently viewed week, sorted chronologically.
  const weekEvents = useMemo(() => {
    const isoSet = new Set(weekDays.map((d) => d.iso));
    return events
      .filter((evt) => matchesPerson(evt) && !isDismissed(evt) && isoSet.has(evt.start.slice(0, 10)))
      .sort((a, b) => new Date(a.start).getTime() - new Date(b.start).getTime());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [events, selectedPersonId, weekDays, today]);

  const displayEvents = mode === "week" ? weekEvents : dayEvents;

  const dayLabelFor = (evt: Event) =>
    weekDays.find((d) => d.iso === evt.start.slice(0, 10))?.dayName ?? "";

  // Which days in the current week strip actually have events, and what
  // color their dot should be (the first matching event's accent color).
  const dotColorByDay = useMemo(() => {
    const map = new Map<string, string>();
    for (const d of weekDays) {
      const evt = events.find((e) => matchesPerson(e) && !isDismissed(e) && e.start.startsWith(d.iso));
      if (evt) map.set(d.iso, getEventColor(evt));
    }
    return map;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [events, selectedPersonId, weekDays, family, today]);

  const getCardTranslateX = (id: string) => {
    if (liveDrag && liveDrag.id === id) return liveDrag.x;
    return openCardId === id ? -ACTIONS_WIDTH : 0;
  };

  const handlePointerDown = (id: string) => (e: ReactPointerEvent<HTMLDivElement>) => {
    if (e.pointerType === "mouse" && e.button !== 0) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    dragInfo.current = { id, startX: e.clientX, lastX: e.clientX, dragging: false };
    if (openCardId && openCardId !== id) setOpenCardId(null);
  };

  const handlePointerMove = (id: string) => (e: ReactPointerEvent<HTMLDivElement>) => {
    const info = dragInfo.current;
    if (!info || info.id !== id) return;
    const dx = e.clientX - info.startX;
    if (Math.abs(dx) > 6) info.dragging = true;
    info.lastX = e.clientX;
    const base = openCardId === id ? -ACTIONS_WIDTH : 0;
    const next = Math.min(0, Math.max(-ACTIONS_WIDTH, base + dx));
    setLiveDrag({ id, x: next });
  };

  const endDrag = (id: string) => {
    const info = dragInfo.current;
    dragInfo.current = null;
    if (!info || info.id !== id) {
      setLiveDrag(null);
      return;
    }
    const dx = info.lastX - info.startX;
    const base = openCardId === id ? -ACTIONS_WIDTH : 0;
    const finalX = Math.min(0, Math.max(-ACTIONS_WIDTH, base + dx));
    setLiveDrag(null);
    wasDraggingRef.current = info.dragging;
    if (info.dragging) {
      setOpenCardId(finalX <= -OPEN_THRESHOLD ? id : null);
    }
  };

  const handleCardClick = (evt: Event) => () => {
    if (wasDraggingRef.current) {
      wasDraggingRef.current = false;
      return;
    }
    if (openCardId === evt.id) {
      setOpenCardId(null);
      return;
    }
    onSelectEvent?.(evt);
  };

  const handleHideClick = (evt: Event) => (e: React.MouseEvent) => {
    e.stopPropagation();
    setOpenCardId(null);
    onHideEvent?.(evt.id);
  };

  const handleSnoozeClick = (evt: Event) => (e: React.MouseEvent) => {
    e.stopPropagation();
    setOpenCardId(null);
    onSnoozeEvent?.(evt.id);
  };

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
              const assignedMembers = getAssignedMembers(evt);
              const translateX = getCardTranslateX(evt.id);

              return (
                <div className="timeline-card-swipe-wrap" key={evt.id}>
                  <div className="timeline-card-actions" aria-hidden={openCardId !== evt.id}>
                    <button
                      type="button"
                      className="timeline-action-btn snooze-action-btn"
                      onClick={handleSnoozeClick(evt)}
                      tabIndex={openCardId === evt.id ? 0 : -1}
                    >
                      <Clock size={18} strokeWidth={2.5} />
                      <span>Snooze</span>
                    </button>
                    <button
                      type="button"
                      className="timeline-action-btn hide-action-btn"
                      onClick={handleHideClick(evt)}
                      tabIndex={openCardId === evt.id ? 0 : -1}
                    >
                      <EyeOff size={18} strokeWidth={2.5} />
                      <span>Hide</span>
                    </button>
                  </div>

                  <div
                    className="timeline-event-card"
                    role="button"
                    tabIndex={0}
                    style={{
                      transform: `translateX(${translateX}px)`,
                      transition: liveDrag?.id === evt.id ? "none" : "transform 0.2s ease",
                    }}
                    onPointerDown={handlePointerDown(evt.id)}
                    onPointerMove={handlePointerMove(evt.id)}
                    onPointerUp={() => endDrag(evt.id)}
                    onPointerCancel={() => endDrag(evt.id)}
                    onClick={handleCardClick(evt)}
                    onKeyDown={(e) => e.key === "Enter" && onSelectEvent?.(evt)}
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

                    {/* Who it's for */}
                    {assignedMembers.length > 0 && (
                      <div className="assignee-avatar-stack">
                        {assignedMembers.slice(0, 3).map((m, idx) => (
                          <span
                            key={m.id}
                            className="assignee-avatar"
                            style={{ backgroundColor: m.colour, zIndex: 3 - idx }}
                            title={m.name}
                          >
                            {m.shortName || m.name.charAt(0)}
                          </span>
                        ))}
                        {assignedMembers.length > 3 && (
                          <span className="assignee-avatar assignee-avatar-more">
                            +{assignedMembers.length - 3}
                          </span>
                        )}
                      </div>
                    )}

                    {/* Right Category Icon */}
                    <div className="timeline-icon-col">
                      <span className="category-emoji-badge">
                        <EventIcon icon={evt.icon} category={evt.category} size={22} />
                      </span>
                    </div>
                  </div>
                </div>
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
