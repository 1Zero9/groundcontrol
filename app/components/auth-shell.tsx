"use client";

import type { ReactNode } from "react";
import { RocketMark, SaturnPlanet, Starfield } from "./cosmic-illustrations";
import { SiteFooter } from "./site-footer";

export function AuthShell({ children }: { children: ReactNode }) {
  return (
    <div className="auth-screen">
      <Starfield />

      <div className="auth-planet auth-planet-left float-anim">
        <SaturnPlanet size={58} />
      </div>
      <div className="auth-planet auth-planet-right float-anim">
        <SaturnPlanet size={40} />
      </div>

      <div className="auth-brand">
        <div className="auth-brand-logo-row">
          <RocketMark size={40} />
          <div className="auth-brand-wordmark">
            <span className="auth-brand-line1">Ground</span>
            <span className="auth-brand-line2">Control</span>
          </div>
        </div>
        <p className="auth-brand-tagline">Plan · Track · Launch Together</p>
      </div>

      {children}

      <SiteFooter className="site-footer-on-dark" />
    </div>
  );
}

export function AuthCard({ children }: { children: ReactNode }) {
  return (
    <div className="auth-card">
      <span className="auth-card-badge">
        <SaturnPlanet size={22} />
      </span>
      {children}
    </div>
  );
}
