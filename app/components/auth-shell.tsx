"use client";

import type { ReactNode } from "react";
import { SaturnPlanet, Starfield } from "./cosmic-illustrations";
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
        <img
          src="/og.png"
          alt="Ground Control — your family mission control"
          className="auth-brand-logo-img"
        />
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
