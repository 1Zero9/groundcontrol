"use client";

import React, { useState, useEffect } from "react";
import {
  CalendarDays,
  Home,
  Users,
  Bell,
  StickyNote,
  Settings,
  Plus,
  Clock,
  Smartphone,
} from "lucide-react";
import type { Event, BoardItem, FamilyMember } from "../../src/core/models";
import { RocketMark, PushPin } from "./cosmic-illustrations";

interface KitchenDisplayViewProps {
  family: FamilyMember[];
  events: Event[];
  board: BoardItem[];
  currentUser: FamilyMember;
  onSelectUser: (user: FamilyMember) => void;
  onOpenAdd: () => void;
  onExit: () => void;
}

export function KitchenDisplayView({
  family,
  events,
  board,
  currentUser,
  onSelectUser,
  onOpenAdd,
  onExit,
}: KitchenDisplayViewProps) {
  const [timeStr, setTimeStr] = useState("18:42");
  const [activeTab, setActiveTab] = useState<"today" | "week" | "family" | "reminders" | "notes" | "settings">("today");

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setTimeStr(
        new Intl.DateTimeFormat("en-IE", {
          hour: "2-digit",
          minute: "2-digit",
          hour12: false,
        }).format(now)
      );
    };
    updateTime();
    const interval = setInterval(updateTime, 10000);
    return () => clearInterval(interval);
  }, []);

  const todayEvents = events.filter((e) => e.start.startsWith("2026-08-26"));
  const upcomingEvents = events.filter((e) => e.start > "2026-08-26T23:59");

  return (
    <div className="kitchen-display-container">
      {/* 1. Left Sidebar */}
      <aside className="kitchen-sidebar">
        <div className="kitchen-brand">
          <div className="kitchen-logo-mark">
            <RocketMark size={28} />
          </div>
          <div className="kitchen-brand-text">
            <span className="kitchen-title">Ground Control</span>
            <span className="kitchen-tagline">Family Mission Control</span>
          </div>
        </div>

        <nav className="kitchen-nav" aria-label="Kitchen Display navigation">
          <button
            type="button"
            className={`kitchen-nav-item ${activeTab === "today" ? "active" : ""}`}
            onClick={() => setActiveTab("today")}
          >
            <Home size={20} />
            <span>Today</span>
          </button>
          <button
            type="button"
            className={`kitchen-nav-item ${activeTab === "week" ? "active" : ""}`}
            onClick={() => setActiveTab("week")}
          >
            <CalendarDays size={20} />
            <span>My week</span>
          </button>
          <button
            type="button"
            className={`kitchen-nav-item ${activeTab === "family" ? "active" : ""}`}
            onClick={() => setActiveTab("family")}
          >
            <Users size={20} />
            <span>Family</span>
          </button>
          <button
            type="button"
            className={`kitchen-nav-item ${activeTab === "reminders" ? "active" : ""}`}
            onClick={() => setActiveTab("reminders")}
          >
            <Bell size={20} />
            <span>Reminders</span>
          </button>
          <button
            type="button"
            className={`kitchen-nav-item ${activeTab === "notes" ? "active" : ""}`}
            onClick={() => setActiveTab("notes")}
          >
            <StickyNote size={20} />
            <span>Notes</span>
          </button>
          <button
            type="button"
            className={`kitchen-nav-item ${activeTab === "settings" ? "active" : ""}`}
            onClick={() => setActiveTab("settings")}
          >
            <Settings size={20} />
            <span>Settings</span>
          </button>
        </nav>

        <div className="kitchen-sidebar-footer">
          <button
            type="button"
            className="kitchen-quick-add-btn"
            onClick={onOpenAdd}
          >
            <Plus size={18} />
            <span>Add to Board</span>
          </button>
          <button
            type="button"
            className="kitchen-exit-btn"
            onClick={onExit}
          >
            <Smartphone size={16} />
            <span>Switch to phone view</span>
          </button>
        </div>
      </aside>

      {/* 2. Main Dashboard View */}
      <main className="kitchen-main-surface">
        {/* Top Header */}
        <header className="kitchen-top-header">
          <div className="kitchen-greeting-block">
            <h1 className="kitchen-greeting">Good evening! 👋</h1>
            <p className="kitchen-date-sub">Wednesday · 26 August</p>
          </div>

          <div className="kitchen-clock-card">
            <Clock size={20} className="clock-icon" />
            <span className="kitchen-clock-digits">{timeStr}</span>
          </div>
        </header>

        {/* 3-Column Bento Layout */}
        <div className="kitchen-bento-grid">
          {/* Column 1: Today's Timeline */}
          <section className="kitchen-bento-col bento-today-col">
            <div className="bento-col-header">
              <h2>Today</h2>
              <span className="bento-badge">{todayEvents.length} items</span>
            </div>

            <div className="bento-event-cards">
              {todayEvents.map((evt) => {
                const member = family.find((m) => evt.personIds.includes(m.id));
                const accent = evt.accentColor || member?.colour || "#6C4DFF";
                const time = evt.allDay ? "All day" : formatTime(evt.start);

                return (
                  <article key={evt.id} className="kitchen-event-card">
                    <span
                      className="kitchen-event-stripe"
                      style={{ backgroundColor: accent }}
                    />
                    <div className="kitchen-event-time">{time}</div>
                    <div className="kitchen-event-info">
                      <h3 className="kitchen-event-title">{evt.title}</h3>
                      <p className="kitchen-event-location">
                        {evt.location || "Home"}
                      </p>
                    </div>
                    <span className="kitchen-event-icon">{evt.icon || "⚽"}</span>
                  </article>
                );
              })}
            </div>
          </section>

          {/* Column 2: Family Overview + Upcoming */}
          <section className="kitchen-bento-col bento-family-col">
            <div className="bento-col-header">
              <h2>Family overview</h2>
            </div>

            {/* Avatar Strip */}
            <div className="kitchen-family-avatars">
              {family.map((m) => (
                <button
                  key={m.id}
                  type="button"
                  className="kitchen-avatar-item"
                  onClick={() => onSelectUser(m)}
                  title={`View ${m.name}`}
                >
                  <span
                    className="kitchen-avatar-circle"
                    style={{ backgroundColor: m.colour }}
                  >
                    {m.avatarEmoji || m.shortName}
                  </span>
                  <span className="kitchen-avatar-name">{m.name}</span>
                </button>
              ))}
            </div>

            {/* Upcoming items */}
            <div className="bento-upcoming-block">
              <h3 className="bento-subheading">Upcoming</h3>
              <div className="bento-upcoming-cards">
                {upcomingEvents.slice(0, 2).map((evt) => (
                  <div key={evt.id} className="upcoming-mini-card">
                    <span className="upcoming-date-pill">
                      {new Intl.DateTimeFormat("en-IE", {
                        weekday: "short",
                        day: "numeric",
                      }).format(new Date(evt.start))}
                    </span>
                    <strong className="upcoming-title">{evt.title}</strong>
                    <span className="upcoming-loc">{evt.location}</span>
                  </div>
                ))}
              </div>
            </div>
          </section>

          {/* Column 3: Fridge Sticky Notes & Reminders */}
          <section className="kitchen-bento-col bento-notes-col">
            <div className="bento-col-header">
              <h2>Family board</h2>
              <button
                type="button"
                className="add-inline-btn"
                onClick={onOpenAdd}
              >
                + Add
              </button>
            </div>

            <div className="kitchen-sticky-board">
              {/* Yellow Note */}
              <div className="kitchen-sticky-card yellow-card">
                <PushPin className="kitchen-pin" />
                <span className="sticky-kicker">Don&apos;t forget</span>
                <p className="sticky-body-text">Bring school form!</p>
                <div className="sticky-members-row">
                  <span className="mini-member-dot" style={{ background: "#6C4DFF" }}>
                    F
                  </span>
                  <span className="mini-member-dot" style={{ background: "#FF5CA8" }}>
                    M
                  </span>
                </div>
              </div>

              {/* Holiday Note */}
              <div className="kitchen-sticky-card cyan-card">
                <span className="holiday-emoji">🌴</span>
                <span className="sticky-kicker">Holiday</span>
                <p className="sticky-body-text">24 Oct</p>
                <span className="countdown-pill">60 days to go</span>
              </div>

              {/* Money Note */}
              <div className="kitchen-sticky-card yellow-card">
                <PushPin className="kitchen-pin" />
                <span className="sticky-kicker">Money</span>
                <p className="sticky-body-text">Finn needs €5 Friday</p>
                <span className="mini-member-dot" style={{ background: "#6C4DFF" }}>
                  F
                </span>
              </div>
            </div>
          </section>
        </div>
      </main>
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
