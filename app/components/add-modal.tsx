"use client";

import React, { useMemo, useRef, useState } from "react";
import { X, Calendar, Clock, MapPin, Bell, Trash2, CalendarPlus, Camera, Loader2, FileText } from "lucide-react";
import type { Event, BoardItem, FamilyMember, GroundControlModule } from "../../src/core/models";
import type { CustomService } from "../../db/custom-services-queries";
import { moduleRegistry } from "../../src/core/module-registry";
import { CategoryBadge } from "./cosmic-illustrations";
import { MemberAvatarContent } from "./member-avatar";
import { toISODate } from "../../src/core/date-utils";
import { extractPdfCandidates, type PdfCandidate } from "../../src/core/pdf-extract";

interface AddModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: FamilyMember;
  family: FamilyMember[];
  modules: GroundControlModule[];
  customServices: CustomService[];
  onSaveEvent: (event: Event) => void;
  onSaveBoardItem: (item: BoardItem) => void;
  /** When set, the modal opens in "edit" mode for this existing event instead of creating a new item. */
  editingEvent?: Event | null;
  onUpdateEvent?: (id: string, event: Event) => void;
  onDeleteEvent?: (id: string) => void;
  /** When set, the modal opens in "edit" mode for this existing note/task/reminder instead of creating a new item. */
  editingBoardItem?: BoardItem | null;
  onUpdateBoardItem?: (id: string, item: BoardItem) => void;
  onDeleteBoardItem?: (id: string) => void;
}

