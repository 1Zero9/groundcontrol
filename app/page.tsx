import { redirect } from "next/navigation";
import { GroundControlApp } from "./components/ground-control-app";
import { getFamilyBundle, getFamilyModules } from "../db/queries";
import { listModuleRequestsForFamily } from "../db/module-requests-queries";
import { getSession } from "../lib/auth/session";

export default async function Home() {
  const session = await getSession();
  if (!session) {
    redirect("/login");
  }

  const [{ members, events, boardItems, customServices }, modules, moduleRequests] =
    await Promise.all([
      getFamilyBundle(session.familyId),
      getFamilyModules(session.familyId),
      listModuleRequestsForFamily(session.familyId),
    ]);

  return (
    <GroundControlApp
      familyId={session.familyId}
      family={members}
      events={events}
      initialBoard={boardItems}
      initialModules={modules}
      initialCustomServices={customServices}
      initialModuleRequests={moduleRequests}
    />
  );
}
