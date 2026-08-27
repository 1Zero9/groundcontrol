import type { GroundControlModule } from "./models";
import { moduleRegistry } from "./module-registry";

// Derived from the module-registry (the source of truth for what a module
// actually contributes). This list is just the display-friendly shape used
// by settings/profile UI to show what's installed vs. available per family.
// Actual per-family enable/disable state lives in the `family_modules` table
// once a family is loaded from the database.
export const modules: GroundControlModule[] = moduleRegistry.map((m) => ({
  id: m.key,
  key: m.key,
  name: m.name,
  description: m.description,
  enabled: m.isCore,
  isCore: m.isCore,
  status: m.isCore ? "installed" : "available",
  icon: m.icon,
}));

// Connectors (ClubZap, DDSL, generic iCal) feed events into modules — mainly
// "sports" and "school" — via src/core/connectors.ts. They're not modules
// themselves, just data sources a module can sync from.
