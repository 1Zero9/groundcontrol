/**
 * Seeds the module registry (always) and, unless SEED_SKIP_DEMO_FAMILY is
 * set, a demo family using the existing mock data so local dev / preview
 * environments have something to look at immediately.
 *
 * Usage: npm run db:seed
 */
import { getDb } from "./index";
import { boardItems, events, familyMembers, familyModules, families, modules } from "./schema";
import { moduleRegistry } from "../src/core/module-registry";
import {
  events as mockEvents,
  familyMembers as mockFamilyMembers,
  initialBoardItems as mockBoardItems,
} from "../src/data/mock-data";

async function main() {
  const db = getDb();

  console.log("Seeding modules...");
  const upsertedModules = await Promise.all(
    moduleRegistry.map((m) =>
      db
        .insert(modules)
        .values({
          key: m.key,
          name: m.name,
          description: m.description,
          icon: m.icon,
          isCore: m.isCore,
        })
        .onConflictDoUpdate({
          target: modules.key,
          set: { name: m.name, description: m.description, icon: m.icon, isCore: m.isCore },
        })
        .returning()
    )
  );
  const moduleByKey = new Map(
    upsertedModules.flat().map((m) => [m.key, m])
  );

  if (process.env.SEED_SKIP_DEMO_FAMILY) {
    console.log("SEED_SKIP_DEMO_FAMILY set, skipping demo family.");
    return;
  }

  console.log("Seeding demo family...");
  const [family] = await db
    .insert(families)
    .values({ name: "Cranfield Family", timezone: "Europe/Dublin" })
    .returning();

  await Promise.all(
    Object.values(moduleByKey).map((mod) =>
      db.insert(familyModules).values({
        familyId: family.id,
        moduleId: mod.id,
        enabled: true,
      })
    )
  );

  const memberIdByMock = new Map<string, string>();
  for (const m of mockFamilyMembers) {
    const [row] = await db
      .insert(familyMembers)
      .values({
        familyId: family.id,
        name: m.name,
        shortName: m.shortName,
        colour: m.colour,
        avatarEmoji: m.avatarEmoji,
        role: m.role,
        title: m.title,
      })
      .returning();
    memberIdByMock.set(m.id, row.id);
  }

  const plannerModuleId = moduleByKey.get("planner")?.id;
  for (const e of mockEvents) {
    await db.insert(events).values({
      familyId: family.id,
      moduleId: plannerModuleId,
      title: e.title,
      description: e.description,
      start: new Date(e.start),
      end: e.end ? new Date(e.end) : undefined,
      allDay: e.allDay ?? false,
      category: e.category,
      personIds: e.personIds.map((id) => memberIdByMock.get(id)!).filter(Boolean),
      location: e.location,
      icon: e.icon,
      accentColor: e.accentColor,
      source: e.source ?? "manual",
      sourceId: e.sourceId,
      status: e.status ?? "active",
    });
  }

  const boardModuleId = moduleByKey.get("board")?.id;
  for (const b of mockBoardItems) {
    await db.insert(boardItems).values({
      familyId: family.id,
      moduleId: boardModuleId,
      text: b.text,
      subtitle: b.subtitle,
      type: b.type ?? "note",
      personIds: (b.personIds ?? []).map((id) => memberIdByMock.get(id)!).filter(Boolean),
      expiresAt: b.expiresAt ? new Date(b.expiresAt) : undefined,
      countdownDate: b.countdownDate ? new Date(b.countdownDate) : undefined,
      progressCurrent: b.progressCurrent,
      progressTotal: b.progressTotal,
      pinned: b.pinned ?? false,
      completed: b.completed ?? false,
      badge: b.badge,
      color: b.color,
    });
  }

  console.log(`Done. Family id: ${family.id}`);
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
