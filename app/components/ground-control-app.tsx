"use client";

import React, { useState, useEffect } from "react";
import { Home, CalendarDays, Plus, User, Menu } from "lucide-react";
import type { BoardItem, Event, FamilyMember, GroundControlModule } from "../../src/core/models";
import type { CustomService } from "../../db/custom-services-queries";
import { TodayView } from "./today-view";
import { WeekView } from "./week-view";
import { RememberBoardView } from "./remember-board-view";
import { ProfileView } from "./profile-view";
import { ModulesView } from "./modules-view";
import { KitchenDisplayView } from "./kitchen-display-view";
import { AddModal } from "./add-modal";
import {
  createBoardItemAction,
  createCustomServiceAction,
  createEventAction,
  deleteCustomServiceAction,
  discoverCalendarFeedsAction,
  removeBoardItemAction,
  saveModuleFeedUrlAction,
  setCustomServiceFeedUrlAction,
  setFamilyModuleEnabledAction,
  syncCustomServiceFeedAction,
  syncModuleFeedAction,
  toggleBoardItemAction,
} from "../actions";

interface GroundControlAppProps {
  familyId: string;
  family: FamilyMember[];
  events: Event[];
  initialBoard: BoardItem[];
  initialModules: GroundControlModule[];
  initialCustomServices: CustomService[];
}

type TabView = "today" | "week" | "remember" | "profile" | "modules" | "kitchen";

