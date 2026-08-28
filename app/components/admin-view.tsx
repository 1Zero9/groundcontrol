"use client";

import { useMemo, useState, type FormEvent } from "react";
import {
  RefreshCw,
  Link as LinkIcon,
  ShieldCheck,
  LogOut,
  Pencil,
  Check,
  KeyRound,
  Plus,
  Search,
  Trash2,
  ChevronDown,
  ChevronRight,
  Users,
} from "lucide-react";
import type { GroundControlModule, ModuleFeed } from "../../src/core/models";
import type { AdminFamilySummary } from "../../db/admin-queries";
import type { CustomService } from "../../db/custom-services-queries";
import {
  adminCreateCustomServiceAction,
  adminDeleteCustomServiceAction,
  adminDiscoverCalendarFeedsAction,
  adminRemoveModuleFeedAction,
  adminRenameFamilyAction,
  adminResetFamilyLoginAction,
  adminSaveCustomServiceFeedUrlAction,
  adminSaveModuleFeedAction,
  adminSetModuleEnabledAction,
  adminSyncCustomServiceFeedAction,
  adminSyncModuleFeedAction,
} from "../admin/actions";

interface SyncResult {
  createdCount: number;
  updatedCount: number;
  lastSyncedAt: string;
}
import { adminLogoutAction } from "../../lib/auth/admin-actions";

interface AdminViewProps {
  families: AdminFamilySummary[];
}

function AdminModuleFeedItem({
  moduleKey,
  feed,
  onSaveFeed,
  onSyncFeed,
  onRemoveFeed,
}: {
  moduleKey: string;
  feed: ModuleFeed;
  onSaveFeed: (
    moduleKey: string,
    feed: { id?: string; label: string; url: string }
  ) => Promise<ModuleFeed>;
  onSyncFeed: (moduleKey: string, feedId: string) => Promise<SyncResult>;
  onRemoveFeed: (moduleKey: string, feedId: string) => Promise<void>;
}) {
  const [label, setLabel] = useState(feed.label);
  const [url, setUrl] = useState(feed.url);
  const [status, setStatus] = useState<"idle" | "saving" | "syncing" | "removing" | "error">(
    "idle"
  );
  const [message, setMessage] = useState<string | null>(null);

  const handleSync = async () => {
    setStatus("saving");
    setMessage(null);
    try {
      if (label.trim() !== feed.label || url.trim() !== feed.url) {
        await onSaveFeed(moduleKey, { id: feed.id, label: label.trim() || feed.label, url: url.trim() });
      }
      setStatus("syncing");
      const result = await onSyncFeed(moduleKey, feed.id);
      setMessage(`Synced — ${result.createdCount} new, ${result.updatedCount} updated`);
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
        <p className={`module-feed-status ${status === "error" ? "is-error" : ""}`}>{message}</p>
      )}
      {!message && feed.lastSyncedAt && (
        <p className="module-feed-status">
          Last synced {new Date(feed.lastSyncedAt).toLocaleString()}
        </p>
      )}
    </div>
  );
}

