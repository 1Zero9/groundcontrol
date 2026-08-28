"use client";

import { useState } from "react";
import { RefreshCw, Link as LinkIcon, ShieldCheck } from "lucide-react";
import type { GroundControlModule } from "../../src/core/models";
import type { AdminFamilySummary } from "../../db/admin-queries";
import {
  adminSaveModuleFeedUrlAction,
  adminSetModuleEnabledAction,
  adminSyncModuleFeedAction,
} from "../admin/actions";

interface AdminViewProps {
  families: AdminFamilySummary[];
}

function AdminFeedRow({ familyId, mod }: { familyId: string; mod: GroundControlModule }) {
  const [feedUrl, setFeedUrl] = useState(mod.feedUrl ?? "");
  const [status, setStatus] = useState<"idle" | "saving" | "syncing" | "error">("idle");
  const [message, setMessage] = useState<string | null>(null);

  const handleSync = async () => {
    setStatus("saving");
    setMessage(null);
    try {
      if (feedUrl.trim() && feedUrl.trim() !== mod.feedUrl) {
        await adminSaveModuleFeedUrlAction(familyId, mod.key, feedUrl.trim());
      }
      setStatus("syncing");
      const result = await adminSyncModuleFeedAction(familyId, mod.key);
      setMessage(`Synced — ${result.createdCount} new, ${result.updatedCount} updated`);
      setStatus("idle");
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Sync failed");
      setStatus("error");
    }
  };

  const isBusy = status === "saving" || status === "syncing";

  return (
    <div className="module-feed-row">
      <label className="module-feed-label" htmlFor={`admin-feed-${familyId}-${mod.key}`}>
        <LinkIcon size={13} /> Calendar feed (iCal / webcal link)
      </label>
      <div className="module-feed-input-row">
        <input
          id={`admin-feed-${familyId}-${mod.key}`}
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
      {!message && mod.lastSyncedAt && (
        <p className="module-feed-status">
          Last synced {new Date(mod.lastSyncedAt).toLocaleString()}
        </p>
      )}
    </div>
  );
}

function AdminFamilyCard({ family }: { family: AdminFamilySummary }) {
  const [modules, setModules] = useState(family.modules);
  const optionalModules = modules.filter((m) => !m.isCore);

  const handleToggle = async (moduleKey: string, enabled: boolean) => {
    setModules((prev) => prev.map((m) => (m.key === moduleKey ? { ...m, enabled } : m)));
    try {
      await adminSetModuleEnabledAction(family.id, moduleKey, enabled);
    } catch (err) {
      console.error("Failed to toggle module", err);
      setModules((prev) => prev.map((m) => (m.key === moduleKey ? { ...m, enabled: !enabled } : m)));
    }
  };

  return (
    <div className="admin-family-card">
      <div className="admin-family-header">
        <div>
          <strong className="admin-family-name">{family.name}</strong>
          <span className="admin-family-meta">
            {family.ownerEmail ?? "no login"} · {family.memberNames.join(", ") || "no members"}
          </span>
        </div>
        <span className="admin-family-meta">
          Since {new Date(family.createdAt).toLocaleDateString()}
        </span>
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

            {mod.enabled && <AdminFeedRow familyId={family.id} mod={mod} />}
          </div>
        ))}
      </div>
    </div>
  );
}

export function AdminView({ families }: AdminViewProps) {
  return (
    <div className="admin-page">
      <header className="admin-page-header">
        <ShieldCheck size={20} />
        <div>
          <h1 className="admin-page-title">Ground Control Admin</h1>
          <p className="admin-page-subtitle">
            Manage connectors for any household. You cannot see their events, notes, or tasks here
            — only module on/off state and calendar feed URLs.
          </p>
        </div>
      </header>

      <div className="admin-family-list">
        {families.map((family) => (
          <AdminFamilyCard key={family.id} family={family} />
        ))}
      </div>
    </div>
  );
}
