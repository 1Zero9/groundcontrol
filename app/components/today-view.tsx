"use client";

import React, { useState } from "react";
import { ChevronRight, Check } from "lucide-react";
import type { BoardItem, Event, FamilyMember } from "../../src/core/models";
import { SaturnPlanet, Starfield, PushPin } from "./cosmic-illustrations";

interface TodayViewProps {
  currentUser: FamilyMember;
  events: Event[];
  board: BoardItem[];
  onNavigateToWeek: () => void;
  onOpenAdd: () => void;
  onToggleTask?: (id: string) => void;
}

export function TodayView({
  currentUser,
  events,
  board,
  onNavigateToWeek,
  onOpenAdd,
  onToggleTask,
}: TodayViewProps) {
  // Find next up event for current user
  const userEvents = events.filter((e) => e.personIds.includes(currentUser.id));
  const nextEvent = userEvents[0] || events[0];

  // Notes and tasks for current user
  const stickyNote = board.find((b) => b.id === "b-money" || b.pinned || b.type === "note") || board[0];
  const primaryTask = board.find((b) => b.id === "b-form" || b.type === "task") || board[1];

  const [taskDone, setTaskDone] = useState(primaryTask?.completed || false);
  const [isRocking, setIsRocking] = useState(false);

  const handleTaskClick = () => {
    setTaskDone(!taskDone);
    if (primaryTask && onToggleTask) {
      onToggleTask(primaryTask.id);
    }
  };

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
            <p className="hero-date">Wednesday · 26 August</p>
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
                  {nextEvent.title} {nextEvent.icon || "⚽"}
                </h3>
                <p className="up-next-meta">
                  Today · {nextEvent.start ? formatTime(nextEvent.start) : "17:00"} ·{" "}
                  {nextEvent.location || "Belvedere"}
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
            {/* Custom Mint Outline Calendar Icon matching Image 1 */}
            <span className="mint-cal-icon-wrap">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="4" width="18" height="18" rx="4" />
                <line x1="16" y1="2" x2="16" y2="6" />
                <line x1="8" y1="2" x2="8" y2="6" />
                <line x1="3" y1="10" x2="21" y2="10" />
                <circle cx="8" cy="14" r="1" fill="currentColor" />
                <circle cx="12" cy="14" r="1" fill="currentColor" />
                <circle cx="16" cy="14" r="1" fill="currentColor" />
                <circle cx="8" cy="18" r="1" fill="currentColor" />
                <circle cx="12" cy="18" r="1" fill="currentColor" />
              </svg>
            </span>
            <span className="btn-text">See my week</span>
          </div>
          <ChevronRight size={22} strokeWidth={2.5} className="mint-chevron" />
        </button>
      </section>

      {/* 4. "FOR YOU" Section with Quirky Tilted Sticky Note & Task Card */}
      <section className="for-you-section">
        <h2 className="for-you-heading">FOR YOU</h2>

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

        {/* Mint Task Card with Checkmark micro-animation */}
        {primaryTask && (
          <div
            className={`task-row-card interactive-card ${taskDone ? "task-completed" : ""}`}
            role="button"
            tabIndex={0}
            onClick={handleTaskClick}
            onKeyDown={(e) => e.key === "Enter" && handleTaskClick()}
            aria-label={`Task: ${primaryTask.text}`}
          >
            <div className="task-left">
              <button
                type="button"
                className={`task-checkbox-circle ${taskDone ? "checked pop-anim" : ""}`}
                aria-label={taskDone ? "Mark incomplete" : "Mark complete"}
              >
                <Check size={16} strokeWidth={3} className="task-check-icon" />
              </button>
              <span className="task-title-text">{primaryTask.text}</span>
            </div>

            <div className="task-right">
              <span
                className="member-tag-circle mint-theme"
                style={{ backgroundColor: "#22C1A2" }}
              >
                {currentUser.shortName || currentUser.name.charAt(0)}
              </span>
            </div>
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
