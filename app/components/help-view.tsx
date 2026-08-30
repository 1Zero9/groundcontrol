"use client";

import { ArrowLeft } from "lucide-react";

interface HelpViewProps {
  onBack: () => void;
}

const HELP_SECTIONS: { icon: string; title: string; body: string }[] = [
  {
    icon: "/icon_pack/cat_home.png",
    title: "Today",
    body: "Your household's home screen — see today's events, tasks, and reminders for whoever's profile is active.",
  },
  {
    icon: "/icon_pack/nav_calendar.png",
    title: "My week",
    body: "A week-at-a-glance view of everyone's events, so you can spot clashes before they happen.",
  },
  {
    icon: "/icon_pack/nav_checklist.png",
    title: "Remember board",
    body: "Notes, tasks, and countdowns that don't fit on a calendar — pin the important ones so they don't get lost.",
  },
  {
    icon: "/icon_pack/nav_add.png",
    title: "Adding things",
    body: "Tap the + button to add an event, task, note, or reminder and choose who it's for. You can also scan text from a photo, import candidate events from a PDF, or convert an existing note/task into a calendar event.",
  },
  {
    icon: "/icon_pack/nav_profile.png",
    title: "Menu & Family Admin",
    body: "Tap the menu icon (top-left) for the full navigation, including Remember board, Kitchen Display, and Family Admin. In Family Admin, adults can tap a family member's card to switch the active profile, tap the pencil to edit a member's name, role, avatar, or colour, and use the link icon to send someone a login link so they can connect to the app on their own phone.",
  },
  {
    icon: "/icon_pack/nav_settings.png",
    title: "Modules & calendars",
    body: "Turn features like Sports, School, Life, or Bills & Renewals on or off, and connect calendar feeds (iCal/webcal links) so events sync in automatically. Don't see a module you need? Use Request a module at the bottom of the Modules screen.",
  },
  {
    icon: "/icon_pack/nav_planet.png",
    title: "Kitchen Display",
    body: "A big, glanceable screen for a shared tablet or kitchen display — tap a family member's avatar to switch whose day is shown.",
  },
  {
    icon: "/icon_pack/cat_alert_warning.png",
    title: "Still stuck?",
    body: "Ask whoever set up your family's Ground Control — they can manage modules, family members, and login links from the Family Admin screen.",
  },
];

export function HelpView({ onBack }: HelpViewProps) {
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
          <h1 className="screen-title">Help</h1>
          <p className="screen-subtitle">A quick guide to getting around Ground Control</p>
        </div>
      </div>

      <section className="modules-section">
        <div className="modules-list">
          {HELP_SECTIONS.map((section) => (
            <div key={section.title} className="module-card">
              <div className="module-card-left">
                <span className="module-card-icon">
                  <img src={section.icon} alt="" width={20} height={20} />
                </span>
                <div className="module-card-info">
                  <strong className="module-card-name">{section.title}</strong>
                  <span className="module-card-desc">{section.body}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