export function GroundControlApp({
  familyId,
  family,
  events: initialEvents,
  initialBoard,
  initialModules,
  initialCustomServices,
}: GroundControlAppProps) {
  const [activeTab, setActiveTab] = useState<TabView>("today");
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [currentUserId, setCurrentUserId] = useState(family[0]?.id ?? "");
  const [events, setEvents] = useState<Event[]>(initialEvents);
  const [board, setBoard] = useState<BoardItem[]>(initialBoard);
  const [modules, setModules] = useState<GroundControlModule[]>(initialModules);
  const [customServices, setCustomServices] = useState<CustomService[]>(initialCustomServices);
  const [isAddOpen, setIsAddOpen] = useState(false);

  // Register service worker if available
  useEffect(() => {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch(() => undefined);
    }
  }, []);

  const currentUser =
    family.find((m) => m.id === currentUserId) || family[0];

  const handleSaveEvent = async (draft: Event) => {
    const optimisticId = draft.id;
    setEvents((prev) => [draft, ...prev]);
    try {
      const saved = await createEventAction({
        familyId,
        title: draft.title,
        description: draft.description,
        start: draft.start,
        end: draft.end,
        allDay: draft.allDay,
        personIds: draft.personIds,
        category: draft.category,
        location: draft.location,
        icon: draft.icon,
        accentColor: draft.accentColor,
        source: draft.source,
        customServiceId: draft.customServiceId,
      });
      setEvents((prev) => prev.map((e) => (e.id === optimisticId ? saved : e)));
    } catch (err) {
      console.error("Failed to save event", err);
      setEvents((prev) => prev.filter((e) => e.id !== optimisticId));
    }
  };

  const handleSaveBoardItem = async (draft: BoardItem) => {
    const optimisticId = draft.id;
    setBoard((prev) => [draft, ...prev]);
    try {
      const saved = await createBoardItemAction({
        familyId,
        text: draft.text,
        type: draft.type,
        personIds: draft.personIds,
        pinned: draft.pinned,
        badge: draft.badge,
        color: draft.color,
        customServiceId: draft.customServiceId,
      });
      setBoard((prev) => prev.map((b) => (b.id === optimisticId ? saved : b)));
    } catch (err) {
      console.error("Failed to save board item", err);
      setBoard((prev) => prev.filter((b) => b.id !== optimisticId));
    }
  };

  const handleRemoveBoardItem = async (id: string) => {
    const previous = board;
    setBoard((prev) => prev.filter((b) => b.id !== id));
    try {
      await removeBoardItemAction(id);
    } catch (err) {
      console.error("Failed to remove board item", err);
      setBoard(previous);
    }
  };

  const handleToggleBoardItem = async (id: string) => {
    setBoard((prev) =>
      prev.map((b) => (b.id === id ? { ...b, completed: !b.completed } : b))
    );
    try {
      await toggleBoardItemAction(id);
    } catch (err) {
      console.error("Failed to toggle board item", err);
      setBoard((prev) =>
        prev.map((b) => (b.id === id ? { ...b, completed: !b.completed } : b))
      );
    }
  };

  const handleToggleModule = async (moduleKey: string, enabled: boolean) => {
    setModules((prev) =>
      prev.map((m) => (m.key === moduleKey ? { ...m, enabled } : m))
    );
    try {
      await setFamilyModuleEnabledAction(familyId, moduleKey, enabled);
    } catch (err) {
      console.error("Failed to toggle module", err);
      setModules((prev) =>
        prev.map((m) => (m.key === moduleKey ? { ...m, enabled: !enabled } : m))
      );
    }
  };

  const handleSaveModuleFeedUrl = async (moduleKey: string, feedUrl: string) => {
    await saveModuleFeedUrlAction(familyId, moduleKey, feedUrl);
    setModules((prev) =>
      prev.map((m) => (m.key === moduleKey ? { ...m, feedUrl } : m))
    );
  };

  const handleSyncModuleFeed = async (moduleKey: string) => {
    const result = await syncModuleFeedAction(familyId, moduleKey);
    setEvents((prev) => {
      const byId = new Map(prev.map((e) => [e.id, e]));
      for (const synced of result.events) {
        byId.set(synced.id, synced);
      }
      return Array.from(byId.values());
    });
    setModules((prev) =>
      prev.map((m) =>
        m.key === moduleKey ? { ...m, lastSyncedAt: result.lastSyncedAt } : m
      )
    );
    return result;
  };

  const handleAddCustomService = async (input: {
    name: string;
    icon?: string;
    colour?: string;
    feedUrl?: string;
  }) => {
    const created = await createCustomServiceAction({ familyId, ...input });
    setCustomServices((prev) => [...prev, created]);
    return created;
  };

  const handleDeleteCustomService = async (id: string) => {
    const previous = customServices;
    setCustomServices((prev) => prev.filter((s) => s.id !== id));
    try {
      await deleteCustomServiceAction(id, familyId);
    } catch (err) {
      console.error("Failed to delete custom service", err);
      setCustomServices(previous);
    }
  };

  const handleSaveCustomServiceFeedUrl = async (id: string, feedUrl: string) => {
    await setCustomServiceFeedUrlAction(id, familyId, feedUrl);
    setCustomServices((prev) =>
      prev.map((s) => (s.id === id ? { ...s, feedUrl } : s))
    );
  };

  const handleSyncCustomServiceFeed = async (id: string) => {
    const result = await syncCustomServiceFeedAction(familyId, id);
    setEvents((prev) => {
      const byId = new Map(prev.map((e) => [e.id, e]));
      for (const synced of result.events) {
        byId.set(synced.id, synced);
      }
      return Array.from(byId.values());
    });
    setCustomServices((prev) =>
      prev.map((s) => (s.id === id ? { ...s, lastSyncedAt: result.lastSyncedAt } : s))
    );
    return result;
  };

  const handleDiscoverCalendarFeeds = async (pageUrl: string) => {
    return discoverCalendarFeedsAction(pageUrl);
  };

  return (
    <div
      className={`app-viewport-root ${isDarkMode ? "theme-dark" : "theme-light"}`}
    >
      {/* Main Content Area */}
      {activeTab === "kitchen" ? (
        <KitchenDisplayView
          family={family}
          events={events}
          board={board}
          currentUser={currentUser}
          onSelectUser={(u) => {
            setCurrentUserId(u.id);
            setActiveTab("today");
          }}
          onOpenAdd={() => setIsAddOpen(true)}
          onExit={() => setActiveTab("today")}
        />
      ) : (
        <div className="app-shell">
          <div className="app-shell-inner">
            {/* Mobile App Header */}
            <header className="mobile-app-header">
              <button
                type="button"
                className="header-menu-btn"
                onClick={() => setActiveTab("profile")}
                aria-label="Open menu and family profiles"
              >
                <Menu size={24} />
              </button>

              <h1 className="header-brand-title">Ground Control</h1>

              <button
                type="button"
                className="header-avatar-btn"
                onClick={() => setActiveTab("profile")}
                aria-label={`Current user: ${currentUser.name}. Tap to change.`}
              >
                <span
                  className="header-avatar-circle"
                  style={{ backgroundColor: currentUser.colour || "#6C4DFF" }}
                >
                  {currentUser.shortName || currentUser.name.charAt(0)}
                </span>
              </button>
            </header>

            {/* Scrollable View Content */}
            <main className="mobile-scrollable-content">
              {activeTab === "today" && (
                <TodayView
                  currentUser={currentUser}
                  events={events}
                  board={board}
                  onNavigateToWeek={() => setActiveTab("week")}
                  onOpenAdd={() => setIsAddOpen(true)}
                  onToggleTask={handleToggleBoardItem}
                />
              )}

              {activeTab === "week" && (
                <WeekView
                  currentUser={currentUser}
                  family={family}
                  events={events}
                  onOpenAdd={() => setIsAddOpen(true)}
                />
              )}

              {activeTab === "remember" && (
                <RememberBoardView
                  board={board}
                  family={family}
                  onOpenAdd={() => setIsAddOpen(true)}
                  onRemoveItem={handleRemoveBoardItem}
                  onToggleItem={handleToggleBoardItem}
                />
              )}

              {activeTab === "profile" && (
                <ProfileView
                  family={family}
                  currentUser={currentUser}
                  onSelectUser={(u) => {
                    setCurrentUserId(u.id);
                    setActiveTab("today");
                  }}
                  events={events}
                  board={board}
                  onOpenAdd={() => setIsAddOpen(true)}
                  onOpenModules={() => setActiveTab("modules")}
                  onOpenKitchen={() => setActiveTab("kitchen")}
                  isDarkMode={isDarkMode}
                  onToggleDarkMode={() => setIsDarkMode((prev) => !prev)}
                />
              )}

              {activeTab === "modules" && (
                <ModulesView
                  modules={modules}
                  onToggle={handleToggleModule}
                  onSaveFeedUrl={handleSaveModuleFeedUrl}
                  onSyncFeed={handleSyncModuleFeed}
                  onBack={() => setActiveTab("profile")}
                  customServices={customServices}
                  onAddCustomService={handleAddCustomService}
                  onDeleteCustomService={handleDeleteCustomService}
                  onSaveCustomServiceFeedUrl={handleSaveCustomServiceFeedUrl}
                  onSyncCustomServiceFeed={handleSyncCustomServiceFeed}
                  onDiscoverCalendarFeeds={handleDiscoverCalendarFeeds}
                />
              )}
            </main>

            {/* Mobile Bottom Dock Navigation */}
            <nav className="mobile-bottom-dock" aria-label="Bottom Navigation">
              <button
                type="button"
                className={`dock-tab-btn ${activeTab === "today" ? "active" : ""}`}
                onClick={() => setActiveTab("today")}
              >
                <Home size={22} className="dock-icon" />
                <span className="dock-label">Today</span>
              </button>

              <button
                type="button"
                className={`dock-tab-btn ${activeTab === "week" ? "active" : ""}`}
                onClick={() => setActiveTab("week")}
              >
                <CalendarDays size={22} className="dock-icon" />
                <span className="dock-label">My week</span>
              </button>

              <button
                type="button"
                className="dock-tab-btn dock-add-btn"
                onClick={() => setIsAddOpen(true)}
                aria-label="Add"
              >
                <div className="dock-add-circle">
                  <Plus size={22} strokeWidth={2.5} />
                </div>
                <span className="dock-label">Add</span>
              </button>

              <button
                type="button"
                className={`dock-tab-btn ${activeTab === "profile" ? "active" : ""}`}
                onClick={() => setActiveTab("profile")}
              >
                <User size={22} className="dock-icon" />
                <span className="dock-label">Profile</span>
              </button>
            </nav>
          </div>
        </div>
      )}

      {/* Global Add Something Modal */}
      <AddModal
        isOpen={isAddOpen}
        onClose={() => setIsAddOpen(false)}
        currentUser={currentUser}
        family={family}
        customServices={customServices}
        onSaveEvent={handleSaveEvent}
        onSaveBoardItem={handleSaveBoardItem}
      />
    </div>
  );
}
