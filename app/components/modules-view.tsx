"use client";

import React, { useState } from "react";
import {
  ArrowLeft,
  CalendarDays,
  CheckCircle2,
  Clock,
  GraduationCap,
  HeartPulse,
  Link as LinkIcon,
  Lock,
  MessageSquarePlus,
  Pin,
  Plus,
  Receipt,
  RefreshCw,
  Search,
  Send,
  Trash2,
  Trophy,
  XCircle,
} from "lucide-react";
import type { FamilyMember, GroundControlModule, ModuleFeed } from "../../src/core/models";
import type { CustomService } from "../../db/custom-services-queries";
import type { ModuleRequest, NewModuleRequestInput } from "../../db/module-requests-queries";
import { MemberAvatarContent } from "./member-avatar";

interface SyncResult {
  createdCount: number;
  updatedCount: number;
  lastSyncedAt: string;
}

interface ModulesViewProps {
  modules: GroundControlModule[];
  family: FamilyMember[];
  onToggle: (moduleKey: string, enabled: boolean) => void;
  onSaveFeed: (
    moduleKey: string,
    feed: { id?: string; label: string; url: string; personIds?: string[] }
  ) => Promise<ModuleFeed>;
  onSyncFeed: (moduleKey: string, feedId: string) => Promise<SyncResult>;
  onRemoveFeed: (moduleKey: string, feedId: string) => Promise<void>;
  onSetModuleVisibility: (moduleKey: string, memberIds: string[]) => void;
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
  onSetCustomServicePersonIds: (id: string, personIds: string[]) => void;
  moduleRequests: ModuleRequest[];
  onRequestModule: (input: Omit<NewModuleRequestInput, "familyId">) => Promise<ModuleRequest>;
}

const MODULE_ICONS: Record<string, React.ComponentType<{ size?: number }>> = {
  "calendar-days": CalendarDays,
  pin: Pin,
  trophy: Trophy,
  "graduation-cap": GraduationCap,
  "heart-pulse": HeartPulse,
  receipt: Receipt,
};

function ModuleIcon({ icon }: { icon?: string }) {
  const Icon = (icon && MODULE_ICONS[icon]) || Trophy;
  return <Icon size={20} />;
}

/**
 * Compact avatar multi-select used for both "Assigned to" (a feed/service's
 * synced events) and "Visible to" (a whole module's data) — empty selection
 * means "everyone" in both cases. An explicit "Everyone" chip clears the
 * selection rather than requiring every person to be individually picked.
 */
