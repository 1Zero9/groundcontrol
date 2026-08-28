"use client";

import React, { useState } from "react";
import {
  ArrowLeft,
  CalendarDays,
  GraduationCap,
  HeartPulse,
  Link as LinkIcon,
  Lock,
  Pin,
  Plus,
  RefreshCw,
  Search,
  Trash2,
  Trophy,
} from "lucide-react";
import type { GroundControlModule } from "../../src/core/models";
import type { CustomService } from "../../db/custom-services-queries";

interface SyncResult {
  createdCount: number;
  updatedCount: number;
  lastSyncedAt: string;
}

interface ModulesViewProps {
  modules: GroundControlModule[];
  onToggle: (moduleKey: string, enabled: boolean) => void;
  onSaveFeedUrl: (moduleKey: string, feedUrl: string) => Promise<void>;
  onSyncFeed: (moduleKey: string) => Promise<SyncResult>;
  onBack: () => void;
  customServices: CustomService[];
  onAddCustomService: (input: {
    name: string;
    icon?: string;
    colour?: string;
    feedUrl?: string;
  }) => Promise<CustomService>;
  onDeleteCustomService: (id: string) => Promise<void>;
  onSaveCustomServiceFeedUrl: (id: string, feedUrl: string) => Promise<void>;
  onSyncCustomServiceFeed: (id: string) => Promise<SyncResult>;
  onDiscoverCalendarFeeds: (pageUrl: string) => Promise<string[]>;
}

const MODULE_ICONS: Record<string, React.ComponentType<{ size?: number }>> = {
  "calendar-days": CalendarDays,
  pin: Pin,
  trophy: Trophy,
  "graduation-cap": GraduationCap,
  "heart-pulse": HeartPulse,
};

function ModuleIcon({ icon }: { icon?: string }) {
  const Icon = (icon && MODULE_ICONS[icon]) || Trophy;
  return <Icon size={20} />;
}

function FeedSyncRow({
  mod,
  onSaveFeedUrl,
  onSyncFeed,
}: {
  mod: GroundControlModule;
  onSaveFeedUrl: (moduleKey: string, feedUrl: string) => Promise<void>;
  onSyncFeed: (moduleKey: string) => Promise<SyncResult>;
}) {
  const [feedUrl, setFeedUrl] = useState(mod.feedUrl ?? "");
  const [status, setStatus] = useState<"idle" | "saving" | "syncing" | "error">("idle");
  const [message, setMessage] = useState<string | null>(null);

  const handleSync = async () => {
    setStatus("saving");
    setMessage(null);
    try {
      if (feedUrl.trim() && feedUrl.trim() !== mod.feedUrl) {
        await onSaveFeedUrl(mod.key, feedUrl.trim());
      }
      setStatus("syncing");
      const result = await onSyncFeed(mod.key);
      setMessage(
        `Synced — ${result.createdCount} new, ${result.updatedCount} updated`
      );
      setStatus("idle");
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Sync failed");
      setStatus("error");
    }
  };

  const isBusy = status === "saving" || status === "syncing";

  return (
    <div className="module-feed-row">
      <label className="module-feed-label" htmlFor={`feed-url-${mod.key}`}>
        <LinkIcon size={13} /> Calendar feed (iCal / webcal link)
      </label>
      <div className="module-feed-input-row">
        <input
          id={`feed-url-${mod.key}`}
          type="text"
          className="module-feed-input"
          placeholder="webcal://... or https://....ics"
          value={feedUrl}
          onChange={(e) => setFeedUrl(e.target.value)}
        />
        <button
          type="button"
          className="module-sync-btn"
          onClick={handleSync}
          disabled={isBusy || !feedUrl.trim()}
        >
          <RefreshCw size={14} className={isBusy ? "spin" : ""} />
          {isBusy ? "Syncing…" : "Sync now"}
        </button>
      </div>
      {message && (
        <p className={`module-feed-status ${status === "error" ? "is-error" : ""}`}>
          {message}
        </p>
      )}
      {!message && mod.lastSyncedAt && (
        <p className="module-feed-status">
          Last synced {new Date(mod.lastSyncedAt).toLocaleString()}
        </p>
      )}
    </div>
  );
}

