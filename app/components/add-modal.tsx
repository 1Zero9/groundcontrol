"use client";

import React, { useMemo, useState } from "react";
import { X, Calendar, Clock, MapPin, Bell } from "lucide-react";
import type { Event, BoardItem, FamilyMember, GroundControlModule } from "../../src/core/models";
import type { CustomService } from "../../db/custom-services-queries";
import { moduleRegistry } from "../../src/core/module-registry";
import { CategoryBadge } from "./cosmic-illustrations";
import { MemberAvatarContent } from "./member-avatar";
import { toISODate } from "../../src/core/date-utils";

interface AddModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: FamilyMember;
  family: FamilyMember[];
  modules: GroundControlModule[];
  customServices: CustomService[];
  onSaveEvent: (event: Event) => void;
  onSaveBoardItem: (item: BoardItem) => void;
}

export function AddModal({
  isOpen,
  onClose,
  currentUser,
  family,
  modules,
  customServices,
  onSaveEvent,
  onSaveBoardItem,
}: AddModalProps) {
  const [categoryType, setCategoryType] = useState<"event" | "task" | "note" | "reminder">("event");
  const [text, setText] = useState("");
  const [location, setLocation] = useState("Belvedere");
  const [date, setDate] = useState(() => toISODate(new Date()));
  const [time, setTime] = useState("17:00");
  const [category, setCategory] = useState("general");
  const [selectedPersonIds, setSelectedPersonIds] = useState<string[]>([currentUser.id]);
  const [hasReminder, setHasReminder] = useState(true);
  const [customServiceId, setCustomServiceId] = useState<string>("");

  const availableCategories = useMemo(
    () =>
      moduleRegistry
        .filter((m) => modules.find((fm) => fm.key === m.key)?.enabled ?? m.isCore)
        .flatMap((m) => m.categories),
    [modules]
  );
  const selectedCategoryMeta = useMemo(
    () => availableCategories.find((c) => c.value === category),
    [availableCategories, category]
  );

  if (!isOpen) return null;

  const togglePerson = (id: string) => {
    if (selectedPersonIds.includes(id)) {
      if (selectedPersonIds.length > 1) {
        setSelectedPersonIds(selectedPersonIds.filter((p) => p !== id));
      }
    } else {
      setSelectedPersonIds([...selectedPersonIds, id]);
    }
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!text.trim()) return;

    if (categoryType === "event") {
      const newEvent: Event = {
        id: `e-user-${Date.now()}`,
        title: text.trim(),
        start: `${date}T${time}:00`,
        end: `${date}T${time}:00`,
        personIds: selectedPersonIds,
        category,
        location: location || "Home",
        icon: selectedCategoryMeta?.icon ?? "🗓️",
        accentColor: selectedCategoryMeta?.color ?? "#6C4DFF",
        source: "User",
        customServiceId: customServiceId || undefined,
      };
      onSaveEvent(newEvent);
    } else {
      const newBoard: BoardItem = {
        id: `b-user-${Date.now()}`,
        text: text.trim(),
        type: categoryType,
        personIds: selectedPersonIds,
        createdAt: new Date().toISOString(),
        pinned: categoryType === "note",
        badge: categoryType === "task" ? "✓" : categoryType === "reminder" ? "🔔" : "📌",
        color: categoryType === "task" ? "#E6FAF4" : categoryType === "note" ? "#FFF4D2" : "#FFF0F5",
        customServiceId: customServiceId || undefined,
      };
      onSaveBoardItem(newBoard);
    }

    setText("");
    setCustomServiceId("");
    onClose();
  };

  return (
    <div
      className="modal-backdrop-overlay"
      role="dialog"
      aria-modal="true"
      aria-labelledby="add-modal-title"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="add-sheet-panel">
        {/* Drag handle */}
        <div className="sheet-pill-handle" />

        {/* Header */}
        <div className="sheet-header">
          <h2 id="add-modal-title" className="sheet-title">
            Add
          </h2>
          <button
            type="button"
            className="sheet-close-btn"
            onClick={onClose}
            aria-label="Close"
          >
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSave} className="add-sheet-form">
          {/* Category Squircles */}
          <div className="category-squircles-bar">
            <CategoryBadge
              type="event"
              active={categoryType === "event"}
              onClick={() => setCategoryType("event")}
            />
            <CategoryBadge
              type="task"
              active={categoryType === "task"}
              onClick={() => setCategoryType("task")}
            />
            <CategoryBadge
              type="note"
              active={categoryType === "note"}
              onClick={() => setCategoryType("note")}
            />
            <CategoryBadge
              type="reminder"
              active={categoryType === "reminder"}
              onClick={() => setCategoryType("reminder")}
            />
          </div>

          {/* Primary Input */}
          <div className="form-field-group">
            <label htmlFor="whats-happening-input" className="sr-only">
              What&apos;s happening?
            </label>
            <input
              id="whats-happening-input"
              type="text"
              className="sheet-primary-input"
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder={
                categoryType === "event"
                  ? "e.g., Football training"
                  : categoryType === "task"
                  ? "e.g., Bring school form"
                  : categoryType === "note"
                  ? "e.g., Finn needs €5 Friday"
                  : "e.g., Take antibiotics at 9am"
              }
              autoFocus
              required
            />
          </div>

          {/* Date & Time if Event / Reminder */}
          {categoryType === "event" && (
            <div className="form-row-duo">
              <div className="input-with-icon">
                <Calendar size={18} className="field-icon" />
                <input
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="sheet-sub-input"
                  aria-label="Date"
                />
              </div>
              <div className="input-with-icon">
                <Clock size={18} className="field-icon" />
                <input
                  type="time"
                  value={time}
                  onChange={(e) => setTime(e.target.value)}
                  className="sheet-sub-input"
                  aria-label="Time"
                />
              </div>
            </div>
          )}

          {/* Location if Event */}
          {categoryType === "event" && (
            <div className="input-with-icon">
              <MapPin size={18} className="field-icon" />
              <input
                type="text"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="Location (e.g. Belvedere, Home)"
                className="sheet-sub-input"
                aria-label="Location"
              />
            </div>
          )}

          {/* Category if Event */}
          {categoryType === "event" && (
            <div className="form-field-group">
              <label htmlFor="event-category-select" className="whos-it-for-label">
                Category
              </label>
              <select
                id="event-category-select"
                className="sheet-sub-input"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
              >
                {availableCategories.map((c) => (
                  <option key={c.value} value={c.value}>
                    {c.icon} {c.label}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Tag to one of the family's custom services, if any exist */}
          {customServices.length > 0 && (
            <div className="form-field-group">
              <label htmlFor="custom-service-select" className="whos-it-for-label">
                Part of a service?
              </label>
              <select
                id="custom-service-select"
                className="sheet-sub-input"
                value={customServiceId}
                onChange={(e) => setCustomServiceId(e.target.value)}
              >
                <option value="">None</option>
                {customServices.map((service) => (
                  <option key={service.id} value={service.id}>
                    {service.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* "Who's it for?" Avatar Selector */}
          <div className="whos-it-for-section">
            <p className="whos-it-for-label">Who’s it for?</p>
            <div className="avatar-pick-row">
              {family
                .filter((m) => m.role !== "pet")
                .map((m) => {
                  const isSelected = selectedPersonIds.includes(m.id);
                  return (
                    <button
                      key={m.id}
                      type="button"
                      className={`avatar-pick-btn ${isSelected ? "selected" : ""}`}
                      onClick={() => togglePerson(m.id)}
                    >
                      <span
                        className="avatar-circle-ring"
                        style={{
                          borderColor: isSelected ? m.colour : "transparent",
                          backgroundColor: m.colour,
                        }}
                      >
                        <MemberAvatarContent
                          avatarValue={m.avatarEmoji}
                          fallback={<span className="avatar-letter">{m.shortName || m.name.charAt(0)}</span>}
                        />
                      </span>
                      <span className="avatar-pick-name">{m.name}</span>
                    </button>
                  );
                })}
            </div>
          </div>

          {/* Add Reminder Toggle */}
          <div className="toggle-row">
            <div className="toggle-copy">
              <Bell size={18} className="toggle-icon" />
              <span>Add reminder</span>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={hasReminder}
              className={`toggle-switch-pill ${hasReminder ? "on" : "off"}`}
              onClick={() => setHasReminder(!hasReminder)}
            >
              <span className="toggle-switch-thumb" />
            </button>
          </div>

          {/* Action Buttons */}
          <div className="sheet-actions-row">
            <button
              type="button"
              className="sheet-cancel-btn"
              onClick={onClose}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="sheet-add-btn"
              disabled={!text.trim()}
            >
              Add
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
