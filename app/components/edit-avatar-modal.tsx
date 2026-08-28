"use client";

import { useState } from "react";
import { X } from "lucide-react";
import { AVATAR_ICON_OPTIONS, avatarIconSrc } from "../../src/core/avatars";

interface EditAvatarModalProps {
  isOpen: boolean;
  currentAvatar?: string;
  onClose: () => void;
  onSave: (avatarKey: string) => void;
}

export function EditAvatarModal({ isOpen, currentAvatar, onClose, onSave }: EditAvatarModalProps) {
  const [selected, setSelected] = useState(currentAvatar || AVATAR_ICON_OPTIONS[0].key);

  if (!isOpen) return null;

  const handleSave = () => {
    onSave(selected);
    onClose();
  };

  return (
    <div
      className="modal-backdrop-overlay"
      role="dialog"
      aria-modal="true"
      aria-labelledby="edit-avatar-modal-title"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="add-sheet-panel">
        <div className="sheet-pill-handle" />

        <div className="sheet-header">
          <h2 id="edit-avatar-modal-title" className="sheet-title">
            Choose your avatar
          </h2>
          <button type="button" className="sheet-close-btn" onClick={onClose} aria-label="Close">
            <X size={20} />
          </button>
        </div>

        <div className="add-sheet-form">
          <div className="whos-it-for-section">
            <div className="avatar-pick-row" style={{ flexWrap: "wrap" }}>
              {AVATAR_ICON_OPTIONS.map((opt) => {
                const isSelected = selected === opt.key;
                return (
                  <button
                    key={opt.key}
                    type="button"
                    className={`avatar-pick-btn ${isSelected ? "selected" : ""}`}
                    onClick={() => setSelected(opt.key)}
                  >
                    <span
                      className="avatar-circle-ring"
                      style={{ borderColor: isSelected ? "var(--purple)" : "transparent" }}
                    >
                      <img src={avatarIconSrc(opt.key)} alt="" className="avatar-pick-img" />
                    </span>
                    <span className="avatar-pick-name">{opt.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="sheet-actions-row">
            <button type="button" className="sheet-cancel-btn" onClick={onClose}>
              Cancel
            </button>
            <button type="button" className="sheet-add-btn" onClick={handleSave}>
              Save
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
