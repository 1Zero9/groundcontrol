"use client";

import React, { useState } from "react";
import { Plus } from "lucide-react";
import type { Event, FamilyMember } from "../../src/core/models";

const weekDays = [
  { dayName: "Mon", dateNum: "24", iso: "2026-08-24", dotColor: "#6C7E90" },
  { dayName: "Tue", dateNum: "25", iso: "2026-08-25", dotColor: "#22C1A2" },
  { dayName: "Wed", dateNum: "26", iso: "2026-08-26", dotColor: "#6C4DFF" },
  { dayName: "Thu", dateNum: "27", iso: "2026-08-27", dotColor: "#22C1A2" },
  { dayName: "Fri", dateNum: "28", iso: "2026-08-28", dotColor: "#6C4DFF" },
  { dayName: "Sat", dateNum: "29", iso: "2026-08-29", dotColor: "#22C1A2" },
  { dayName: "Sun", dateNum: "30", iso: "2026-08-30", dotColor: "#FF5CA8" },
];

interface WeekViewProps {
  currentUser: FamilyMember;
  family: FamilyMember[];
  events: Event[];
  onOpenAdd: () => void;
  onSelectEvent?: (event: Event) => void;
}

export function WeekView({
  currentUser,
  family,
  events,
  onOpenAdd,
  onSelectEvent,
}: WeekViewProps) {
  const [selectedDay, setSelectedDay] = useState("2026-08-26");
  const [selectedPersonId, setSelectedPersonId] = useState<string>("all");

  // Filter events by person and day
  const filteredEvents = events.filter((evt) => {
    const matchesPerson =
      selectedPersonId === "all"
        ? true
        : evt.personIds.includes(selectedPersonId);
    const matchesDay = selectedDay ? evt.start.startsWith(selectedDay) : true;
    return matchesPerson && matchesDay;
  });

  // Fallback: If no events on chosen day, show all events for the week sorted
  const displayEvents =
    filteredEvents.length > 0
      ? filteredEvents
      : events.filter((evt) =>
          selectedPersonId === "all"
            ? true
            : evt.personIds.includes(selectedPersonId)
        );

  return (
    <div className="screen week-mobile-screen">
      {/* Header */}
      <div className="week-header-row">
        <div>
          <h1 className="screen-title">My Week</h1>
          <p className="screen-subtitle">Everyone’s schedule in one orbit</p>
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

      {/* Week Day Strip (Mon 24 - Sun 30) */}
      <div className="week-day-strip-container">
        <div className="week-day-strip" role="tablist">
          {weekDays.map((d) => {
            const isSelected = selectedDay === d.iso;
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
                <div className="day-num-bubble">
                  <span>{d.dateNum}</span>
                </div>
                <span
                  className="day-dot"
                  style={{
                    backgroundColor: isSelected ? "#6C4DFF" : d.dotColor,
                  }}
                />
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
            <h3>Nothing scheduled for this day</h3>
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
              const primaryMember = family.find((m) =>
                evt.personIds.includes(m.id)
              );
              const accentColor =
                evt.accentColor || primaryMember?.colour || "#6C4DFF";
              const timeDisplay = evt.allDay ? "All day" : formatTime(evt.start);

              return (
                <article
                  key={evt.id}
                  className="timeline-event-card"
                  onClick={() => onSelectEvent?.(evt)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => e.key === "Enter" && onSelectEvent?.(evt)}
                >
                  {/* Left Color Stripe */}
                  <span
                    className="timeline-stripe"
                    style={{ backgroundColor: accentColor }}
                  />

                  {/* Time column */}
                  <div className="timeline-time-col">
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
                    <span className="category-emoji-badge" aria-hidden="true">
                      {evt.icon || getCategoryIcon(evt.category)}
                    </span>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </div>

      {/* Floating Action Button (FAB) */}
      <button
        type="button"
        className="floating-add-btn"
        onClick={onOpenAdd}
        aria-label="Add new event, task or note"
      >
        <Plus size={28} strokeWidth={2.5} />
      </button>
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

function getCategoryIcon(cat: string) {
  switch (cat) {
    case "sports":
      return "⚽";
    case "family":
      return "💖";
    case "school":
      return "🚌";
    case "appointment":
      return "🦷";
    case "college":
      return "🎓";
    case "work":
      return "💼";
    default:
      return "🗓️";
  }
}
