"use client";

import { useState } from "react";
import { ChevronRight, Check, Pencil } from "lucide-react";
import type { BoardItem, Event, FamilyMember } from "../../src/core/models";
import { SaturnPlanet, Starfield, PushPin } from "./cosmic-illustrations";
import { EventIcon } from "./event-icon";
import { useNow } from "../../src/core/use-now";
import { formatHeroDate, findNextEvent } from "../../src/core/date-utils";

const FALLBACK_NOW = new Date(2026, 7, 26, 17, 0, 0);
const MAX_TODAY_ITEMS = 3;

interface TodayViewProps {
  currentUser: FamilyMember;
  events: Event[];
  board: BoardItem[];
  onNavigateToWeek: () => void;
  onNavigateToRemember?: () => void;
  onOpenAdd: () => void;
  onToggleTask?: (id: string) => void;
  onEditItem?: (item: BoardItem) => void;
}

export function TodayView({
  currentUser,
  events,
  board,
  onNavigateToWeek,
  onNavigateToRemember,
  onToggleTask,
  onEditItem,
}: TodayViewProps) {
  const now = useNow();
  const effectiveNow = now ?? FALLBACK_NOW;

  // Find the next genuinely upcoming event for the current user (falling
  // back to any family event if they have none scheduled).
  const userEvents = events.filter((e) => e.personIds.includes(currentUser.id));
  const nextEvent = findNextEvent(userEvents.length > 0 ? userEvents : events, effectiveNow);

  // Pinned/first note for the tilted sticky note.
  const notes = board.filter((b) => b.type === "note" || !b.type);
  const stickyNote = notes.find((b) => b.pinned) || notes[0];

  // A short, actionable summary of outstanding tasks/reminders — the rest
  // live on the "Remember" screen, linked below.
  const actionable = board.filter((b) => b.type === "task" || b.type === "reminder");
  const outstanding = actionable.filter((b) => !b.completed);
  const todayItems = (outstanding.length > 0 ? outstanding : actionable).slice(0, MAX_TODAY_ITEMS);

  const [isRocking, setIsRocking] = useState(false);

  const handleNoteRock = () => {
    setIsRocking(true);
    setTimeout(() => setIsRocking(false), 900);
  };

  return (
    <div className="screen today-mobile-screen">
      {/* 1. Cosmic Hero Banner with floating Saturn & twinkling starfield */}
      <section className="cosmic-hero-card">
        <Starfield />

        <div className="hero-content">
          <div className="hero-text-block">
            <p className="hero-date">{formatHeroDate(effectiveNow)}</p>
            <h1 className="hero-greeting">Hi, {currentUser.name}!</h1>
            <p className="hero-subtitle">Here’s what you need today.</p>
          </div>

          <div className="hero-planet-anchor float-anim">
            <SaturnPlanet size={88} />
          </div>
        </div>

        {/* 2. "UP NEXT" Floating Card */}
        {nextEvent && (
          <div
            className="up-next-card interactive-card"
            role="button"
            tabIndex={0}
            onClick={onNavigateToWeek}
            onKeyDown={(e) => e.key === "Enter" && onNavigateToWeek()}
            aria-label={`Up next: ${nextEvent.title}`}
          >
            <div className="up-next-header">
              <span className="up-next-label">UP NEXT</span>
            </div>

            <div className="up-next-body">
              <span className="up-next-accent-stripe" />
              <div className="up-next-info">
                <h3 className="up-next-title">
                  {nextEvent.title} <EventIcon icon={nextEvent.icon} category={nextEvent.category} size={20} />
                </h3>
                <p className="up-next-meta">
                  {nextEvent.start ? formatDayLabel(nextEvent.start, effectiveNow) : "Today"} ·{" "}
                  {nextEvent.start ? formatTime(nextEvent.start) : "17:00"}
                  {nextEvent.location ? ` · ${nextEvent.location}` : ""}
                </p>
              </div>
              <div className="up-next-action">
                <ChevronRight className="chevron-purple" size={22} strokeWidth={2.5} />
              </div>
            </div>
          </div>
        )}
      </section>

      {/* 3. "See my week" Quick Action Banner */}
      <section className="quick-action-section">
        <button
          type="button"
          className="see-my-week-btn interactive-card"
          onClick={onNavigateToWeek}
          aria-label="See my week"
        >
          <div className="btn-icon-label">
            {/* Icon-pack calendar badge */}
            <span className="mint-cal-icon-wrap">
              <img src="/icon_pack/nav_calendar.png" alt="" width={32} height={32} />
            </span>
            <span className="btn-text">See my week</span>
          </div>
          <ChevronRight size={22} strokeWidth={2.5} className="mint-chevron" />
        </button>
      </section>

      {/* 4. "FOR YOU" Section with Quirky Tilted Sticky Note & Task List */}
      <section className="for-you-section">
        <div className="for-you-header-row">
          <h2 className="for-you-heading">FOR YOU</h2>
          {onNavigateToRemember && (
            <button
              type="button"
              className="for-you-see-all-btn"
              onClick={onNavigateToRemember}
            >
              See all
              <ChevronRight size={14} />
            </button>
          )}
        </div>

        {/* Quirky Yellow Tilted Sticky Note with 3D Purple Pushpin & Rocking Motion */}
        {stickyNote && (
          <div
            className={`sticky-note-card quirky-tilted-note ${isRocking ? "rock-anim" : ""}`}
            onClick={handleNoteRock}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => e.key === "Enter" && handleNoteRock()}
            title="Tap to rock note!"
            aria-label={`Note: ${stickyNote.text}`}
          >
            {/* 3D Purple Pushpin centered at top edge */}
            <div className="pin-container">
              <PushPin />
            </div>

            {onEditItem && (
              <button
                type="button"
                className="sticky-note-edit-btn"
                onClick={(e) => {
                  e.stopPropagation();
                  onEditItem(stickyNote);
                }}
                aria-label="Edit note"
              >
                <Pencil size={14} />
              </button>
            )}

            <div className="sticky-note-inner">
              <span className="sticky-kicker">Remember this</span>
              <p className="sticky-text">{stickyNote.text}</p>

              <div className="sticky-footer">
                <span
                  className="member-tag-circle"
                  style={{ backgroundColor: currentUser.colour || "#6C4DFF" }}
                >
                  {currentUser.shortName || currentUser.name.charAt(0)}
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Compact list of outstanding tasks & reminders — tap to complete,
            pencil to edit. Full history lives on the Remember screen. */}
        {todayItems.length > 0 && (
          <div className="today-task-list">
            {todayItems.map((item) => {
              const isTask = item.type === "task";
              const done = !!item.completed;
              return (
                <div
                  key={item.id}
                  className={`task-row-card interactive-card ${done ? "task-completed" : ""}`}
                  role="button"
                  tabIndex={0}
                  onClick={() => {
                    if (isTask) onToggleTask?.(item.id);
                    else onEditItem?.(item);
                  }}
                  onKeyDown={(e) => {
                    if (e.key !== "Enter") return;
                    if (isTask) onToggleTask?.(item.id);
                    else onEditItem?.(item);
                  }}
                  aria-label={`${isTask ? "Task" : "Reminder"}: ${item.text}`}
                >
                  <div className="task-left">
                    {isTask ? (
                      <span className={`task-checkbox-circle ${done ? "checked" : ""}`}>
                        <Check size={16} strokeWidth={3} className="task-check-icon" />
                      </span>
                    ) : (
                      <span className="task-checkbox-circle reminder-marker" aria-hidden="true">
                        🔔
                      </span>
                    )}
                    <span className="task-title-text">{item.text}</span>
                  </div>

                  <div className="task-right">
                    <span
                      className="member-tag-circle mint-theme"
                      style={{ backgroundColor: isTask ? "#22C1A2" : "#FF6FA5" }}
                    >
                      {currentUser.shortName || currentUser.name.charAt(0)}
                    </span>
                    {onEditItem && (
                      <button
                        type="button"
                        className="task-edit-mini-btn"
                        onClick={(e) => {
                          e.stopPropagation();
                          onEditItem(item);
                        }}
                        aria-label={`Edit ${isTask ? "task" : "reminder"}`}
                      >
                        <Pencil size={14} />
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>
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

function formatDayLabel(iso: string, now: Date) {
  try {
    const d = new Date(iso);
    const sameDay =
      d.getFullYear() === now.getFullYear() &&
      d.getMonth() === now.getMonth() &&
      d.getDate() === now.getDate();
    if (sameDay) return "Today";

    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const isTomorrow =
      d.getFullYear() === tomorrow.getFullYear() &&
      d.getMonth() === tomorrow.getMonth() &&
      d.getDate() === tomorrow.getDate();
    if (isTomorrow) return "Tomorrow";

    return new Intl.DateTimeFormat("en-IE", { weekday: "short", day: "numeric" }).format(d);
  } catch {
    return "Today";
  }
}
