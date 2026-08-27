"use client";

import React from "react";
import {
  ArrowLeft,
  CalendarDays,
  GraduationCap,
  HeartPulse,
  Lock,
  Pin,
  Trophy,
} from "lucide-react";
import type { GroundControlModule } from "../../src/core/models";

interface ModulesViewProps {
  modules: GroundControlModule[];
  onToggle: (moduleKey: string, enabled: boolean) => void;
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

export function ModulesView({ modules, onToggle, onBack }: ModulesViewProps) {
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
          ))}
        </div>
      </section>
    </div>
  );
}