function splitLocalDateTime(iso: string) {
  const d = new Date(iso);
  const time = `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
  return { date: toISODate(d), time };
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
  editingEvent,
  onUpdateEvent,
  onDeleteEvent,
  editingBoardItem,
  onUpdateBoardItem,
  onDeleteBoardItem,
}: AddModalProps) {
  const isEditingEvent = Boolean(editingEvent);
  const isEditingBoardItem = Boolean(editingBoardItem);
  const isEditing = isEditingEvent || isEditingBoardItem;
  // Synced calendar-feed events (e.g. Sports fixtures) carry a sourceId and
  // are overwritten on the next sync, so they're shown read-only here.
  const isReadOnly = isEditingEvent && Boolean(editingEvent?.sourceId);
  const editingStart = editingEvent ? splitLocalDateTime(editingEvent.start) : null;
  const editingBoardItemLabel =
    editingBoardItem?.type === "task"
      ? "Edit task"
      : editingBoardItem?.type === "reminder"
      ? "Edit reminder"
      : "Edit note";

  const [categoryType, setCategoryType] = useState<"event" | "task" | "note" | "reminder">(
    editingBoardItem
      ? (editingBoardItem.type as "task" | "note" | "reminder") ?? "note"
      : "event"
  );
  const [text, setText] = useState(editingEvent?.title ?? editingBoardItem?.text ?? "");
  const [location, setLocation] = useState(editingEvent?.location ?? "Belvedere");
  const [date, setDate] = useState(() => editingStart?.date ?? toISODate(new Date()));
  const [time, setTime] = useState(() => editingStart?.time ?? "17:00");
  const [category, setCategory] = useState(editingEvent?.category ?? "general");
  const [selectedPersonIds, setSelectedPersonIds] = useState<string[]>(
    editingEvent?.personIds ?? editingBoardItem?.personIds ?? [currentUser.id]
  );
  const [hasReminder, setHasReminder] = useState(true);
  const [customServiceId, setCustomServiceId] = useState<string>(
    editingEvent?.customServiceId ?? editingBoardItem?.customServiceId ?? ""
  );
  const [isConvertingToEvent, setIsConvertingToEvent] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const [scanError, setScanError] = useState<string | null>(null);
  const photoInputRef = useRef<HTMLInputElement>(null);
  const [isParsingPdf, setIsParsingPdf] = useState(false);
  const [pdfError, setPdfError] = useState<string | null>(null);
  const [pdfCandidates, setPdfCandidates] = useState<PdfCandidate[]>([]);
  const pdfInputRef = useRef<HTMLInputElement>(null);

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

  const handleScanPhoto = async (file: File) => {
    setIsScanning(true);
    setScanError(null);
    try {
      const { createWorker } = await import("tesseract.js");
      const worker = await createWorker("eng");
      const {
        data: { text: recognizedText },
      } = await worker.recognize(file);
      await worker.terminate();

      const cleaned = recognizedText
        .split("\n")
        .map((line) => line.trim())
        .filter(Boolean)
        .join(" ")
        .trim();

      if (cleaned) {
        setText((prev) => (prev.trim() ? `${prev.trim()} ${cleaned}` : cleaned));
      } else {
        setScanError("Couldn't find any readable text in that photo.");
      }
    } catch (err) {
      console.error("Photo scan failed", err);
      setScanError("Couldn't scan that photo. Please try again.");
    } finally {
      setIsScanning(false);
    }
  };

  const handleImportPdf = async (file: File) => {
    setIsParsingPdf(true);
    setPdfError(null);
    setPdfCandidates([]);
    try {
      const candidates = await extractPdfCandidates(file);
      if (candidates.length > 0) {
        setPdfCandidates(candidates);
      } else {
        setPdfError("Couldn't find any dated events in that PDF.");
      }
    } catch (err) {
      console.error("PDF import failed", err);
      setPdfError("Couldn't read that PDF. Please try again.");
    } finally {
      setIsParsingPdf(false);
    }
  };

  const applyPdfCandidate = (candidate: PdfCandidate) => {
    setCategoryType("event");
    setText(candidate.text);
    if (candidate.date) setDate(candidate.date);
    if (candidate.time) setTime(candidate.time);
    setPdfCandidates([]);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!text.trim()) return;

    if (isEditingEvent && editingEvent) {
      const updatedEvent: Event = {
        ...editingEvent,
        title: text.trim(),
        start: `${date}T${time}:00`,
        end: `${date}T${time}:00`,
        personIds: selectedPersonIds,
        category,
        location: location || "Home",
        icon: selectedCategoryMeta?.icon ?? editingEvent.icon ?? "🗓️",
        accentColor: selectedCategoryMeta?.color ?? editingEvent.accentColor ?? "#6C4DFF",
        customServiceId: customServiceId || undefined,
      };
      onUpdateEvent?.(editingEvent.id, updatedEvent);
      onClose();
      return;
    }

    if (isEditingBoardItem && editingBoardItem && !isConvertingToEvent) {
      const updatedItem: BoardItem = {
        ...editingBoardItem,
        text: text.trim(),
        type: categoryType === "event" ? editingBoardItem.type : categoryType,
        personIds: selectedPersonIds,
        customServiceId: customServiceId || undefined,
      };
      onUpdateBoardItem?.(editingBoardItem.id, updatedItem);
      onClose();
      return;
    }

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
      if (isConvertingToEvent && editingBoardItem) {
        onDeleteBoardItem?.(editingBoardItem.id);
      }
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
            {isEditingEvent
              ? isReadOnly
                ? "Event details"
                : "Edit event"
              : isEditingBoardItem
              ? isConvertingToEvent
                ? "Convert to event"
                : editingBoardItemLabel
              : "Add"}
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

        {isReadOnly && (
          <p className="synced-event-notice">
            This event is synced from a calendar feed, so it can&apos;t be edited here.
          </p>
        )}

        <form onSubmit={handleSave} className="add-sheet-form">
          {/* Category Squircles */}
          {!isEditing && (
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
          )}

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
              disabled={isReadOnly}
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

          {!isEditing && (
            <div className="scan-photo-row">
              <input
                ref={photoInputRef}
                type="file"
                accept="image/*"
                capture="environment"
                className="scan-photo-input"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) handleScanPhoto(file);
                  e.target.value = "";
                }}
              />
              <button
                type="button"
                className="scan-photo-btn"
                onClick={() => photoInputRef.current?.click()}
                disabled={isScanning}
              >
                {isScanning ? (
                  <>
                    <Loader2 size={15} className="spin" />
                    Scanning photo…
                  </>
                ) : (
                  <>
                    <Camera size={15} />
                    Scan text from a photo
                  </>
                )}
              </button>
              {scanError && <p className="scan-photo-error">{scanError}</p>}
            </div>
          )}

          {!isEditing && (
            <div className="pdf-import-row">
              <input
                ref={pdfInputRef}
                type="file"
                accept="application/pdf"
                className="scan-photo-input"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) handleImportPdf(file);
                  e.target.value = "";
                }}
              />
              <button
                type="button"
                className="pdf-import-btn"
                onClick={() => pdfInputRef.current?.click()}
                disabled={isParsingPdf}
              >
                {isParsingPdf ? (
                  <>
                    <Loader2 size={15} className="spin" />
                    Reading PDF…
                  </>
                ) : (
                  <>
                    <FileText size={15} />
                    Import from a PDF
                  </>
                )}
              </button>
              {pdfError && <p className="scan-photo-error">{pdfError}</p>}
              {pdfCandidates.length > 0 && (
                <div className="pdf-candidate-list">
                  <p className="pdf-candidate-heading">Pick an event to add:</p>
                  {pdfCandidates.map((candidate, i) => (
                    <button
                      key={i}
                      type="button"
                      className="pdf-candidate-item"
                      onClick={() => applyPdfCandidate(candidate)}
                    >
                      <span className="pdf-candidate-text">{candidate.text}</span>
                      <span className="pdf-candidate-meta">
                        {candidate.date}
                        {candidate.time ? ` · ${candidate.time}` : ""}
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {isEditingBoardItem &&
            !isConvertingToEvent &&
            (editingBoardItem?.type === "task" || editingBoardItem?.type === "reminder") && (
              <button
                type="button"
                className="convert-to-event-btn"
                onClick={() => {
                  setCategoryType("event");
                  setIsConvertingToEvent(true);
                }}
              >
                <CalendarPlus size={15} />
                Convert to event
              </button>
            )}

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
                  disabled={isReadOnly}
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
                  disabled={isReadOnly}
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
                disabled={isReadOnly}
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
                disabled={isReadOnly}
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
                disabled={isReadOnly}
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
                      disabled={isReadOnly}
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
          {!isEditing && (
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
          )}

          {/* Action Buttons */}
          <div className="sheet-actions-row">
            {isEditing && !isReadOnly && (
              <button
                type="button"
                className="sheet-delete-btn"
                onClick={() => {
                  if (editingEvent) onDeleteEvent?.(editingEvent.id);
                  if (editingBoardItem) onDeleteBoardItem?.(editingBoardItem.id);
                  onClose();
                }}
                aria-label={isEditingBoardItem ? "Delete note" : "Delete event"}
              >
                <Trash2 size={16} />
                Delete
              </button>
            )}
            {isReadOnly ? (
              <button type="button" className="sheet-add-btn" onClick={onClose}>
                Close
              </button>
            ) : (
              <>
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
                  {isConvertingToEvent ? "Convert" : isEditing ? "Save" : "Add"}
                </button>
              </>
            )}
          </div>
        </form>
      </div>
    </div>
  );
}