function CustomServiceRow({
  service,
  onSaveFeedUrl,
  onSyncFeed,
  onDelete,
}: {
  service: CustomService;
  onSaveFeedUrl: (id: string, feedUrl: string) => Promise<void>;
  onSyncFeed: (id: string) => Promise<SyncResult>;
  onDelete: (id: string) => Promise<void>;
}) {
  const [feedUrl, setFeedUrl] = useState(service.feedUrl ?? "");
  const [status, setStatus] = useState<"idle" | "saving" | "syncing" | "error">("idle");
  const [message, setMessage] = useState<string | null>(null);

  const handleSync = async () => {
    setStatus("saving");
    setMessage(null);
    try {
      if (feedUrl.trim() && feedUrl.trim() !== service.feedUrl) {
        await onSaveFeedUrl(service.id, feedUrl.trim());
      }
      setStatus("syncing");
      const result = await onSyncFeed(service.id);
      setMessage(
        `Synced — ${result.createdCount} new, ${result.updatedCount} updated`
      );
      setStatus("idle");
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Sync failed");
      setStatus("error");
    }
  };

  const isBusy = status === "saving" || status === "syncing";

  return (
    <div className="module-card module-card-column">
      <div className="module-card-top-row">
        <div className="module-card-left">
          <span className="module-card-icon">{service.icon || "📌"}</span>
          <div className="module-card-info">
            <strong className="module-card-name">{service.name}</strong>
            <span className="module-card-desc">
              {service.feedUrl ? "Synced from a calendar feed" : "Manual — no calendar feed"}
            </span>
          </div>
        </div>
        <button
          type="button"
          className="custom-service-delete-btn"
          onClick={() => onDelete(service.id)}
          aria-label={`Remove ${service.name}`}
          title="Remove this service"
        >
          <Trash2 size={16} />
        </button>
      </div>

      <div className="module-feed-row">
        <label className="module-feed-label" htmlFor={`custom-feed-url-${service.id}`}>
          <LinkIcon size={13} /> Calendar feed (iCal / webcal link, optional)
        </label>
        <div className="module-feed-input-row">
          <input
            id={`custom-feed-url-${service.id}`}
            type="text"
            className="module-feed-input"
            placeholder="webcal://... or https://....ics"
            value={feedUrl}
            onChange={(e) => setFeedUrl(e.target.value)}
          />
          <button
            type="button"
            className="module-sync-btn"
            onClick={handleSync}
            disabled={isBusy || !feedUrl.trim()}
          >
            <RefreshCw size={14} className={isBusy ? "spin" : ""} />
            {isBusy ? "Syncing…" : "Sync now"}
          </button>
        </div>
        {message && (
          <p className={`module-feed-status ${status === "error" ? "is-error" : ""}`}>
            {message}
          </p>
        )}
        {!message && service.lastSyncedAt && (
          <p className="module-feed-status">
            Last synced {new Date(service.lastSyncedAt).toLocaleString()}
          </p>
        )}
      </div>
    </div>
  );
}

