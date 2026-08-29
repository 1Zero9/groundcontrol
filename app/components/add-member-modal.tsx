"use client";

import React, { useState } from "react";
import { X } from "lucide-react";
import type { FamilyMember } from "../../src/core/models";
import { AVATAR_ICON_OPTIONS, avatarIconSrc } from "../../src/core/avatars";

interface AddMemberModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaveMember: (member: FamilyMember) => void;
  editingMember?: FamilyMember | null;
}

type Role = "adult" | "teen" | "child" | "pet";

const ROLE_OPTIONS: { value: Role; label: string }[] = [
  { value: "adult", label: "Commander" },
  { value: "teen", label: "Flight Officer" },
  { value: "child", label: "Junior Cadet" },
  { value: "pet", label: "Space Pet" },
];

const COLOUR_OPTIONS = ["#6C4DFF", "#22C1A2", "#FF5CA8", "#FFB347", "#4D96FF"];

export function AddMemberModal({
  isOpen,
  onClose,
  onSaveMember,
  editingMember,
}: AddMemberModalProps) {
  const isEditing = Boolean(editingMember);
  const [name, setName] = useState(editingMember?.name ?? "");
  const [role, setRole] = useState<Role>(editingMember?.role ?? "child");
  const [avatarEmoji, setAvatarEmoji] = useState(
    editingMember?.avatarEmoji ?? AVATAR_ICON_OPTIONS[4].key
  );
  const [colour, setColour] = useState(editingMember?.colour ?? COLOUR_OPTIONS[0]);

  if (!isOpen) return null;

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) return;

    const member: FamilyMember = {
      id: editingMember?.id ?? `m-user-${Date.now()}`,
      name: trimmed,
      shortName: trimmed.charAt(0).toUpperCase(),
      colour,
      avatarEmoji,
      role,
      hasAccount: editingMember?.hasAccount,
    };
    onSaveMember(member);

    setName("");
    setRole("child");
    setAvatarEmoji(AVATAR_ICON_OPTIONS[4].key);
    setColour(COLOUR_OPTIONS[0]);
    onClose();
  };

  return (
    <div
      className="modal-backdrop-overlay"
      role="dialog"
      aria-modal="true"
      aria-labelledby="add-member-modal-title"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="add-sheet-panel">
        <div className="sheet-pill-handle" />

        <div className="sheet-header">
          <h2 id="add-member-modal-title" className="sheet-title">
            {isEditing ? "Edit family member" : "Add family member"}
          </h2>
          <button type="button" className="sheet-close-btn" onClick={onClose} aria-label="Close">
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSave} className="add-sheet-form">
          <div className="form-field-group">
            <label htmlFor="member-name-input" className="sr-only">
              Name
            </label>
            <input
              id="member-name-input"
              type="text"
              className="sheet-primary-input"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., Finn"
              autoFocus
              required
            />
          </div>

          <div className="whos-it-for-section">
            <p className="whos-it-for-label">Role</p>
            <div className="category-squircles-bar">
              {ROLE_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  className={`category-squircle-tab ${role === opt.value ? "active" : ""}`}
                  onClick={() => setRole(opt.value)}
                  style={
                    {
                      "--cat-color": "var(--purple)",
                      "--cat-bg": "var(--purple-soft)",
                    } as React.CSSProperties
                  }
                >
                  <span className="squircle-icon-wrap" style={{ width: 44, height: 44, fontSize: 20 }}>
                    {opt.value === "adult"
                      ? "🧑‍✈️"
                      : opt.value === "teen"
                      ? "🧑"
                      : opt.value === "child"
                      ? "🧒"
                      : "🐾"}
                  </span>
                  <span className="squircle-label">{opt.label}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="whos-it-for-section">
            <p className="whos-it-for-label">Avatar icon</p>
            <div className="avatar-pick-row" style={{ flexWrap: "wrap" }}>
              {AVATAR_ICON_OPTIONS.map((opt) => {
                const isSelected = avatarEmoji === opt.key;
                return (
                  <button
                    key={opt.key}
                    type="button"
                    className={`avatar-pick-btn ${isSelected ? "selected" : ""}`}
                    onClick={() => setAvatarEmoji(opt.key)}
                  >
                    <span
                      className="avatar-circle-ring"
                      style={{
                        borderColor: isSelected ? colour : "transparent",
                      }}
                    >
                      <img src={avatarIconSrc(opt.key)} alt="" className="avatar-pick-img" />
                    </span>
                    <span className="avatar-pick-name">{opt.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="whos-it-for-section">
            <p className="whos-it-for-label">Colour</p>
            <div className="avatar-pick-row">
              {COLOUR_OPTIONS.map((c) => (
                <button
                  key={c}
                  type="button"
                  className="avatar-pick-btn"
                  onClick={() => setColour(c)}
                  aria-label={`Colour ${c}`}
                >
                  <span
                    className="avatar-circle-ring"
                    style={{
                      borderColor: colour === c ? c : "transparent",
                      backgroundColor: c,
                    }}
                  />
                </button>
              ))}
            </div>
          </div>

          <div className="sheet-actions-row">
            <button type="button" className="sheet-cancel-btn" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="sheet-add-btn" disabled={!name.trim()}>
              {isEditing ? "Save" : "Add"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
