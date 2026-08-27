import { redirect } from "next/navigation";
import { GroundControlApp } from "./components/ground-control-app";
import { getFamilyBundle } from "../db/queries";
import { getSession } from "../lib/auth/session";

export default async function Home() {
  const session = await getSession();
  if (!session) {
    redirect("/login");
  }

  const { members, events, boardItems } = await getFamilyBundle(session.familyId);

  return (
    <GroundControlApp
      familyId={session.familyId}
      family={members}
      events={events}
      initialBoard={boardItems}
    />
  );
}
