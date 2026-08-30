"use client";

import { useState } from "react";
import {
  Check,
  HelpCircle,
  LayoutDashboard,
  LogOut,
  Moon,
  Pencil,
  ShieldCheck,
  Sparkles,
  Sun,
  User,
  Users,
} from "lucide-react";
import type { Event, BoardItem, FamilyMember } from "../../src/core/models";
import { logoutAction } from "../../lib/auth/actions";
import { SiteFooter } from "./site-footer";
import { MemberAvatarContent } from "./member-avatar";

interface ProfileViewProps {
  currentUser: FamilyMember;
  events: Event[];
  board: BoardItem[];
  onOpenEditAvatar: () => void;
  onOpenKitchen: () => void;
  onOpenHelp: () => void;
  onOpenFamilyAdmin: () => void;
  canManageFamily: boolean;
  onSaveNickname: (nickname: string) => void;
  isDarkMode: boolean;
  onToggleDarkMode: () => void;
}

function NicknameEditor({
  nickname,
  onSave,
}: {
  nickname?: string;
  onSave: (nickname: string) => void;
}) {
  const [isEditing, setIsEditing] = useState(false);
  const [value, setValue] = useState(nickname ?? "");

  const handleSave = () => {
    onSave(value.trim());
    setIsEditing(false);
  };

  if (!isEditing) {
    return (
      <button
        type="button"
        className="nickname-edit-trigger"
        onClick={() => {
          setValue(nickname ?? "");
          setIsEditing(true);
        }}
      >
        <Pencil size={12} />
        {nickname ? nickname : "Add a nickname"}
      </button>
    );
  }

  return (
    <div className="nickname-edit-row">
      <input
        type="text"
        className="nickname-edit-input"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder="Nickname"
        maxLength={30}
        onKeyDown={(e) => {
          if (e.key === "Enter") handleSave();
          if (e.key === "Escape") setIsEditing(false);
        }}
      />
      <button
        type="button"
        className="nickname-save-btn"
        onClick={handleSave}
        aria-label="Save nickname"
      >
        <Check size={14} />
      </button>
    </div>
  );
}

export function ProfileView({
  currentUser,
  events,
  board,
  onOpenEditAvatar,
  onOpenKitchen,
  onOpenHelp,
  onOpenFamilyAdmin,
  canManageFamily,
  onSaveNickname,
  isDarkMode,
  onToggleDarkMode,
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
            <MemberAvatarContent
              avatarValue={currentUser.avatarEmoji}
              fallback={currentUser.shortName}
            />
          </span>
          <span className="online-badge-dot" />
          <button
            type="button"
            className="avatar-edit-btn"
            onClick={onOpenEditAvatar}
            aria-label="Change your avatar"
            title="Change your avatar"
          >
            <Pencil size={12} />
          </button>
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
          <NicknameEditor nickname={currentUser.nickname} onSave={onSaveNickname} />
          {currentUser.lastSeenAt && (
            <p className="last-visit-text">
              Last visit: {new Date(currentUser.lastSeenAt).toLocaleString()}
            </p>
          )}
        </div>
      </div>

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

      {/* Family Admin */}
      {canManageFamily && (
        <div className="logout-form">
          <button
            type="button"
            className="manage-modules-btn"
            onClick={onOpenFamilyAdmin}
          >
            <Users size={16} />
            Family Admin
          </button>
        </div>
      )}

      {/* Kitchen display + theme + help */}
      <div className="logout-form profile-secondary-actions">
        <button
          type="button"
          className="manage-modules-btn"
          onClick={onOpenKitchen}
        >
          <LayoutDashboard size={16} />
          Kitchen Display
        </button>
        <button
          type="button"
          className="manage-modules-btn"
          onClick={onToggleDarkMode}
        >
          {isDarkMode ? <Sun size={16} /> : <Moon size={16} />}
          {isDarkMode ? "Switch to light theme" : "Switch to dark theme"}
        </button>
        <button type="button" className="manage-modules-btn" onClick={onOpenHelp}>
          <HelpCircle size={16} />
          Help
        </button>
      </div>

      {/* Log out */}
      <form action={logoutAction} className="logout-form">
        <button type="submit" className="logout-btn">
          <LogOut size={16} />
          Log out
        </button>
      </form>

      <SiteFooter className="profile-footer" />
    </div>
  );
}
