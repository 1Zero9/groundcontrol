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
  RefreshCw,
  Trophy,
} from "lucide-react";
import type { GroundControlModule } from "../../src/core/models";

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

export function ModulesView({
  modules,
  onToggle,
  onSaveFeedUrl,
  onSyncFeed,
  onBack,
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
    </div>
  );
}
