import type { GroundControlModule } from "./models";

export const modules: GroundControlModule[] = [
  { id: "planner", name: "Planner", description: "Shared events and weekly plans", enabled: true, status: "installed" },
  { id: "board", name: "Board", description: "Quick notes, reminders and countdowns", enabled: true, status: "installed" },
  { id: "sports", name: "Sports", description: "Fixtures, training and team schedules", enabled: false, status: "coming-soon" },
  { id: "clubzap", name: "ClubZap Connector", description: "Bring club events into your planner", enabled: false, status: "coming-soon" },
  { id: "ddsl", name: "DDSL Connector", description: "Sync league fixtures", enabled: false, status: "coming-soon" },
  { id: "school", name: "School", description: "Term dates, forms and activities", enabled: false, status: "coming-soon" },
  { id: "shopping", name: "Shopping", description: "A shared household list", enabled: false, status: "coming-soon" },
  { id: "chores", name: "Chores", description: "Keep everyday jobs moving", enabled: false, status: "coming-soon" },
];