function AdminAddFeedForm({
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

  const handleAdd = async (e: FormEvent) => {
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

function AdminModuleFeedsSection({
  mod,
  onSaveFeed,
  onSyncFeed,
  onRemoveFeed,
}: {
  mod: GroundControlModule;
  onSaveFeed: (
    moduleKey: string,
    feed: { id?: string; label: string; url: string }
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
        <AdminModuleFeedItem
          key={feed.id}
          moduleKey={mod.key}
          feed={feed}
          onSaveFeed={onSaveFeed}
          onSyncFeed={onSyncFeed}
          onRemoveFeed={onRemoveFeed}
        />
      ))}
      <AdminAddFeedForm moduleKey={mod.key} onSaveFeed={onSaveFeed} />
    </div>
  );
}

function AdminRenameForm({ family }: { family: AdminFamilySummary }) {
  const [isEditing, setIsEditing] = useState(false);
  const [name, setName] = useState(family.name);
  const [isSaving, setIsSaving] = useState(false);

  const handleSave = async (e: FormEvent) => {
    e.preventDefault();
    if (!name.trim() || name.trim() === family.name) {
      setIsEditing(false);
      return;
    }
    setIsSaving(true);
    try {
      await adminRenameFamilyAction(family.id, name.trim());
      setIsEditing(false);
    } finally {
      setIsSaving(false);
    }
  };

  if (!isEditing) {
    return (
      <button
        type="button"
        className="admin-rename-trigger-btn"
        onClick={() => setIsEditing(true)}
        aria-label={`Rename ${family.name}`}
        title="Rename household"
      >
        <Pencil size={13} />
      </button>
    );
  }

  return (
    <form className="admin-rename-form" onSubmit={handleSave}>
      <input
        type="text"
        className="add-service-input"
        value={name}
        onChange={(e) => setName(e.target.value)}
      />
      <button type="submit" className="module-sync-btn" disabled={isSaving || !name.trim()}>
        <Check size={14} /> Save
      </button>
    </form>
  );
}

function AdminResetLoginForm({ family }: { family: AdminFamilySummary }) {
  const [isOpen, setIsOpen] = useState(false);
  const [email, setEmail] = useState(family.ownerEmail ?? "");
  const [password, setPassword] = useState("");
  const [status, setStatus] = useState<"idle" | "saving" | "error">("idle");
  const [message, setMessage] = useState<string | null>(null);

  const handleSave = async (e: FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password.trim()) return;
    setStatus("saving");
    setMessage(null);
    try {
      await adminResetFamilyLoginAction(family.id, email.trim(), password.trim());
      setMessage("Login updated");
      setStatus("idle");
      setPassword("");
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Failed to update login");
      setStatus("error");
    }
  };

  if (!isOpen) {
    return (
      <button
        type="button"
        className="admin-reset-login-trigger-btn"
        onClick={() => setIsOpen(true)}
      >
        <KeyRound size={13} /> Reset login
      </button>
    );
  }

  return (
    <form className="admin-reset-login-form" onSubmit={handleSave}>
      <input
        type="email"
        className="add-service-input"
        placeholder="Login email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        required
      />
      <input
        type="password"
        className="add-service-input"
        placeholder="New password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        required
      />
      <div className="admin-reset-login-actions">
        <button
          type="submit"
          className="module-sync-btn"
          disabled={status === "saving" || !email.trim() || !password.trim()}
        >
          {status === "saving" ? "Saving…" : "Save login"}
        </button>
        <button type="button" className="admin-reset-login-cancel-btn" onClick={() => setIsOpen(false)}>
          Cancel
        </button>
      </div>
      {message && (
        <p className={`module-feed-status ${status === "error" ? "is-error" : ""}`}>{message}</p>
      )}
    </form>
  );
}