function AddServiceForm({
  onAddCustomService,
  onDiscoverCalendarFeeds,
}: {
  onAddCustomService: (input: {
    name: string;
    icon?: string;
    colour?: string;
    feedUrl?: string;
  }) => Promise<CustomService>;
  onDiscoverCalendarFeeds: (pageUrl: string) => Promise<string[]>;
}) {
  const [name, setName] = useState("");
  const [feedUrl, setFeedUrl] = useState("");
  const [websiteUrl, setWebsiteUrl] = useState("");
  const [suggestions, setSuggestions] = useState<string[] | null>(null);
  const [isSearching, setIsSearching] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [searchMessage, setSearchMessage] = useState<string | null>(null);

  const handleFindCalendar = async () => {
    if (!websiteUrl.trim()) return;
    setIsSearching(true);
    setSearchMessage(null);
    setSuggestions(null);
    try {
      const found = await onDiscoverCalendarFeeds(websiteUrl.trim());
      setSuggestions(found);
      if (found.length === 0) {
        setSearchMessage("Couldn't find a calendar on that site — try pasting the .ics link directly.");
      }
    } catch {
      setSearchMessage("Search failed — try pasting the .ics link directly.");
    } finally {
      setIsSearching(false);
    }
  };

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    setIsSaving(true);
    try {
      await onAddCustomService({ name: name.trim(), feedUrl: feedUrl.trim() || undefined });
      setName("");
      setFeedUrl("");
      setWebsiteUrl("");
      setSuggestions(null);
      setSearchMessage(null);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <form className="add-service-form" onSubmit={handleAdd}>
      <div className="form-field-group">
        <label className="module-feed-label" htmlFor="new-service-name">
          Service name
        </label>
        <input
          id="new-service-name"
          type="text"
          className="add-service-input"
          placeholder="e.g., College timetable, Football tournament"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
        />
      </div>

      <div className="form-field-group">
        <label className="module-feed-label" htmlFor="new-service-website">
          <Search size={13} /> Find a calendar from a website (optional)
        </label>
        <div className="module-feed-input-row">
          <input
            id="new-service-website"
            type="text"
            className="add-service-input"
            placeholder="e.g., stmarys.school.ie"
            value={websiteUrl}
            onChange={(e) => setWebsiteUrl(e.target.value)}
          />
          <button
            type="button"
            className="module-sync-btn"
            onClick={handleFindCalendar}
            disabled={isSearching || !websiteUrl.trim()}
          >
            <Search size={14} className={isSearching ? "spin" : ""} />
            {isSearching ? "Searching…" : "Find calendar"}
          </button>
        </div>
        {searchMessage && <p className="module-feed-status is-error">{searchMessage}</p>}
        {suggestions && suggestions.length > 0 && (
          <div className="discover-feeds-list">
            {suggestions.map((url) => (
              <button
                key={url}
                type="button"
                className={`discover-feed-btn ${feedUrl === url ? "selected" : ""}`}
                onClick={() => setFeedUrl(url)}
                title={url}
              >
                {url}
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="form-field-group">
        <label className="module-feed-label" htmlFor="new-service-feed">
          <LinkIcon size={13} /> Calendar feed URL (optional)
        </label>
        <input
          id="new-service-feed"
          type="text"
          className="add-service-input"
          placeholder="webcal://... or https://....ics"
          value={feedUrl}
          onChange={(e) => setFeedUrl(e.target.value)}
        />
      </div>

      <button type="submit" className="add-service-btn" disabled={isSaving || !name.trim()}>
        <Plus size={16} />
        {isSaving ? "Adding…" : "Add service"}
      </button>
    </form>
  );
}

export function ModulesView({
  modules,
  onToggle,
  onSaveFeedUrl,
  onSyncFeed,
  onBack,
  customServices,
  onAddCustomService,
  onDeleteCustomService,
  onSaveCustomServiceFeedUrl,
  onSyncCustomServiceFeed,
  onDiscoverCalendarFeeds,
}: ModulesViewProps) {
  const coreModules = modules.filter((m) => m.isCore);
  const optionalModules = modules.filter((m) => !m.isCore);

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
          <h1 className="screen-title">Modules</h1>
          <p className="screen-subtitle">
            Turn features on or off for your household
          </p>
        </div>
      </div>

      <section className="modules-section">
        <h2 className="section-heading-title">Core</h2>
        <p className="section-heading-sub">
          Always on — the essentials every family needs
        </p>
        <div className="modules-list">
          {coreModules.map((mod) => (
            <div key={mod.key} className="module-card">
              <div className="module-card-left">
                <span className="module-card-icon">
                  <ModuleIcon icon={mod.icon} />
                </span>
                <div className="module-card-info">
                  <strong className="module-card-name">{mod.name}</strong>
                  <span className="module-card-desc">{mod.description}</span>
                </div>
              </div>
              <span className="module-locked-badge" title="Always on">
                <Lock size={14} />
              </span>
            </div>
          ))}
        </div>
      </section>

      <section className="modules-section">
        <h2 className="section-heading-title">Available</h2>
        <p className="section-heading-sub">
          Enable the modules that fit your family
        </p>
        <div className="modules-list">
          {optionalModules.map((mod) => (
            <div key={mod.key} className="module-card module-card-column">
              <div className="module-card-top-row">
                <div className="module-card-left">
                  <span className="module-card-icon">
                    <ModuleIcon icon={mod.icon} />
                  </span>
                  <div className="module-card-info">
                    <strong className="module-card-name">{mod.name}</strong>
                    <span className="module-card-desc">{mod.description}</span>
                  </div>
                </div>
                <button
                  type="button"
                  role="switch"
                  aria-checked={mod.enabled}
                  aria-label={`Toggle ${mod.name} module`}
                  className={`toggle-switch-pill ${mod.enabled ? "on" : "off"}`}
                  onClick={() => onToggle(mod.key, !mod.enabled)}
                >
                  <span className="toggle-switch-thumb" />
                </button>
              </div>

              {mod.enabled && (
                <FeedSyncRow mod={mod} onSaveFeedUrl={onSaveFeedUrl} onSyncFeed={onSyncFeed} />
              )}
            </div>
          ))}
        </div>
      </section>

      <section className="modules-section">
        <h2 className="section-heading-title">Your services</h2>
        <p className="section-heading-sub">
          Add anything that isn&apos;t a built-in module — a college schedule, a
          tournament, a club — with or without a calendar feed
        </p>
        <div className="modules-list">
          {customServices.map((service) => (
            <CustomServiceRow
              key={service.id}
              service={service}
              onSaveFeedUrl={onSaveCustomServiceFeedUrl}
              onSyncFeed={onSyncCustomServiceFeed}
              onDelete={onDeleteCustomService}
            />
          ))}
        </div>
        <AddServiceForm
          onAddCustomService={onAddCustomService}
          onDiscoverCalendarFeeds={onDiscoverCalendarFeeds}
        />
      </section>
    </div>
  );
}
