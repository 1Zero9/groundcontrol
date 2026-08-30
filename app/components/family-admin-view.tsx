"use client";

import { useState } from "react";
import { ArrowLeft, Blocks, Check, Link2, Pencil, Trash2, UserPlus } from "lucide-react";
import type { Event, FamilyMember } from "../../src/core/models";
import { MemberAvatarContent } from "./member-avatar";

interface FamilyAdminViewProps {
  family: FamilyMember[];
  currentUser: FamilyMember;
  events: Event[];
  onSelectUser: (user: FamilyMember) => void;
  onOpenAddMember: () => void;
  onOpenEditMember: (member: FamilyMember) => void;
  onOpenInviteMember: (member: FamilyMember) => void;
  onOpenModules: () => void;
  onRemoveDemoData: () => Promise<{ removedEvents: number; removedBoardItems: number }>;
  onBack: () => void;
}

export function FamilyAdminView({
  family,
  currentUser,
  events,
  onSelectUser,
  onOpenAddMember,
  onOpenEditMember,
  onOpenInviteMember,
  onOpenModules,
  onRemoveDemoData,
  onBack,
}: FamilyAdminViewProps) {
  const [demoStatus, setDemoStatus] = useState<"idle" | "removing">("idle");
  const [demoMessage, setDemoMessage] = useState<string | null>(null);

  const handleRemoveDemoData = async () => {
    setDemoStatus("removing");
    setDemoMessage(null);
    try {
      const result = await onRemoveDemoData();
      setDemoMessage(
        `Removed ${result.removedEvents} demo event(s) and ${result.removedBoardItems} demo note/task(s).`
      );
    } catch {
      setDemoMessage("Couldn't remove demo data — try again.");
    } finally {
      setDemoStatus("idle");
    }
  };

  return (
    <div className="screen modules-screen">
      <div className="modules-header-row">
        <button
          type="button"
          className="modules-back-btn"
          onClick={onBack}
          aria-label="Back to profile"
        >
          <ArrowLeft size={20} />
        </button>
        <div>
          <h1 className="screen-title">Family Admin</h1>
          <p className="screen-subtitle">
            Manage your household, members, and modules
          </p>
        </div>
      </div>

      <section className="family-members-section">
        <div className="section-title-row">
          <div>
            <h2 className="section-heading-title">Household Crew</h2>
            <p className="section-heading-sub">
              Switch active view or see what everyone is up to
            </p>
          </div>
          <button
            type="button"
            className="add-member-btn"
            onClick={onOpenAddMember}
            aria-label="Add family member"
          >
            <UserPlus size={16} />
            <span>Add</span>
          </button>
        </div>

        <div className="family-cards-list">
          {family.map((member) => {
            const isCurrent = member.id === currentUser.id;
            const memberEvents = events.filter((e) =>
              e.personIds.includes(member.id)
            );
            const nextEvt = memberEvents[0];
            const canConnect = member.role !== "pet" && !member.hasAccount;

            return (
              <div
                key={member.id}
                role="button"
                tabIndex={0}
                className={`family-member-card ${isCurrent ? "is-active-member" : ""}`}
                onClick={() => onSelectUser(member)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    onSelectUser(member);
                  }
                }}
              >
                <div className="member-card-left">
                  <span
                    className="member-card-avatar"
                    style={{ backgroundColor: member.colour }}
                  >
                    <MemberAvatarContent avatarValue={member.avatarEmoji} fallback={member.shortName} />
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

                <div className="member-card-actions">
                  <button
                    type="button"
                    className="member-action-btn"
                    onClick={(e) => {
                      e.stopPropagation();
                      onOpenEditMember(member);
                    }}
                    aria-label={`Edit ${member.name}`}
                    title={`Edit ${member.name}`}
                  >
                    <Pencil size={13} />
                  </button>

                  {canConnect && (
                    <button
                      type="button"
                      className="member-action-btn"
                      onClick={(e) => {
                        e.stopPropagation();
                        onOpenInviteMember(member);
                      }}
                      aria-label={`Send login link to ${member.name}`}
                      title={`Send login link to ${member.name}`}
                    >
                      <Link2 size={13} />
                    </button>
                  )}

                  {member.hasAccount && (
                    <span className="member-connected-badge" title="Has their own login">
                      <Check size={11} strokeWidth={3} /> Connected
                    </span>
                  )}

                  <span
                    className="member-color-indicator"
                    style={{ backgroundColor: member.colour }}
                  />
                </div>
              </div>
            );
          })}

          <button type="button" className="add-member-card" onClick={onOpenAddMember}>
            <UserPlus size={18} />
            Add family member
          </button>
        </div>
      </section>

      <section className="modules-section">
        <h2 className="section-heading-title">Modules & calendars</h2>
        <p className="section-heading-sub">
          Turn features on or off, connect calendar feeds, and control who sees what
        </p>
        <div className="logout-form">
          <button type="button" className="manage-modules-btn" onClick={onOpenModules}>
            <Blocks size={16} />
            Manage modules
          </button>
        </div>
      </section>

      <section className="modules-section">
        <h2 className="section-heading-title">Demo data</h2>
        <p className="section-heading-sub">
          Remove the sample welcome note, task, and event that came with your new family
        </p>
        <div className="logout-form">
          <button
            type="button"
            className="manage-modules-btn remove-demo-data-btn"
            onClick={handleRemoveDemoData}
            disabled={demoStatus === "removing"}
          >
            <Trash2 size={16} />
            {demoStatus === "removing" ? "Removing…" : "Remove demo data"}
          </button>
          {demoMessage && <p className="module-feed-status">{demoMessage}</p>}
        </div>
      </section>
    </div>
  );
}
