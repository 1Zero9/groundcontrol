"use client";

import React from "react";

export function SaturnPlanet({ className = "", size = 72 }: { className?: string; size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden="true"
    >
      <defs>
        <linearGradient id="saturnGrad" x1="20" y1="20" x2="80" y2="80" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#A88BFF" />
          <stop offset="50%" stopColor="#7E57C2" />
          <stop offset="100%" stopColor="#512DA8" />
        </linearGradient>
        <linearGradient id="ringGrad" x1="10" y1="30" x2="90" y2="70" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#D1C4E9" stopOpacity="0.9" />
          <stop offset="50%" stopColor="#EDE7F6" stopOpacity="0.7" />
          <stop offset="100%" stopColor="#B39DDB" stopOpacity="0.95" />
        </linearGradient>
        <radialGradient id="planetGlow" cx="40%" cy="35%" r="60%">
          <stop offset="0%" stopColor="#D1C4E9" stopOpacity="0.6" />
          <stop offset="60%" stopColor="#7E57C2" stopOpacity="0" />
        </radialGradient>
        <filter id="saturnShadow" x="-20%" y="-20%" width="140%" height="140%">
          <feDropShadow dx="0" dy="4" stdDeviation="6" floodColor="#2C2255" floodOpacity="0.4" />
        </filter>
      </defs>

      {/* Back half of the ring */}
      <ellipse
        cx="50"
        cy="50"
        rx="44"
        ry="13"
        transform="rotate(-26 50 50)"
        stroke="url(#ringGrad)"
        strokeWidth="6"
        opacity="0.5"
      />

      {/* Planet Sphere */}
      <circle cx="50" cy="50" r="26" fill="url(#saturnGrad)" filter="url(#saturnShadow)" />
      <circle cx="50" cy="50" r="26" fill="url(#planetGlow)" />

      {/* Surface crater / bands */}
      <path
        d="M 28 47 Q 50 54 72 47"
        stroke="#9575CD"
        strokeWidth="2.5"
        strokeLinecap="round"
        opacity="0.7"
      />
      <path
        d="M 33 55 Q 50 62 67 55"
        stroke="#673AB7"
        strokeWidth="2"
        strokeLinecap="round"
        opacity="0.6"
      />
      <circle cx="43" cy="40" r="2.5" fill="#B39DDB" opacity="0.6" />
      <circle cx="58" cy="42" r="1.8" fill="#B39DDB" opacity="0.5" />

      {/* Front half of the ring */}
      <path
        d="M 12 66 C 22 75, 78 48, 88 34"
        stroke="url(#ringGrad)"
        strokeWidth="6"
        strokeLinecap="round"
      />
      <path
        d="M 16 64 C 25 72, 74 47, 84 36"
        stroke="#FFFFFF"
        strokeWidth="1.2"
        strokeLinecap="round"
        opacity="0.8"
      />
    </svg>
  );
}

export function RocketMark({ size = 32, className = "" }: { size?: number; className?: string }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 40 40"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden="true"
    >
      <defs>
        <linearGradient id="rocketBody" x1="12" y1="8" x2="30" y2="28" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#FFFFFF" />
          <stop offset="100%" stopColor="#E2E8F0" />
        </linearGradient>
        <linearGradient id="rocketNose" x1="20" y1="4" x2="32" y2="16" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#FF5CA8" />
          <stop offset="100%" stopColor="#FF3366" />
        </linearGradient>
        <linearGradient id="exhaustFlame" x1="10" y1="28" x2="6" y2="36" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#FFB347" />
          <stop offset="100%" stopColor="#FF5CA8" />
        </linearGradient>
      </defs>
      {/* Exhaust blast */}
      <path d="M12 28L6 34C5 35 7 36 8 35L14 30Z" fill="url(#exhaustFlame)" />
      <path d="M10 26L4 30C3.5 30.5 4.5 31.5 5 31L11 27Z" fill="#FFE082" />

      {/* Main Rocket Fuselage */}
      <path
        d="M14 26L10 20C10 14 16 8 26 4C28 14 22 20 16 20L14 26Z"
        fill="url(#rocketBody)"
      />
      {/* Rocket Nose Tip */}
      <path
        d="M23 7C25 5 26 4 26 4C26 4 25 5 23 7Z"
        fill="url(#rocketNose)"
      />
      <path
        d="M20 7C22 5 26 4 26 4C26 8 25 12 23 14L20 7Z"
        fill="url(#rocketNose)"
      />
      {/* Fin Left */}
      <path d="M11 19L6 21C5.5 21.5 6 23 7 23L12 23Z" fill="#FF5CA8" />
      {/* Fin Bottom */}
      <path d="M17 25L17 30C17.5 31 19 30.5 19.5 29.5L21 24.5Z" fill="#FF5CA8" />
      {/* Porthole Window */}
      <circle cx="19" cy="13" r="3.2" fill="#4D96FF" stroke="#FFFFFF" strokeWidth="1.2" />
    </svg>
  );
}