function AdminCustomServiceRow({
  familyId,
  service,
  onDelete,
}: {
  familyId: string;
  service: CustomService;
  onDelete: (id: string) => void;
}) {
  const [feedUrl, setFeedUrl] = useState(service.feedUrl ?? "");
  const [status, setStatus] = useState<"idle" | "saving" | "syncing" | "error">("idle");
  const [message, setMessage] = useState<string | null>(null);

  const handleSync = async () => {
    setStatus("saving");
    setMessage(null);
    try {
      if (feedUrl.trim() && feedUrl.trim() !== service.feedUrl) {
        await adminSaveCustomServiceFeedUrlAction(service.id, familyId, feedUrl.trim());
      }
      setStatus("syncing");
      const result = await adminSyncCustomServiceFeedAction(familyId, service.id);
      setMessage(`Synced — ${result.createdCount} new, ${result.updatedCount} updated`);
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
        <label className="module-feed-label" htmlFor={`admin-custom-feed-${service.id}`}>
          <LinkIcon size={13} /> Calendar feed (iCal / webcal link, optional)
        </label>
        <div className="module-feed-input-row">
          <input
            id={`admin-custom-feed-${service.id}`}
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
          <p className={`module-feed-status ${status === "error" ? "is-error" : ""}`}>{message}</p>
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

function AdminAddServiceForm({
  familyId,
  onAdded,
}: {
  familyId: string;
  onAdded: (service: CustomService) => void;
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
      const found = await adminDiscoverCalendarFeedsAction(websiteUrl.trim());
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

  const handleAdd = async (e: FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    setIsSaving(true);
    try {
      const created = await adminCreateCustomServiceAction({
        familyId,
        name: name.trim(),
        feedUrl: feedUrl.trim() || undefined,
      });
      onAdded(created);
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
        <input
          type="text"
          className="add-service-input"
          placeholder="Service name, e.g. College timetable"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
        />
      </div>

      <div className="form-field-group">
        <div className="module-feed-input-row">
          <input
            type="text"
            className="add-service-input"
            placeholder="Find a calendar: paste a website, e.g. stmarys.school.ie"
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
            {isSearching ? "Searching…" : "Find"}
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
        <input
          type="text"
          className="add-service-input"
          placeholder="Calendar feed URL (optional)"
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

function AdminFamilyCard({
  family,
  isOpen,
  onToggle,
}: {
  family: AdminFamilySummary;
  isOpen: boolean;
  onToggle: () => void;
}) {
  const [modules, setModules] = useState(family.modules);
  const [customServices, setCustomServices] = useState(family.customServices);
  const optionalModules = modules.filter((m) => !m.isCore);
  const enabledCount = optionalModules.filter((m) => m.enabled).length;

  const handleToggle = async (moduleKey: string, enabled: boolean) => {
    setModules((prev) => prev.map((m) => (m.key === moduleKey ? { ...m, enabled } : m)));
    try {
      await adminSetModuleEnabledAction(family.id, moduleKey, enabled);
    } catch (err) {
      console.error("Failed to toggle module", err);
      setModules((prev) => prev.map((m) => (m.key === moduleKey ? { ...m, enabled: !enabled } : m)));
    }
  };

  const handleDeleteService = async (id: string) => {
    const previous = customServices;
    setCustomServices((prev) => prev.filter((s) => s.id !== id));
    try {
      await adminDeleteCustomServiceAction(id, family.id);
    } catch (err) {
      console.error("Failed to delete custom service", err);
      setCustomServices(previous);
    }
  };

  const handleSaveFeed = async (
    moduleKey: string,
    feed: { id?: string; label: string; url: string }
  ) => {
    const saved = await adminSaveModuleFeedAction(family.id, moduleKey, feed);
    setModules((prev) =>
      prev.map((m) => {
        if (m.key !== moduleKey) return m;
        const exists = m.feeds.some((f) => f.id === saved.id);
        const feeds = exists
          ? m.feeds.map((f) => (f.id === saved.id ? saved : f))
          : [...m.feeds, saved];
        return { ...m, feeds };
      })
    );
    return saved;
  };

  const handleRemoveFeed = async (moduleKey: string, feedId: string) => {
    const previous = modules;
    setModules((prev) =>
      prev.map((m) =>
        m.key === moduleKey ? { ...m, feeds: m.feeds.filter((f) => f.id !== feedId) } : m
      )
    );
    try {
      await adminRemoveModuleFeedAction(family.id, moduleKey, feedId);
    } catch (err) {
      console.error("Failed to remove feed", err);
      setModules(previous);
    }
  };

  const handleSyncFeed = async (moduleKey: string, feedId: string) => {
    const result = await adminSyncModuleFeedAction(family.id, moduleKey, feedId);
    setModules((prev) =>
      prev.map((m) =>
        m.key === moduleKey
          ? {
              ...m,
              feeds: m.feeds.map((f) =>
                f.id === feedId ? { ...f, lastSyncedAt: result.lastSyncedAt } : f
              ),
            }
          : m
      )
    );
    return result;
  };

  return (
    <div className={`admin-family-card ${isOpen ? "is-open" : ""}`}>
      <button
        type="button"
        className="admin-family-header admin-family-header-btn"
        onClick={onToggle}
        aria-expanded={isOpen}
      >
        <span className="admin-family-toggle-icon">
          {isOpen ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
        </span>

        <span className="admin-family-header-main">
          <span className="admin-family-name-row">
            <strong className="admin-family-name">{family.name}</strong>
          </span>
          <span className="admin-family-meta">
            {family.ownerEmail ?? "no login"} · {family.memberNames.join(", ") || "no members"}
          </span>
        </span>

        <span className="admin-family-header-right">
          <span className="admin-family-meta">
            {enabledCount} module{enabledCount === 1 ? "" : "s"} · since{" "}
            {new Date(family.createdAt).toLocaleDateString()}
          </span>
        </span>
      </button>

      {isOpen && (
        <div className="admin-family-body">
          <div className="admin-family-actions-row">
            <AdminRenameForm family={family} />
            <AdminResetLoginForm family={family} />
          </div>

          <div className="modules-list">
            {optionalModules.map((mod) => (
              <div key={mod.key} className="module-card module-card-column">
                <div className="module-card-top-row">
                  <div className="module-card-left">
                    <div className="module-card-info">
                      <strong className="module-card-name">{mod.name}</strong>
                      <span className="module-card-desc">{mod.description}</span>
                    </div>
                  </div>
                  <button
                    type="button"
                    role="switch"
                    aria-checked={mod.enabled}
                    aria-label={`Toggle ${mod.name} for ${family.name}`}
                    className={`toggle-switch-pill ${mod.enabled ? "on" : "off"}`}
                    onClick={() => handleToggle(mod.key, !mod.enabled)}
                  >
                    <span className="toggle-switch-thumb" />
                  </button>
                </div>

                {mod.enabled && (
                  <AdminModuleFeedsSection
                    mod={mod}
                    onSaveFeed={handleSaveFeed}
                    onSyncFeed={handleSyncFeed}
                    onRemoveFeed={handleRemoveFeed}
                  />
                )}
              </div>
            ))}
          </div>

          <div className="admin-custom-services-section">
            <h3 className="admin-custom-services-title">Custom services</h3>
            <div className="modules-list">
              {customServices.map((service) => (
                <AdminCustomServiceRow
                  key={service.id}
                  familyId={family.id}
                  service={service}
                  onDelete={handleDeleteService}
                />
              ))}
            </div>
            <AdminAddServiceForm
              familyId={family.id}
              onAdded={(service) => setCustomServices((prev) => [...prev, service])}
            />
          </div>
        </div>
      )}
    </div>
  );
}

export function AdminView({ families }: AdminViewProps) {
  const [query, setQuery] = useState("");
  const [openId, setOpenId] = useState<string | null>(null);

  const filteredFamilies = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return families;
    return families.filter(
      (f) =>
        f.name.toLowerCase().includes(q) ||
        (f.ownerEmail ?? "").toLowerCase().includes(q) ||
        f.memberNames.some((n) => n.toLowerCase().includes(q))
    );
  }, [families, query]);

  return (
    <div className="admin-page">
      <header className="admin-page-header">
        <div className="admin-page-header-main">
          <ShieldCheck size={20} />
          <div>
            <h1 className="admin-page-title">Ground Control Admin</h1>
            <p className="admin-page-subtitle">
              Manage connectors for any household. You cannot see their events, notes, or tasks
              here — only module on/off state and calendar feed URLs.
            </p>
          </div>
        </div>
        <form action={adminLogoutAction}>
          <button type="submit" className="admin-logout-btn">
            <LogOut size={14} /> Log out
          </button>
        </form>
      </header>

      <div className="admin-toolbar-row">
        <div className="admin-search-wrap">
          <Search size={15} className="admin-search-icon" />
          <input
            type="text"
            className="admin-search-input"
            placeholder="Search by household, owner email, or member name…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
        <span className="admin-family-count">
          <Users size={14} />
          {filteredFamilies.length} of {families.length} household
          {families.length === 1 ? "" : "s"}
        </span>
      </div>

      <div className="admin-family-list">
        {filteredFamilies.map((family) => (
          <AdminFamilyCard
            key={family.id}
            family={family}
            isOpen={openId === family.id}
            onToggle={() => setOpenId((prev) => (prev === family.id ? null : family.id))}
          />
        ))}

        {filteredFamilies.length === 0 && (
          <p className="admin-no-results">No households match &ldquo;{query}&rdquo;.</p>
        )}
      </div>
    </div>
  );
}
