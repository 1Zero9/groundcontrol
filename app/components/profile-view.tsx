"use client";

import React from "react";
import { Check, ShieldCheck, User, Sparkles, LogOut } from "lucide-react";
import type { FamilyMember, Event, BoardItem } from "../../src/core/models";
import { logoutAction } from "../../lib/auth/actions";

interface ProfileViewProps {
  family: FamilyMember[];
  currentUser: FamilyMember;
  onSelectUser: (user: FamilyMember) => void;
  events: Event[];
  board: BoardItem[];
  onOpenAdd: () => void;
}

export function ProfileView({
  family,
  currentUser,
  onSelectUser,
  events,
  board,
  onOpenAdd,
}: ProfileViewProps) {
  const userEvents = events.filter((e) => e.personIds.includes(currentUser.id));
  const userNotes = board.filter(
    (b) => !b.personIds || b.personIds.includes(currentUser.id)
  );

  return (
    <div className="screen profile-screen">
      {/* Active Profile Card */}
      <div className="current-user-hero-card">
        <div className="user-hero-avatar-wrap">
          <span
            className="user-hero-avatar"
            style={{ backgroundColor: currentUser.colour }}
          >
            {currentUser.avatarEmoji || currentUser.shortName}
          </span>
          <span className="online-badge-dot" />
        </div>

        <div className="user-hero-details">
          <span className="role-tag-pill">
            {currentUser.role === "adult" ? (
              <>
                <ShieldCheck size={14} /> Parent & Commander
              </>
            ) : currentUser.role === "child" ? (
              <>
                <Sparkles size={14} /> Junior Cadet
              </>
            ) : (
              <>
                <User size={14} /> Flight Officer
              </>
            )}
          </span>
          <h1 className="user-hero-name">{currentUser.name}</h1>
          <p className="user-hero-desc">
            {currentUser.title || "Family Crew Member"}
          </p>
        </div>
      </div>

      {/* Switch Family Profile Section */}
      <section className="family-members-section">
        <div className="section-title-row">
          <div>
            <h2 className="section-heading-title">Household Crew</h2>
            <p className="section-heading-sub">
              Switch active view or see what everyone is up to
            </p>
          </div>
        </div>

        <div className="family-cards-list">
          {family.map((member) => {
            const isCurrent = member.id === currentUser.id;
            const memberEvents = events.filter((e) =>
              e.personIds.includes(member.id)
            );
            const nextEvt = memberEvents[0];

            return (
              <button
                key={member.id}
                type="button"
                className={`family-member-card ${isCurrent ? "is-active-member" : ""}`}
                onClick={() => onSelectUser(member)}
              >
                <div className="member-card-left">
                  <span
                    className="member-card-avatar"
                    style={{ backgroundColor: member.colour }}
                  >
                    {member.avatarEmoji || member.shortName}
                  </span>
                  <div className="member-card-info">
                    <div className="member-name-row">
                      <strong className="member-card-name">{member.name}</strong>
                      {isCurrent && (
                        <span className="active-now-badge">
                          <Check size={12} strokeWidth={3} /> Active
                        </span>
                      )}
                    </div>
                    <span className="member-next-event">
                      {nextEvt
                        ? `Next: ${nextEvt.title} (${nextEvt.icon || "⚽"})`
                        : "No upcoming events"}
                    </span>
                  </div>
                </div>

                <div className="member-card-right">
                  <span
                    className="member-color-indicator"
                    style={{ backgroundColor: member.colour }}
                  />
                </div>
              </button>
            );
          })}
        </div>
      </section>

      {/* Summary Stats / Mini Agenda */}
      <section className="profile-summary-section">
        <h2 className="section-heading-title">
          {currentUser.name}&apos;s Mission Status
        </h2>
        <div className="status-metric-grid">
          <div className="status-metric-card">
            <span className="metric-num">{userEvents.length}</span>
            <span className="metric-label">Events this week</span>
          </div>
          <div className="status-metric-card">
            <span className="metric-num">{userNotes.length}</span>
            <span className="metric-label">Notes & Tasks</span>
          </div>
        </div>
      </section>

      {/* Log out */}
      <form action={logoutAction} className="logout-form">
        <button type="submit" className="logout-btn">
          <LogOut size={16} />
          Log out
        </button>
      </form>
    </div>
  );
}