export function PushPin({ className = "" }: { className?: string }) {
  return (
    <div className={`pin-3d ${className}`} aria-hidden="true">
      <span className="pin-head" />
      <span className="pin-highlight" />
    </div>
  );
}

export function Starfield() {
  return (
    <div className="starfield-bg" aria-hidden="true">
      <span className="star star-1" />
      <span className="star star-2" />
      <span className="star star-3" />
      <span className="star star-4" />
      <span className="star star-5" />
      <span className="sparkle sparkle-1">✦</span>
      <span className="sparkle sparkle-2">✦</span>
      <span className="sparkle sparkle-3">★</span>
      <span className="orbit-curve" />
    </div>
  );
}

export function CategoryBadge({
  type,
  size = 48,
  active = false,
  onClick,
}: {
  type: "event" | "task" | "note" | "reminder" | "family";
  size?: number;
  active?: boolean;
  onClick?: () => void;
}) {
  const configs = {
    event: {
      label: "Event",
      color: "#6C4DFF",
      bg: "#F3F0FF",
      icon: (
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
          <rect x="3" y="4" width="18" height="18" rx="4" />
          <line x1="16" y1="2" x2="16" y2="6" />
          <line x1="8" y1="2" x2="8" y2="6" />
          <line x1="3" y1="10" x2="21" y2="10" />
          <circle cx="8" cy="14" r="1" fill="currentColor" />
          <circle cx="12" cy="14" r="1" fill="currentColor" />
          <circle cx="16" cy="14" r="1" fill="currentColor" />
        </svg>
      ),
    },
    task: {
      label: "Task",
      color: "#22C1A2",
      bg: "#E6FAF4",
      icon: (
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
          <rect x="3" y="4" width="18" height="18" rx="4" />
          <path d="M9 12l2 2 4-4" />
        </svg>
      ),
    },
    note: {
      label: "Note",
      color: "#FFB347",
      bg: "#FFF6E6",
      icon: (
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
          <polyline points="14 2 14 8 20 8" />
          <line x1="8" y1="13" x2="16" y2="13" />
          <line x1="8" y1="17" x2="13" y2="17" />
        </svg>
      ),
    },
    reminder: {
      label: "Reminder",
      color: "#FF5CA8",
      bg: "#FFF0F5",
      icon: (
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
          <path d="M13.73 21a2 2 0 0 1-3.46 0" />
        </svg>
      ),
    },
    family: {
      label: "Family",
      color: "#4D96FF",
      bg: "#EBF5FF",
      icon: (
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
          <circle cx="9" cy="7" r="4" />
          <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
          <path d="M16 3.13a4 4 0 0 1 0 7.75" />
        </svg>
      ),
    },
  };

  const config = configs[type];

  return (
    <button
      type="button"
      onClick={onClick}
      className={`category-squircle-tab ${active ? "active" : ""}`}
      style={{
        "--cat-color": config.color,
        "--cat-bg": config.bg,
      } as React.CSSProperties}
    >
      <div className="squircle-icon-wrap" style={{ width: size, height: size }}>
        {config.icon}
      </div>
      <span className="squircle-label">{config.label}</span>
    </button>
  );
}

export function AstronautGraphic({ mood = "happy" }: { mood?: "happy" | "celebrate" | "telescope" }) {
  return (
    <div className="astronaut-illustration" aria-hidden="true">
      <div className="astronaut-avatar">
        {mood === "celebrate" ? "🧑‍🚀 🚩" : mood === "telescope" ? "🔭 🌌" : "🧑‍🚀 🚀"}
      </div>
    </div>
  );
}