function PersonPicker({
  family,
  selectedIds,
  onChange,
  label,
}: {
  family: FamilyMember[];
  selectedIds: string[];
  onChange: (ids: string[]) => void;
  label: string;
}) {
  const isEveryone = selectedIds.length === 0;
  const people = family.filter((m) => m.role !== "pet");

  return (
    <div className="mini-person-picker">
      <p className="module-feed-label">{label}</p>
      <div className="mini-avatar-pick-row">
        <button
          type="button"
          className={`mini-pick-chip ${isEveryone ? "selected" : ""}`}
          onClick={() => onChange([])}
        >
          Everyone
        </button>
        {people.map((m) => {
          const isSelected = selectedIds.includes(m.id);
          return (
            <button
              key={m.id}
              type="button"
              className={`mini-avatar-pick-btn ${isSelected ? "selected" : ""}`}
              onClick={() =>
                onChange(
                  isSelected
                    ? selectedIds.filter((id) => id !== m.id)
                    : [...selectedIds, m.id]
                )
              }
              title={m.name}
              aria-label={m.name}
            >
              <span className="mini-avatar-circle" style={{ backgroundColor: m.colour }}>
                <MemberAvatarContent
                  avatarValue={m.avatarEmoji}
                  fallback={m.shortName || m.name.charAt(0)}
                />
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function ModuleFeedItem({
  moduleKey,
  feed,
  family,
  onSaveFeed,
  onSyncFeed,
  onRemoveFeed,
}: {
  moduleKey: string;
  feed: ModuleFeed;
  family: FamilyMember[];
  onSaveFeed: (
    moduleKey: string,
    feed: { id?: string; label: string; url: string; personIds?: string[] }
  ) => Promise<ModuleFeed>;
  onSyncFeed: (moduleKey: string, feedId: string) => Promise<SyncResult>;
  onRemoveFeed: (moduleKey: string, feedId: string) => Promise<void>;
}) {
  const [label, setLabel] = useState(feed.label);
  const [url, setUrl] = useState(feed.url);
  const [personIds, setPersonIds] = useState<string[]>(feed.personIds ?? []);
  const [status, setStatus] = useState<"idle" | "saving" | "syncing" | "removing" | "error">(
    "idle"
  );
  const [message, setMessage] = useState<string | null>(null);

  const handlePersonIdsChange = async (ids: string[]) => {
    setPersonIds(ids);
    await onSaveFeed(moduleKey, { id: feed.id, label: label.trim() || feed.label, url: url.trim() || feed.url, personIds: ids });
  };

  const handleSync = async () => {
    setStatus("saving");
    setMessage(null);
    try {
      if (label.trim() !== feed.label || url.trim() !== feed.url) {
        await onSaveFeed(moduleKey, { id: feed.id, label: label.trim() || feed.label, url: url.trim() });
      }
      setStatus("syncing");
      const result = await onSyncFeed(moduleKey, feed.id);
      setMessage(
        `Synced — ${result.createdCount} new, ${result.updatedCount} updated`
      );
      setStatus("idle");
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Sync failed");
      setStatus("error");
    }
  };

  const handleRemove = async () => {
    setStatus("removing");
    setMessage(null);
    try {
      await onRemoveFeed(moduleKey, feed.id);
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Failed to remove");
      setStatus("error");
    }
  };

  const isBusy = status === "saving" || status === "syncing" || status === "removing";

  return (
    <div className="module-feed-item">
      <div className="module-feed-row-header">
        <input
          type="text"
          className="module-feed-label-input"
          placeholder="Label, e.g. Emma — Football"
          value={label}
          onChange={(e) => setLabel(e.target.value)}
          aria-label="Feed label"
        />
        <button
          type="button"
          className="feed-remove-btn"
          onClick={handleRemove}
          disabled={isBusy}
          aria-label={`Remove ${feed.label || "feed"}`}
          title="Remove this feed"
        >
          <Trash2 size={14} />
        </button>
      </div>
      <div className="module-feed-input-row">
        <input
          type="text"
          className="module-feed-input"
          placeholder="webcal://... or https://....ics"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          aria-label="Calendar feed URL"
        />
        <button
          type="button"
          className="module-sync-btn"
          onClick={handleSync}
          disabled={isBusy || !url.trim()}
        >
          <RefreshCw size={14} className={status === "syncing" ? "spin" : ""} />
          {status === "syncing" ? "Syncing…" : "Sync now"}
        </button>
      </div>
      {message && (
        <p className={`module-feed-status ${status === "error" ? "is-error" : ""}`}>
          {message}
        </p>
      )}
      {!message && feed.lastSyncedAt && (
        <p className="module-feed-status">
          Last synced {new Date(feed.lastSyncedAt).toLocaleString()}
        </p>
      )}
      <PersonPicker
        family={family}
        selectedIds={personIds}
        onChange={handlePersonIdsChange}
        label="Assigned to"
      />
    </div>
  );
}

function AddFeedForm({
  moduleKey,
  onSaveFeed,
}: {
  moduleKey: string;
  onSaveFeed: (
    moduleKey: string,
    feed: { id?: string; label: string; url: string }
  ) => Promise<ModuleFeed>;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [label, setLabel] = useState("");
  const [url, setUrl] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!label.trim() || !url.trim()) return;
    setIsSaving(true);
    try {
      await onSaveFeed(moduleKey, { label: label.trim(), url: url.trim() });
      setLabel("");
      setUrl("");
      setIsOpen(false);
    } finally {
      setIsSaving(false);
    }
  };

  if (!isOpen) {
    return (
      <button type="button" className="add-feed-trigger-btn" onClick={() => setIsOpen(true)}>
        <Plus size={14} /> Add another feed
      </button>
    );
  }

  return (
    <form className="add-feed-form" onSubmit={handleAdd}>
      <input
        type="text"
        className="module-feed-label-input"
        placeholder="Label, e.g. Jack — Swimming"
        value={label}
        onChange={(e) => setLabel(e.target.value)}
        aria-label="Feed label"
        required
      />
      <input
        type="text"
        className="module-feed-input"
        placeholder="webcal://... or https://....ics"
        value={url}
        onChange={(e) => setUrl(e.target.value)}
        aria-label="Calendar feed URL"
        required
      />
      <div className="module-feed-input-row">
        <button
          type="submit"
          className="module-sync-btn"
          disabled={isSaving || !label.trim() || !url.trim()}
        >
          <Plus size={14} />
          {isSaving ? "Adding…" : "Add feed"}
        </button>
        <button type="button" className="feed-cancel-btn" onClick={() => setIsOpen(false)}>
          Cancel
        </button>
      </div>
    </form>
  );
}

function ModuleFeedsSection({
  mod,
  family,
  onSaveFeed,
  onSyncFeed,
  onRemoveFeed,
}: {
  mod: GroundControlModule;
  family: FamilyMember[];
  onSaveFeed: (
    moduleKey: string,
    feed: { id?: string; label: string; url: string; personIds?: string[] }
  ) => Promise<ModuleFeed>;
  onSyncFeed: (moduleKey: string, feedId: string) => Promise<SyncResult>;
  onRemoveFeed: (moduleKey: string, feedId: string) => Promise<void>;
}) {
  return (
    <div className="module-feeds-list">
      <p className="module-feed-label">
        <LinkIcon size={13} /> Calendar feeds (iCal / webcal links) — one per kid or team
      </p>
      {mod.feeds.map((feed) => (
        <ModuleFeedItem
          key={feed.id}
          moduleKey={mod.key}
          feed={feed}
          family={family}
          onSaveFeed={onSaveFeed}
          onSyncFeed={onSyncFeed}
          onRemoveFeed={onRemoveFeed}
        />
      ))}
      <AddFeedForm moduleKey={mod.key} onSaveFeed={onSaveFeed} />
    </div>
  );
}

function CustomServiceRow({
  service,
  family,
  onSaveFeedUrl,
  onSyncFeed,
  onDelete,
  onSetPersonIds,
}: {
  service: CustomService;
  family: FamilyMember[];
  onSaveFeedUrl: (id: string, feedUrl: string) => Promise<void>;
  onSyncFeed: (id: string) => Promise<SyncResult>;
  onDelete: (id: string) => Promise<void>;
  onSetPersonIds: (id: string, personIds: string[]) => void;
}) {
  const [feedUrl, setFeedUrl] = useState(service.feedUrl ?? "");
  const [personIds, setPersonIds] = useState<string[]>(service.personIds ?? []);
  const [status, setStatus] = useState<"idle" | "saving" | "syncing" | "error">("idle");
  const [message, setMessage] = useState<string | null>(null);

  const handlePersonIdsChange = (ids: string[]) => {
    setPersonIds(ids);
    onSetPersonIds(service.id, ids);
  };

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

      <PersonPicker
        family={family}
        selectedIds={personIds}
        onChange={handlePersonIdsChange}
        label="Assigned to"
      />
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

function RequestStatusPill({ status }: { status: ModuleRequest["status"] }) {
  if (status === "approved") {
    return (
      <span className="module-request-status-pill is-approved">
        <CheckCircle2 size={13} /> Approved
      </span>
    );
  }
  if (status === "declined") {
    return (
      <span className="module-request-status-pill is-declined">
        <XCircle size={13} /> Declined
      </span>
    );
  }
  return (
    <span className="module-request-status-pill is-pending">
      <Clock size={13} /> Pending review
    </span>
  );
}

function RequestModuleSection({
  moduleRequests,
  onRequestModule,
}: {
  moduleRequests: ModuleRequest[];
  onRequestModule: (input: Omit<NewModuleRequestInput, "familyId">) => Promise<ModuleRequest>;
}) {
  const [title, setTitle] = useState("");
  const [reason, setReason] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;
    setIsSaving(true);
    setMessage(null);
    try {
      await onRequestModule({ title: title.trim(), reason: reason.trim() || undefined });
      setTitle("");
      setReason("");
      setMessage("Thanks — your request has been sent to the Ground Control team.");
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Couldn't send your request — try again.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <section className="modules-section module-request-section">
      <h2 className="section-heading-title">
        <MessageSquarePlus size={18} /> Request a module
      </h2>
      <p className="section-heading-sub">
        Don&apos;t see something your family needs? Tell us what you&apos;re after and why —
        we review every request and reach out once it&apos;s ready.
      </p>

      <form className="module-request-form" onSubmit={handleSubmit}>
        <div className="form-field-group">
          <label className="module-feed-label" htmlFor="request-module-title">
            What would you like?
          </label>
          <input
            id="request-module-title"
            type="text"
            className="add-service-input"
            placeholder="e.g., Meal planner, Chore rota, Homework tracker"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
          />
        </div>
        <div className="form-field-group">
          <label className="module-feed-label" htmlFor="request-module-reason">
            Why would it help? (optional)
          </label>
          <textarea
            id="request-module-reason"
            className="add-service-input module-request-textarea"
            placeholder="Tell us a bit about how your family would use it"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            rows={3}
          />
        </div>
        <button type="submit" className="add-service-btn" disabled={isSaving || !title.trim()}>
          <Send size={16} />
          {isSaving ? "Sending…" : "Send request"}
        </button>
        {message && <p className="module-feed-status">{message}</p>}
      </form>

      {moduleRequests.length > 0 && (
        <div className="module-requests-list">
          {moduleRequests.map((req) => (
            <div key={req.id} className="module-request-item">
              <div className="module-request-item-top">
                <strong className="module-card-name">{req.title}</strong>
                <RequestStatusPill status={req.status} />
              </div>
              {req.reason && <p className="module-card-desc">{req.reason}</p>}
              {req.adminNote && (
                <p className="module-request-admin-note">Ground Control: {req.adminNote}</p>
              )}
              <p className="module-feed-status">
                Requested {new Date(req.createdAt).toLocaleDateString()}
              </p>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

export function ModulesView({
  modules,
  family,
  onToggle,
  onSaveFeed,
  onSyncFeed,
  onRemoveFeed,
  onSetModuleVisibility,
  onBack,
  customServices,
  onAddCustomService,
  onDeleteCustomService,
  onSaveCustomServiceFeedUrl,
  onSyncCustomServiceFeed,
  onDiscoverCalendarFeeds,
  onSetCustomServicePersonIds,
  moduleRequests,
  onRequestModule,
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
                <>
                  <ModuleFeedsSection
                    mod={mod}
                    family={family}
                    onSaveFeed={onSaveFeed}
                    onSyncFeed={onSyncFeed}
                    onRemoveFeed={onRemoveFeed}
                  />
                  <PersonPicker
                    family={family}
                    selectedIds={mod.visibleToMemberIds ?? []}
                    onChange={(ids) => onSetModuleVisibility(mod.key, ids)}
                    label="Visible to"
                  />
                </>
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
              family={family}
              onSaveFeedUrl={onSaveCustomServiceFeedUrl}
              onSyncFeed={onSyncCustomServiceFeed}
              onDelete={onDeleteCustomService}
              onSetPersonIds={onSetCustomServicePersonIds}
            />
          ))}
        </div>
        <AddServiceForm
          onAddCustomService={onAddCustomService}
          onDiscoverCalendarFeeds={onDiscoverCalendarFeeds}
        />
      </section>

      <RequestModuleSection moduleRequests={moduleRequests} onRequestModule={onRequestModule} />
    </div>
  );
}
