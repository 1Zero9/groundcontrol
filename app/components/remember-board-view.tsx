"use client";

import { Plus, Trash2, CheckCircle2, Pencil } from "lucide-react";
import type { BoardItem, FamilyMember } from "../../src/core/models";
import { PushPin } from "./cosmic-illustrations";

interface RememberBoardViewProps {
  board: BoardItem[];
  family: FamilyMember[];
  onOpenAdd: () => void;
  onRemoveItem: (id: string) => void;
  onToggleItem: (id: string) => void;
  onEditItem: (item: BoardItem) => void;
}

export function RememberBoardView({
  board,
  family,
  onOpenAdd,
  onRemoveItem,
  onToggleItem,
  onEditItem,
}: RememberBoardViewProps) {
  return (
    <div className="screen remember-screen">
      <div className="remember-header-row">
        <div>
          <h1 className="screen-title">Remember</h1>
          <p className="screen-subtitle">Notes, tasks and reminders on the family fridge</p>
        </div>
        <button
          type="button"
          className="remember-add-round-btn"
          onClick={onOpenAdd}
          aria-label="Add note or reminder"
        >
          <Plus size={22} />
        </button>
      </div>

      <div className="remember-cards-grid">
        {board.map((item) => {
          const assignedMembers = item.personIds
            ?.map((id) => family.find((m) => m.id === id))
            .filter(Boolean) as FamilyMember[] | undefined;

          // Determine card style based on type or badge
          const isYellow = item.color === "#FFF4D2" || item.pinned;
          const isPink = item.color === "#FFF0F5" || item.type === "reminder";
          const isMint = item.color === "#E6FAF4" || item.type === "task";
          const isBlue = item.color === "#EBF5FF" || item.type === "countdown";

          const cardClass = isYellow
            ? "card-yellow-sticky"
            : isPink
            ? "card-pink-note"
            : isMint
            ? "card-mint-task"
            : isBlue
            ? "card-blue-holiday"
            : "card-default-board";

          return (
            <article
              key={item.id}
              className={`remember-card ${cardClass} ${
                item.completed ? "card-completed" : ""
              }`}
            >
              {/* Pinned 3D Pushpin on yellow notes */}
              {isYellow && (
                <div className="card-pin-wrap">
                  <PushPin />
                </div>
              )}

              <div className="card-main-content">
                <div className="card-top-row">
                  <span className="card-badge-emoji">{item.badge || "📌"}</span>
                  <div className="card-actions-mini">
                    {item.type === "task" && (
                      <button
                        type="button"
                        className="toggle-done-mini-btn"
                        onClick={() => onToggleItem(item.id)}
                        aria-label="Toggle completed"
                      >
                        <CheckCircle2
                          size={18}
                          className={item.completed ? "icon-done" : "icon-pending"}
                        />
                      </button>
                    )}
                    <button
                      type="button"
                      className="edit-note-mini-btn"
                      onClick={() => onEditItem(item)}
                      aria-label="Edit note"
                    >
                      <Pencil size={15} />
                    </button>
                    <button
                      type="button"
                      className="delete-note-mini-btn"
                      onClick={() => onRemoveItem(item.id)}
                      aria-label="Delete note"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>

                <h3 className="card-text-body card-text-editable">
                  {item.text}
                </h3>
                {item.subtitle && (
                  <p className="card-text-sub">{item.subtitle}</p>
                )}

                {/* Progress bar if present */}
                {item.progressCurrent && item.progressTotal && (
                  <div className="card-progress-bar-wrap">
                    <div
                      className="card-progress-bar-fill"
                      style={{
                        width: `${(item.progressCurrent / item.progressTotal) * 100}%`,
                      }}
                    />
                    <span className="progress-fraction-label">
                      Day {item.progressCurrent} of {item.progressTotal}
                    </span>
                  </div>
                )}

                {/* Countdown pill */}
                {item.countdownDate && (
                  <div className="countdown-pill-tag">
                    <span>🗓️ Upcoming</span>
                  </div>
                )}

                {/* Member Avatars */}
                {assignedMembers && assignedMembers.length > 0 && (
                  <div className="card-assigned-row">
                    {assignedMembers.map((m) => (
                      <span
                        key={m.id}
                        className="assigned-avatar-pill"
                        style={{ backgroundColor: m.colour }}
                        title={m.name}
                      >
                        {m.shortName || m.name.charAt(0)}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </article>
          );
        })}
      </div>
    </div>
  );
}
